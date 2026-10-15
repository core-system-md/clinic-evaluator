-- C-03: explicit hybrid configuration/interpretation release gate.
-- This migration is prepared for review only. Do not apply to Production without the required explicit approval.

create table if not exists public.assessment_interpretation_releases (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null unique references public.assessment_types(id) on delete cascade,
  family_id uuid not null references public.assessment_families(id) on delete cascade,
  assessment_version integer not null check (assessment_version > 0),
  interpretation_version integer not null check (interpretation_version > 0),
  registry_digest text not null check (registry_digest ~ '^[0-9a-f]{64}$'),
  source_commit_sha text not null check (source_commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  edge_release_ref text not null check (length(trim(edge_release_ref)) > 0),
  option_manifest jsonb not null check (jsonb_typeof(option_manifest) = 'array'),
  registered_by uuid not null references auth.users(id),
  registered_at timestamptz not null default now(),
  runtime_verified_at timestamptz,
  runtime_verified_digest text check (runtime_verified_digest is null or runtime_verified_digest ~ '^[0-9a-f]{64}$'),
  runtime_verified_edge_release_ref text,
  runtime_verified_source_commit_sha text
);

alter table public.assessment_interpretation_releases
  add column if not exists runtime_verified_at timestamptz,
  add column if not exists runtime_verified_digest text,
  add column if not exists runtime_verified_edge_release_ref text,
  add column if not exists runtime_verified_source_commit_sha text;

alter table public.assessment_interpretation_releases enable row level security;
revoke all on public.assessment_interpretation_releases from public, anon, authenticated;

create or replace function public.register_assessment_interpretation_release_secure(
  p_assessment_type_id uuid,
  p_interpretation_version integer,
  p_registry_digest text,
  p_source_commit_sha text,
  p_edge_release_ref text,
  p_option_manifest jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assessment public.assessment_types%rowtype;
  v_option_count integer;
  v_manifest_count integer;
  v_bad_count integer;
  v_distinct_count integer;
  v_release_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Owner authorization required to register an interpretation release'
      using errcode = '42501';
  end if;

  select * into v_assessment
    from public.assessment_types
   where id = p_assessment_type_id
   for update;

  if not found then
    raise exception 'Assessment version not found' using errcode = 'P0002';
  end if;
  if v_assessment.status not in ('draft', 'archived') then
    raise exception 'Interpretation release can only be registered for a draft or archived version'
      using errcode = '55000';
  end if;
  if p_interpretation_version is null or p_interpretation_version < 1 then
    raise exception 'A positive interpretation version is required' using errcode = '22023';
  end if;
  if coalesce(p_registry_digest, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'registry_digest must be a lowercase SHA-256 digest' using errcode = '22023';
  end if;
  if coalesce(p_source_commit_sha, '') !~ '^[0-9a-f]{40}([0-9a-f]{24})?$' then
    raise exception 'source_commit_sha must be a Git commit SHA' using errcode = '22023';
  end if;
  if nullif(trim(p_edge_release_ref), '') is null then
    raise exception 'edge_release_ref is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_option_manifest) <> 'array' then
    raise exception 'option_manifest must be a JSON array' using errcode = '22023';
  end if;

  select count(*) into v_option_count
    from public.questions q
    join public.options o on o.question_id = q.id
   where q.assessment_type_id = v_assessment.id;

  select count(*) into v_manifest_count
    from jsonb_to_recordset(p_option_manifest) as m(
      question_code text, option_id uuid, option_index integer, source_option_value numeric
    );

  select count(distinct (m.question_code, m.option_index)) into v_distinct_count
    from jsonb_to_recordset(p_option_manifest) as m(
      question_code text, option_id uuid, option_index integer, source_option_value numeric
    );

  if v_manifest_count = 0 or v_manifest_count <> v_option_count
     or v_distinct_count <> v_manifest_count then
    raise exception 'Option manifest must cover every option exactly once'
      using errcode = '22023';
  end if;

  select count(*) into v_bad_count
    from jsonb_to_recordset(p_option_manifest) as m(
      question_code text, option_id uuid, option_index integer, source_option_value numeric
    )
    left join public.questions q
      on q.assessment_type_id = v_assessment.id
     and q.code = m.question_code
    left join public.options o
      on o.question_id = q.id
     and o.id = m.option_id
     and o.option_index = m.option_index
     and o.option_value = m.source_option_value
   where q.id is null or o.id is null;

  if v_bad_count <> 0 then
    raise exception 'Option manifest contains unknown or mismatched question/option identities'
      using errcode = '22023';
  end if;

  insert into public.assessment_interpretation_releases(
    assessment_type_id, family_id, assessment_version, interpretation_version,
    registry_digest, source_commit_sha, edge_release_ref, option_manifest,
    registered_by, registered_at
  )
  values (
    v_assessment.id, v_assessment.family_id, v_assessment.version, p_interpretation_version,
    p_registry_digest, p_source_commit_sha, trim(p_edge_release_ref), p_option_manifest,
    auth.uid(), now()
  )
  on conflict (assessment_type_id) do update
    set family_id = excluded.family_id,
        assessment_version = excluded.assessment_version,
        interpretation_version = excluded.interpretation_version,
        registry_digest = excluded.registry_digest,
        source_commit_sha = excluded.source_commit_sha,
        edge_release_ref = excluded.edge_release_ref,
        option_manifest = excluded.option_manifest,
        registered_by = excluded.registered_by,
        registered_at = excluded.registered_at,
        runtime_verified_at = null,
        runtime_verified_digest = null,
        runtime_verified_edge_release_ref = null,
        runtime_verified_source_commit_sha = null
  returning id into v_release_id;

  perform public.write_admin_audit(
    'assessment.interpretation_release.register',
    'assessment_interpretation_releases',
    v_release_id,
    v_assessment.family_id,
    null,
    jsonb_build_object(
      'assessment_type_id', v_assessment.id,
      'assessment_version', v_assessment.version,
      'interpretation_version', p_interpretation_version,
      'registry_digest', p_registry_digest,
      'source_commit_sha', p_source_commit_sha,
      'edge_release_ref', trim(p_edge_release_ref),
      'option_count', v_manifest_count
    ),
    true,
    null
  );

  return jsonb_build_object(
    'success', true,
    'release_id', v_release_id,
    'assessment_type_id', v_assessment.id,
    'option_count', v_manifest_count
  );
end;
$$;

revoke all on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, jsonb) from public, anon;
grant execute on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, jsonb) to authenticated;

-- Only the Edge runtime service-role client may record a successful runtime attestation.
create or replace function public.mark_assessment_interpretation_release_runtime_verified_secure(
  p_assessment_type_id uuid,
  p_runtime_digest text,
  p_runtime_edge_release_ref text,
  p_runtime_source_commit_sha text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_release public.assessment_interpretation_releases%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service-role Edge runtime required to attest an interpretation release'
      using errcode = '42501';
  end if;

  select * into v_release from public.assessment_interpretation_releases
   where assessment_type_id = p_assessment_type_id for update;

  if not found then raise exception 'Interpretation release not found' using errcode = 'P0002'; end if;
  if coalesce(p_runtime_digest, '') !~ '^[0-9a-f]{64}$' or p_runtime_digest <> v_release.registry_digest then
    raise exception 'Runtime registry digest does not match the registered release' using errcode = '22023';
  end if;
  if nullif(trim(p_runtime_edge_release_ref), '') is null or p_runtime_edge_release_ref <> v_release.edge_release_ref then
    raise exception 'Runtime Edge release reference does not match the registered release' using errcode = '22023';
  end if;
  if p_runtime_source_commit_sha is null or p_runtime_source_commit_sha <> v_release.source_commit_sha then
    raise exception 'Runtime source commit does not match the registered release' using errcode = '22023';
  end if;

  update public.assessment_interpretation_releases
     set runtime_verified_at = now(), runtime_verified_digest = p_runtime_digest,
         runtime_verified_edge_release_ref = p_runtime_edge_release_ref,
         runtime_verified_source_commit_sha = p_runtime_source_commit_sha
   where assessment_type_id = p_assessment_type_id;

  return jsonb_build_object('success', true, 'assessment_type_id', p_assessment_type_id,
    'runtime_verified_at', now(), 'runtime_verified_digest', p_runtime_digest,
    'runtime_verified_edge_release_ref', p_runtime_edge_release_ref,
    'runtime_verified_source_commit_sha', p_runtime_source_commit_sha);
end;
$$;

revoke all on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text) to service_role;

create or replace function public.validate_assessment_version_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.assessment_types%rowtype;
  v_family_exists boolean;
  v_q integer;
  v_a integer;
  v_bad_q integer;
  v_bad_o integer;
  v_required integer;
  v_weight numeric;
  v_release_valid boolean := false;
  v_release_runtime_verified boolean := false;
  v_checks jsonb;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v from public.assessment_types where id = p_version_id;
  if not found then
    raise exception 'Assessment version not found' using errcode = 'P0002';
  end if;

  select exists(select 1 from public.assessment_families f where f.id = v.family_id)
    into v_family_exists;
  select count(*), count(distinct axis_id), count(*) filter(where is_required)
    into v_q, v_a, v_required
    from public.questions where assessment_type_id = v.id;
  select count(*) into v_bad_q
    from public.questions q
    left join public.axes a on a.id = q.axis_id
   where q.assessment_type_id = v.id
     and (a.id is null or a.assessment_type_id <> v.id);
  select count(*) into v_bad_o
    from public.options o
    join public.questions q on q.id = o.question_id
   where q.assessment_type_id = v.id
     and (o.question_id is null or q.assessment_type_id <> v.id);
  select coalesce(sum(weight), 0) into v_weight
    from public.axes where assessment_type_id = v.id;

  select exists (
    select 1
      from public.assessment_interpretation_releases r
     where r.assessment_type_id = v.id
       and r.family_id = v.family_id
       and r.assessment_version = v.version
       and r.runtime_verified_at is not null
       and r.runtime_verified_digest = r.registry_digest
       and r.runtime_verified_edge_release_ref = r.edge_release_ref
       and r.runtime_verified_source_commit_sha = r.source_commit_sha
       and jsonb_array_length(r.option_manifest) = (
         select count(*)
           from public.questions q
           join public.options o on o.question_id = q.id
          where q.assessment_type_id = v.id
       )
       and not exists (
         select 1
           from jsonb_to_recordset(r.option_manifest) as m(
             question_code text, option_id uuid, option_index integer, source_option_value numeric
           )
           left join public.questions q
             on q.assessment_type_id = v.id and q.code = m.question_code
           left join public.options o
             on o.question_id = q.id
            and o.id = m.option_id
            and o.option_index = m.option_index
            and o.option_value = m.source_option_value
          where q.id is null or o.id is null
       )
  ) into v_release_valid;

  select exists (select 1 from public.assessment_interpretation_releases r
    where r.assessment_type_id = v.id and r.family_id = v.family_id
      and r.assessment_version = v.version and r.runtime_verified_at is not null
      and r.runtime_verified_digest = r.registry_digest
      and r.runtime_verified_edge_release_ref = r.edge_release_ref
       and r.runtime_verified_source_commit_sha = r.source_commit_sha
  ) into v_release_runtime_verified;

  v_checks := jsonb_build_object(
    'family_valid', v_family_exists,
    'question_count_matches', v_q = v.question_count,
    'axis_count_matches', v_a = v.axis_count,
    'required_questions', v_required,
    'question_axis_integrity', v_bad_q = 0,
    'option_question_integrity', v_bad_o = 0,
    'weights_total', v_weight,
    'has_axes', v_a > 0,
    'interpretation_release_registered', v_release_valid,
    'interpretation_runtime_attested', v_release_runtime_verified
  );

  return jsonb_build_object(
    'valid',
      v_family_exists and v_q = v.question_count and v_a = v.axis_count
      and v_bad_q = 0 and v_bad_o = 0 and v_a > 0 and v_q > 0
      and v_release_valid,
    'checks', v_checks
  );
end;
$$;

-- publish_assessment_version_secure and restore_public_assessment_secure already
-- call validate_assessment_version_secure; this makes the release gate apply to
-- both direct publication and restoration without duplicating their transitions.

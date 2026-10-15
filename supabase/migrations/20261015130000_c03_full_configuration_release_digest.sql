-- C-03: explicit interpretation release manifest and publication gate.
-- This migration is prepared for review only. Do not apply to Production without the required explicit approval.

create table if not exists public.assessment_interpretation_releases (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null references public.assessment_types(id) on delete cascade,
  family_id uuid not null references public.assessment_families(id) on delete cascade,
  assessment_version integer not null check (assessment_version > 0),
  interpretation_version integer not null check (interpretation_version > 0),
  registry_digest text not null check (registry_digest ~ '^[0-9a-f]{64}$'),
  config_digest text not null check (config_digest ~ '^[0-9a-f]{64}$'),
  config_canonicalizer_version text not null check (config_canonicalizer_version = 'c03-assessment-config-canonicalizer-v1'),
  source_commit_sha text not null check (source_commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  edge_release_ref text not null check (length(trim(edge_release_ref)) > 0),
  option_manifest jsonb not null check (jsonb_typeof(option_manifest) = 'array'),
  is_current boolean not null default true,
  state text not null default 'PREPARED' check (state in ('PREPARED','VERIFIED','PUBLISHED','DEGRADED','REJECTED')),
  verified_at timestamptz,
  published_at timestamptz,
  degraded_at timestamptz,
  failure_reason text,
  registered_by uuid not null references auth.users(id),
  registered_at timestamptz not null default now(),
  runtime_verified_at timestamptz,
  runtime_verified_digest text check (runtime_verified_digest is null or runtime_verified_digest ~ '^[0-9a-f]{64}$'),
  runtime_verified_config_digest text check (runtime_verified_config_digest is null or runtime_verified_config_digest ~ '^[0-9a-f]{64}$'),
  runtime_verified_edge_release_ref text,
  runtime_verified_source_commit_sha text
);

alter table public.assessment_interpretation_releases
  drop constraint if exists assessment_interpretation_releases_assessment_type_id_key;

alter table public.assessment_interpretation_releases
  add column if not exists is_current boolean not null default true,
  add column if not exists state text not null default 'PREPARED',
  add column if not exists verified_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists degraded_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists runtime_verified_at timestamptz,
  add column if not exists config_digest text,
  add column if not exists config_canonicalizer_version text,
  add column if not exists runtime_verified_digest text,
  add column if not exists runtime_verified_config_digest text,
  add column if not exists runtime_verified_edge_release_ref text,
  add column if not exists runtime_verified_source_commit_sha text;


-- Full configuration projection. Lifecycle state and audit timestamps are excluded;
-- all other persisted fields are included so newly added runtime fields fail closed
-- until the canonicalizer is deliberately reviewed and versioned.
create or replace function public.assessment_configuration_projection(p_assessment_type_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_assessment public.assessment_types%rowtype;
  v_projection jsonb;
begin
  select * into v_assessment from public.assessment_types where id = p_assessment_type_id;
  if not found then raise exception 'Assessment version not found' using errcode = 'P0002'; end if;
  select jsonb_build_object(
    'canonicalizerVersion', 'c03-assessment-config-canonicalizer-v1',
    'assessment', to_jsonb(v_assessment) - array['status','is_active','created_at','updated_at','published_at','archived_at','created_by'],
    'family', (select jsonb_build_object('id',f.id,'slug',f.slug) from public.assessment_families f where f.id=v_assessment.family_id),
    'securitySettings', (
      select to_jsonb(s) - array['created_at','updated_at','created_by']
        from public.assessment_settings s
        join public.assessment_families f on f.slug = s.assessment_key
       where f.id = v_assessment.family_id
    ),
    'axes', coalesce((select jsonb_agg(to_jsonb(a)-array['created_at','updated_at','created_by'] order by a.display_order,a.id)
      from public.axes a where a.assessment_type_id=v_assessment.id),'[]'::jsonb),
    'questions', coalesce((select jsonb_agg(to_jsonb(q)-array['created_at','updated_at','created_by'] order by q.display_order,q.id)
      from public.questions q where q.assessment_type_id=v_assessment.id),'[]'::jsonb),
    'options', coalesce((select jsonb_agg(to_jsonb(o)-array['created_at','updated_at','created_by'] order by q.display_order,q.id,o.display_order,o.id)
      from public.questions q join public.options o on o.question_id=q.id where q.assessment_type_id=v_assessment.id),'[]'::jsonb),
    'traps', coalesce((select jsonb_agg(to_jsonb(t)-array['created_at','updated_at','created_by'] order by t.question_id,t.id)
      from public.traps t where t.assessment_type_id=v_assessment.id),'[]'::jsonb)
  ) into v_projection;
  return v_projection;
end;
$$;

create or replace function public.assessment_configuration_digest(p_assessment_type_id uuid)
returns text language sql stable security definer
set search_path = public, pg_temp
as $$
  select encode(extensions.digest(convert_to(public.assessment_configuration_projection(p_assessment_type_id)::text,'UTF8'),'sha256'),'hex');
$$;
revoke all on function public.assessment_configuration_projection(uuid) from public, anon, authenticated;
revoke all on function public.assessment_configuration_digest(uuid) from public, anon, authenticated;
grant execute on function public.assessment_configuration_digest(uuid) to service_role;

create unique index if not exists assessment_interpretation_releases_one_current_uidx
  on public.assessment_interpretation_releases(assessment_type_id)
  where is_current;

create or replace function public.c03_mark_assessment_release_published()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published' and old.status is distinct from new.status then
    update public.assessment_interpretation_releases
       set state = 'PUBLISHED',
           published_at = coalesce(published_at, now())
     where assessment_type_id = new.id
       and is_current = true
       and state = 'VERIFIED';
  end if;
  return new;
end;
$$;

drop trigger if exists c03_assessment_release_published on public.assessment_types;
create trigger c03_assessment_release_published
after update of status on public.assessment_types
for each row execute function public.c03_mark_assessment_release_published();

alter table public.assessment_interpretation_releases enable row level security;
revoke all on public.assessment_interpretation_releases from public, anon, authenticated;

create or replace function public.register_assessment_interpretation_release_secure(
  p_assessment_type_id uuid,
  p_interpretation_version integer,
  p_registry_digest text,
  p_config_digest text,
  p_config_canonicalizer_version text,
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
  v_actual_config_digest text;
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
  if coalesce(p_config_digest, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'config_digest must be a lowercase SHA-256 digest' using errcode = '22023';
  end if;
  if p_config_canonicalizer_version is distinct from 'c03-assessment-config-canonicalizer-v1' then
    raise exception 'Unsupported assessment configuration canonicalizer version' using errcode = '22023';
  end if;
  v_actual_config_digest := public.assessment_configuration_digest(v_assessment.id);
  if v_actual_config_digest is distinct from p_config_digest then
    raise exception 'Assessment configuration drift: exported digest does not match persisted configuration' using errcode = '22023';
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

  update public.assessment_interpretation_releases
     set is_current = false
   where assessment_type_id = v_assessment.id and is_current = true;

  insert into public.assessment_interpretation_releases(
    assessment_type_id, family_id, assessment_version, interpretation_version,
    registry_digest, config_digest, config_canonicalizer_version, source_commit_sha, edge_release_ref, option_manifest,
    is_current, state, registered_by, registered_at
  )
  values (
    v_assessment.id, v_assessment.family_id, v_assessment.version, p_interpretation_version,
    p_registry_digest, p_config_digest, p_config_canonicalizer_version, p_source_commit_sha, trim(p_edge_release_ref), p_option_manifest,
    true, 'PREPARED', auth.uid(), now()
  )
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
      'config_digest', p_config_digest,
      'config_canonicalizer_version', p_config_canonicalizer_version,
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

revoke all on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, text, text, jsonb) to authenticated;

-- Only the Edge runtime service-role client may record a successful runtime attestation.
create or replace function public.mark_assessment_interpretation_release_runtime_verified_secure(
  p_assessment_type_id uuid,
  p_runtime_digest text,
  p_runtime_config_digest text,
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
   where assessment_type_id = p_assessment_type_id and is_current = true for update;

  if not found then raise exception 'Interpretation release not found' using errcode = 'P0002'; end if;
  if coalesce(p_runtime_digest, '') !~ '^[0-9a-f]{64}$' or p_runtime_digest <> v_release.registry_digest then
    raise exception 'Runtime registry digest does not match the registered release' using errcode = '22023';
  end if;
  if coalesce(p_runtime_config_digest, '') !~ '^[0-9a-f]{64}$'
     or p_runtime_config_digest <> v_release.config_digest
     or public.assessment_configuration_digest(p_assessment_type_id) <> v_release.config_digest then
    raise exception 'Runtime assessment configuration digest does not match the registered release' using errcode = '22023';
  end if;
  if nullif(trim(p_runtime_edge_release_ref), '') is null or p_runtime_edge_release_ref <> v_release.edge_release_ref then
    raise exception 'Runtime Edge release reference does not match the registered release' using errcode = '22023';
  end if;
  if p_runtime_source_commit_sha is null or p_runtime_source_commit_sha <> v_release.source_commit_sha then
    raise exception 'Runtime source commit does not match the registered release' using errcode = '22023';
  end if;

  update public.assessment_interpretation_releases
     set runtime_verified_at = now(), runtime_verified_digest = p_runtime_digest,
         runtime_verified_config_digest = p_runtime_config_digest,
         state = 'VERIFIED', verified_at = now(), failure_reason = null,
         runtime_verified_edge_release_ref = p_runtime_edge_release_ref,
         runtime_verified_source_commit_sha = p_runtime_source_commit_sha
   where assessment_type_id = p_assessment_type_id and is_current = true;

  return jsonb_build_object('success', true, 'assessment_type_id', p_assessment_type_id,
    'runtime_verified_at', now(), 'runtime_verified_digest', p_runtime_digest,
    'runtime_verified_config_digest', p_runtime_config_digest,
    'runtime_verified_edge_release_ref', p_runtime_edge_release_ref,
    'runtime_verified_source_commit_sha', p_runtime_source_commit_sha);
end;
$$;

revoke all on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text, text) to service_role;


-- Select a historical verified release as current for a controlled rollback.
-- Re-attestation is required after selection; publication validation remains closed until then.
create or replace function public.restore_assessment_interpretation_release_secure(p_release_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_release public.assessment_interpretation_releases%rowtype;
  v_live_digest text;
begin
  if not public.is_owner() then
    raise exception 'Owner authorization required to restore an interpretation release'
      using errcode = '42501';
  end if;

  select * into v_release
    from public.assessment_interpretation_releases
   where id = p_release_id
   for update;
  if not found then raise exception 'Interpretation release not found' using errcode = 'P0002'; end if;

  v_live_digest := public.assessment_configuration_digest(v_release.assessment_type_id);
  if v_live_digest is distinct from v_release.config_digest then
    raise exception 'Historical release cannot be restored because the persisted configuration has drifted'
      using errcode = '22023';
  end if;

  update public.assessment_interpretation_releases
     set is_current = false
   where assessment_type_id = v_release.assessment_type_id and is_current = true;

  update public.assessment_interpretation_releases
     set is_current = true,
         state = 'PREPARED',
         verified_at = null,
         runtime_verified_at = null,
         runtime_verified_digest = null,
         runtime_verified_config_digest = null,
         runtime_verified_edge_release_ref = null,
         runtime_verified_source_commit_sha = null,
         failure_reason = null
   where id = v_release.id;

  return jsonb_build_object('success',true,'release_id',v_release.id,
    'assessment_type_id',v_release.assessment_type_id,'state','PREPARED',
    'requires_runtime_reattestation',true);
end;
$$;
revoke all on function public.restore_assessment_interpretation_release_secure(uuid) from public, anon;
grant execute on function public.restore_assessment_interpretation_release_secure(uuid) to authenticated;

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
       and r.is_current = true
       and r.state in ('VERIFIED','PUBLISHED')
       and r.runtime_verified_at is not null
       and r.runtime_verified_digest = r.registry_digest
       and r.runtime_verified_config_digest = r.config_digest
       and r.config_canonicalizer_version = 'c03-assessment-config-canonicalizer-v1'
       and public.assessment_configuration_digest(v.id) = r.config_digest
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
      and r.assessment_version = v.version and r.is_current = true
      and r.state in ('VERIFIED','PUBLISHED') and r.runtime_verified_at is not null
      and r.runtime_verified_digest = r.registry_digest
      and r.runtime_verified_config_digest = r.config_digest
      and r.config_canonicalizer_version = 'c03-assessment-config-canonicalizer-v1'
      and public.assessment_configuration_digest(v.id) = r.config_digest
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
    'assessment_config_digest_matches', v_release_valid,
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

-- C-03: explicit hybrid configuration/interpretation release gate.
-- This migration is prepared for review only. Do not apply to Production without the required explicit approval.

create table if not exists public.assessment_interpretation_releases (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null unique references public.assessment_types(id) on delete cascade,
  family_id uuid not null references public.assessment_families(id) on delete cascade,
  assessment_version integer not null check (assessment_version > 0),
  interpretation_version integer not null check (interpretation_version > 0),
  registry_digest text not null check (registry_digest ~ '^[0-9a-f]{64}$'),
  assessment_config_digest text not null check (assessment_config_digest ~ '^[0-9a-f]{64}$'),
  config_manifest jsonb not null check (jsonb_typeof(config_manifest) = 'object'),
  source_commit_sha text not null check (source_commit_sha ~ '^[0-9a-f]{40}([0-9a-f]{24})?$'),
  edge_release_ref text not null check (length(trim(edge_release_ref)) > 0),
  option_manifest jsonb not null check (jsonb_typeof(option_manifest) = 'array'),
  release_state text not null default 'PREPARED'
    check (release_state in ('PREPARED', 'VERIFIED', 'PUBLISHED', 'REJECTED', 'DEGRADED')),
  degraded_reason text,
  registered_by uuid not null references auth.users(id),
  registered_at timestamptz not null default now(),
  published_at timestamptz,
  runtime_verified_at timestamptz,
  runtime_verified_digest text check (runtime_verified_digest is null or runtime_verified_digest ~ '^[0-9a-f]{64}$'),
  runtime_verified_config_digest text check (runtime_verified_config_digest is null or runtime_verified_config_digest ~ '^[0-9a-f]{64}$'),
  runtime_verified_edge_release_ref text,
  runtime_verified_source_commit_sha text
);

alter table public.assessment_interpretation_releases
  add column if not exists assessment_config_digest text,
  add column if not exists config_manifest jsonb,
  add column if not exists release_state text not null default 'PREPARED',
  add column if not exists degraded_reason text,
  add column if not exists published_at timestamptz,
  add column if not exists runtime_verified_at timestamptz,
  add column if not exists runtime_verified_digest text,
  add column if not exists runtime_verified_config_digest text,
  add column if not exists runtime_verified_edge_release_ref text,
  add column if not exists runtime_verified_source_commit_sha text;

create or replace function public.assessment_config_manifest_secure(p_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'assessment', jsonb_build_object(
      'id', v.id,
      'familyId', v.family_id,
      'slug', f.slug,
      'titleAr', v.title_ar,
      'titleEn', v.title_en,
      'description', v.description,
      'version', v.version,
      'configVersion', v.config_version,
      'declaredQuestionCount', v.question_count,
      'declaredAxisCount', v.axis_count,
      'actualQuestionCount', (select count(*) from public.questions q where q.assessment_type_id = v.id),
      'actualAxisCount', (select count(*) from public.axes a where a.assessment_type_id = v.id),
      'hasTraps', coalesce(v.has_traps, false),
      'hasEvSimulator', coalesce(v.has_ev_simulator, false),
      'axisRoles', coalesce(v.axis_roles, '{}'::jsonb),
      'kpiMappings', coalesce(v.kpi_mappings, '{}'::jsonb),
      'evMappings', coalesce(v.ev_mappings, '{}'::jsonb)
    ),
    'axes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'code', a.code, 'weight', a.weight,
        'title', a.title, 'titleAr', a.title_ar, 'displayOrder', a.display_order
      ) order by a.code, a.id)
      from public.axes a where a.assessment_type_id = v.id
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'code', q.code, 'axisId', q.axis_id,
        'text', q.question_text, 'textAr', q.question_text_ar,
        'type', q.question_type, 'displayOrder', q.display_order,
        'required', (q.is_required is distinct from false),
        'impact', q.impact, 'layer', q.layer
      ) order by q.code, q.id)
      from public.questions q where q.assessment_type_id = v.id
    ), '[]'::jsonb),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'questionId', o.question_id,
        'optionIndex', o.option_index, 'optionValue', o.option_value,
        'label', o.label, 'labelAr', o.label_ar,
        'isTrap', coalesce(o.is_trap, false), 'displayOrder', o.display_order
      ) order by o.question_id, o.option_index, o.id)
      from public.options o
      join public.questions q on q.id = o.question_id
      where q.assessment_type_id = v.id
    ), '[]'::jsonb),
    'traps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', t.name, 'message', t.message, 'messageAr', t.message_ar,
        'questionId', t.question_id, 'validates', t.validates,
        'targetAxis', t.target_axis, 'penaltyBase', t.penalty_base, 'penaltyMax', t.penalty_max
      ) order by t.question_id, t.name)
      from public.traps t where t.assessment_type_id = v.id
    ), '[]'::jsonb)
  )
  from public.assessment_types v
  join public.assessment_families f on f.id = v.family_id
  where v.id = p_version_id
$$;

alter table public.assessment_interpretation_releases enable row level security;
revoke all on public.assessment_interpretation_releases from public, anon, authenticated;

drop function if exists public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, jsonb);

create function public.register_assessment_interpretation_release_secure(
  p_assessment_type_id uuid,
  p_interpretation_version integer,
  p_registry_digest text,
  p_assessment_config_digest text,
  p_source_commit_sha text,
  p_edge_release_ref text,
  p_option_manifest jsonb,
  p_config_manifest jsonb,
  p_registered_by uuid
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service-role Edge runtime required to register a configuration release'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.admin_users
    where user_id = p_registered_by and active = true and role = 'owner'
  ) then
    raise exception 'An active owner identity is required to register a configuration release'
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
    raise exception 'Configuration release can only be registered for a draft or archived version'
      using errcode = '55000';
  end if;
  if exists (
    select 1 from public.assessment_interpretation_releases
    where assessment_type_id = v_assessment.id and release_state = 'PUBLISHED'
  ) then
    raise exception 'Published releases are immutable; create a new assessment version'
      using errcode = '55000';
  end if;
  if p_interpretation_version is null or p_interpretation_version < 1 then
    raise exception 'A positive interpretation version is required' using errcode = '22023';
  end if;
  if coalesce(p_registry_digest, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'registry_digest must be a lowercase SHA-256 digest' using errcode = '22023';
  end if;
  if coalesce(p_assessment_config_digest, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'assessment_config_digest must be a lowercase SHA-256 digest' using errcode = '22023';
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
  if jsonb_typeof(p_config_manifest) <> 'object' then
    raise exception 'config_manifest must be a JSON object' using errcode = '22023';
  end if;
  if p_config_manifest is distinct from public.assessment_config_manifest_secure(v_assessment.id) then
    raise exception 'Configuration manifest does not match the current persisted assessment configuration'
      using errcode = '22023';
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
    registry_digest, assessment_config_digest, config_manifest,
    source_commit_sha, edge_release_ref, option_manifest, release_state,
    registered_by, registered_at, degraded_reason,
    runtime_verified_at, runtime_verified_digest, runtime_verified_config_digest,
    runtime_verified_edge_release_ref, runtime_verified_source_commit_sha
  )
  values (
    v_assessment.id, v_assessment.family_id, v_assessment.version, p_interpretation_version,
    p_registry_digest, p_assessment_config_digest, p_config_manifest,
    p_source_commit_sha, trim(p_edge_release_ref), p_option_manifest, 'PREPARED',
    p_registered_by, now(), null, null, null, null, null, null
  )
  on conflict (assessment_type_id) do update
    set family_id = excluded.family_id,
        assessment_version = excluded.assessment_version,
        interpretation_version = excluded.interpretation_version,
        registry_digest = excluded.registry_digest,
        assessment_config_digest = excluded.assessment_config_digest,
        config_manifest = excluded.config_manifest,
        source_commit_sha = excluded.source_commit_sha,
        edge_release_ref = excluded.edge_release_ref,
        option_manifest = excluded.option_manifest,
        release_state = 'PREPARED',
        degraded_reason = null,
        registered_by = excluded.registered_by,
        registered_at = excluded.registered_at,
        runtime_verified_at = null,
        runtime_verified_digest = null,
        runtime_verified_config_digest = null,
        runtime_verified_edge_release_ref = null,
        runtime_verified_source_commit_sha = null
  returning id into v_release_id;

  perform public.write_admin_audit(
    'assessment.configuration_release.register',
    'assessment_interpretation_releases',
    v_release_id,
    v_assessment.family_id,
    null,
    jsonb_build_object(
      'assessment_type_id', v_assessment.id,
      'assessment_version', v_assessment.version,
      'interpretation_version', p_interpretation_version,
      'registry_digest', p_registry_digest,
      'assessment_config_digest', p_assessment_config_digest,
      'source_commit_sha', p_source_commit_sha,
      'edge_release_ref', trim(p_edge_release_ref),
      'option_count', v_manifest_count,
      'release_state', 'PREPARED',
      'registered_by', p_registered_by
    ),
    true,
    null
  );

  return jsonb_build_object(
    'success', true,
    'release_id', v_release_id,
    'assessment_type_id', v_assessment.id,
    'option_count', v_manifest_count,
    'assessment_config_digest', p_assessment_config_digest,
    'release_state', 'PREPARED'
  );
end;
$$;

revoke all on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, text, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.register_assessment_interpretation_release_secure(uuid, integer, text, text, text, text, jsonb, jsonb, uuid) to service_role;

-- Only the Edge runtime service-role client may record a successful full-config attestation.
drop function if exists public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text);

create function public.mark_assessment_interpretation_release_runtime_verified_secure(
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
  v_reason text;
  v_next_state text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service-role Edge runtime required to attest a configuration release'
      using errcode = '42501';
  end if;

  select * into v_release
    from public.assessment_interpretation_releases
   where assessment_type_id = p_assessment_type_id
   for update;

  if not found then
    raise exception 'Configuration release not found' using errcode = 'P0002';
  end if;
  if v_release.release_state = 'REJECTED' then
    raise exception 'Rejected releases cannot be attested' using errcode = '55000';
  end if;

  if coalesce(p_runtime_digest, '') !~ '^[0-9a-f]{64}$'
     or p_runtime_digest is distinct from v_release.registry_digest then
    v_reason := 'Runtime interpretation registry digest mismatch';
  elsif coalesce(p_runtime_config_digest, '') !~ '^[0-9a-f]{64}$'
     or p_runtime_config_digest is distinct from v_release.assessment_config_digest then
    v_reason := 'Runtime full assessment config digest mismatch';
  elsif nullif(trim(p_runtime_edge_release_ref), '') is null
     or p_runtime_edge_release_ref is distinct from v_release.edge_release_ref then
    v_reason := 'Runtime Edge release reference mismatch';
  elsif p_runtime_source_commit_sha is null
     or p_runtime_source_commit_sha is distinct from v_release.source_commit_sha then
    v_reason := 'Runtime source commit mismatch';
  elsif v_release.config_manifest is distinct from public.assessment_config_manifest_secure(p_assessment_type_id) then
    v_reason := 'Persisted assessment configuration drift detected';
  end if;

  if v_reason is not null then
    update public.assessment_interpretation_releases
       set release_state = 'DEGRADED',
           degraded_reason = v_reason,
           runtime_verified_at = null,
           runtime_verified_digest = null,
           runtime_verified_config_digest = null,
           runtime_verified_edge_release_ref = null,
           runtime_verified_source_commit_sha = null
     where assessment_type_id = p_assessment_type_id;
    return jsonb_build_object(
      'success', false,
      'assessment_type_id', p_assessment_type_id,
      'release_state', 'DEGRADED',
      'reason', v_reason
    );
  end if;

  v_next_state := case when v_release.release_state = 'PUBLISHED' then 'PUBLISHED' else 'VERIFIED' end;
  update public.assessment_interpretation_releases
     set release_state = v_next_state,
         degraded_reason = null,
         runtime_verified_at = now(),
         runtime_verified_digest = p_runtime_digest,
         runtime_verified_config_digest = p_runtime_config_digest,
         runtime_verified_edge_release_ref = p_runtime_edge_release_ref,
         runtime_verified_source_commit_sha = p_runtime_source_commit_sha
   where assessment_type_id = p_assessment_type_id;

  return jsonb_build_object(
    'success', true,
    'assessment_type_id', p_assessment_type_id,
    'release_state', v_next_state,
    'runtime_verified_at', now(),
    'runtime_verified_digest', p_runtime_digest,
    'runtime_verified_config_digest', p_runtime_config_digest,
    'runtime_verified_edge_release_ref', p_runtime_edge_release_ref,
    'runtime_verified_source_commit_sha', p_runtime_source_commit_sha
  );
end;
$$;

revoke all on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_assessment_interpretation_release_runtime_verified_secure(uuid, text, text, text, text) to service_role;

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

-- C-03: deterministic hybrid Git/Supabase configuration release gate.
-- This migration is intentionally not applied to Production by this change.
-- Canonicalizer v1 covers runtime-relevant persisted configuration and excludes volatile audit timestamps.

create table if not exists public.assessment_configuration_releases (
  id uuid primary key default gen_random_uuid(),
  assessment_family_id uuid not null references public.assessment_families(id),
  assessment_type_id uuid not null references public.assessment_types(id),
  expected_current_published_version_id uuid null references public.assessment_types(id),
  git_commit_sha text not null check (git_commit_sha ~ '^[0-9a-f]{40}$'),
  expected_config_digest text not null check (expected_config_digest ~ '^[0-9a-f]{64}$'),
  config_digest text null check (config_digest is null or config_digest ~ '^[0-9a-f]{64}$'),
  config_canonicalizer_version text not null,
  interpretation_version integer not null check (interpretation_version > 0),
  interpretation_registry_digest text not null check (interpretation_registry_digest ~ '^[0-9a-f]{64}$'),
  scoring_engine_version text not null,
  scoring_contract_version text not null,
  report_model_version text not null,
  migration_contract_version text not null,
  fixture_set_version text not null,
  state text not null check (state in ('PREPARED','VERIFIED','PUBLISHED','REJECTED','DEGRADED')),
  prepared_at timestamptz not null default now(),
  verified_at timestamptz null,
  published_at timestamptz null,
  degraded_at timestamptz null,
  failure_code text null,
  failure_detail text null,
  verifier_identity text null,
  created_at timestamptz not null default now(),
  unique (assessment_type_id, git_commit_sha, expected_config_digest)
);

create index if not exists assessment_configuration_releases_active_lookup
  on public.assessment_configuration_releases (assessment_family_id, assessment_type_id, state, published_at desc);

alter table public.sessions
  add column if not exists assessment_release_id uuid null
  references public.assessment_configuration_releases(id);

create or replace function public.c03_normalize_jsonb(p_value jsonb)
returns jsonb
language plpgsql
immutable
set search_path to ''
as $function$
declare
  v_result jsonb;
  v_key text;
  v_value jsonb;
  v_array jsonb := '[]'::jsonb;
begin
  case jsonb_typeof(p_value)
    when 'object' then
      v_result := '{}'::jsonb;
      for v_key, v_value in
        select e.key, e.value
        from jsonb_each(p_value) e
        order by normalize(e.key, NFC)
      loop
        v_result := v_result || jsonb_build_object(
          normalize(v_key, NFC),
          public.c03_normalize_jsonb(v_value)
        );
      end loop;
      return v_result;
    when 'array' then
      for v_value in select e.value from jsonb_array_elements(p_value) with ordinality e(value, ordinality) order by e.ordinality
      loop
        v_array := v_array || jsonb_build_array(public.c03_normalize_jsonb(v_value));
      end loop;
      return v_array;
    when 'string' then
      return to_jsonb(normalize(p_value #>> '{}', NFC));
    else
      return p_value;
  end case;
end;
$function$;

create or replace function public.c03_assessment_config_projection(p_assessment_type_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_projection jsonb;
begin
  select jsonb_build_object(
    'canonicalizerVersion', 'c03-config-v1',
    'family', jsonb_build_object('id', f.id, 'slug', f.slug),
    'assessment', jsonb_build_object(
      'id', at.id,
      'familyId', at.family_id,
      'slug', at.slug,
      'titleAr', at.title_ar,
      'titleEn', at.title_en,
      'description', at.description,
      'questionCount', at.question_count,
      'axisCount', at.axis_count,
      'hasTraps', at.has_traps,
      'hasEvSimulator', at.has_ev_simulator,
      'configVersion', at.config_version,
      'version', at.version,
      'parentId', at.parent_id,
      'axisRoles', at.axis_roles,
      'kpiMappings', at.kpi_mappings,
      'evMappings', at.ev_mappings
    ),
    'axes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'code', a.code, 'title', a.title, 'titleAr', a.title_ar,
        'description', a.description, 'weight', a.weight, 'displayOrder', a.display_order,
        'status', a.status
      ) order by a.display_order, a.id)
      from public.axes a where a.assessment_type_id = at.id
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'code', q.code, 'axisId', q.axis_id, 'axisCode', a.code,
        'text', q.question_text, 'textAr', q.question_text_ar, 'type', q.question_type,
        'displayOrder', q.display_order, 'required', q.is_required, 'trapIndex', q.trap_index,
        'status', q.status, 'impact', q.impact, 'layer', q.layer, 'trapFor', q.trap_for,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', o.id, 'index', o.option_index, 'value', o.option_value,
            'label', o.label, 'labelAr', o.label_ar,
            'displayText', o.display_text, 'displayTextAr', o.display_text_ar,
            'isTrap', o.is_trap, 'displayOrder', o.display_order
          ) order by o.display_order, o.option_index, o.id)
          from public.options o where o.question_id = q.id
        ), '[]'::jsonb)
      ) order by q.display_order, q.id)
      from public.questions q
      join public.axes a on a.id = q.axis_id
      where q.assessment_type_id = at.id
    ), '[]'::jsonb),
    'traps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'questionId', t.question_id,
        'validates', t.validates, 'targetAxis', t.target_axis,
        'penaltyBase', t.penalty_base, 'penaltyMax', t.penalty_max,
        'message', t.message, 'messageAr', t.message_ar
      ) order by t.id)
      from public.traps t where t.assessment_type_id = at.id
    ), '[]'::jsonb)
  )
  into v_projection
  from public.assessment_types at
  join public.assessment_families f on f.id = at.family_id
  where at.id = p_assessment_type_id;

  if v_projection is null then
    raise exception using errcode = 'P0002', message = 'Assessment configuration not found';
  end if;
  return public.c03_normalize_jsonb(v_projection);
end;
$function$;

create or replace function public.c03_assessment_config_digest(p_assessment_type_id uuid)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select encode(
    extensions.digest(
      convert_to(public.c03_assessment_config_projection(p_assessment_type_id)::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$function$;

create or replace function public.c03_prepare_configuration_release(
  p_assessment_type_id uuid,
  p_git_commit_sha text,
  p_expected_config_digest text,
  p_config_canonicalizer_version text,
  p_interpretation_version integer,
  p_interpretation_registry_digest text,
  p_scoring_engine_version text,
  p_scoring_contract_version text,
  p_report_model_version text,
  p_migration_contract_version text,
  p_fixture_set_version text,
  p_expected_current_published_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_assessment public.assessment_types%rowtype;
  v_family public.assessment_families%rowtype;
  v_release_id uuid;
begin
  select * into v_assessment from public.assessment_types where id = p_assessment_type_id for share;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment version not found'; end if;
  select * into v_family from public.assessment_families where id = v_assessment.family_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment family not found'; end if;

  if v_family.current_published_version_id is distinct from p_expected_current_published_version_id then
    raise exception using errcode = '40907', message = 'Active assessment pointer changed before release preparation';
  end if;
  if v_assessment.status not in ('draft','archived')
     and not (v_assessment.status = 'published' and v_family.current_published_version_id = v_assessment.id) then
    raise exception using errcode = '42501', message = 'Only a draft/archived version or its already-published bootstrap target may be prepared';
  end if;
  if p_config_canonicalizer_version <> 'c03-config-v1'
     or p_git_commit_sha !~ '^[0-9a-f]{40}$'
     or p_expected_config_digest !~ '^[0-9a-f]{64}$'
     or p_interpretation_registry_digest !~ '^[0-9a-f]{64}$'
     or p_interpretation_version is null or p_interpretation_version < 1
     or nullif(btrim(coalesce(p_scoring_engine_version,'')), '') is null
     or nullif(btrim(coalesce(p_scoring_contract_version,'')), '') is null
     or nullif(btrim(coalesce(p_report_model_version,'')), '') is null
     or nullif(btrim(coalesce(p_migration_contract_version,'')), '') is null
     or nullif(btrim(coalesce(p_fixture_set_version,'')), '') is null then
    raise exception using errcode = '22023', message = 'Release manifest is incomplete or unsupported';
  end if;

  insert into public.assessment_configuration_releases (
    assessment_family_id, assessment_type_id, expected_current_published_version_id,
    git_commit_sha, expected_config_digest, config_canonicalizer_version,
    interpretation_version, interpretation_registry_digest, scoring_engine_version,
    scoring_contract_version, report_model_version, migration_contract_version,
    fixture_set_version, state
  ) values (
    v_assessment.family_id, v_assessment.id, p_expected_current_published_version_id,
    p_git_commit_sha, p_expected_config_digest, p_config_canonicalizer_version,
    p_interpretation_version, p_interpretation_registry_digest, p_scoring_engine_version,
    p_scoring_contract_version, p_report_model_version, p_migration_contract_version,
    p_fixture_set_version, 'PREPARED'
  )
  on conflict (assessment_type_id, git_commit_sha, expected_config_digest) do nothing
  returning id into v_release_id;

  if v_release_id is null then
    select id into v_release_id from public.assessment_configuration_releases
    where assessment_type_id = p_assessment_type_id
      and git_commit_sha = p_git_commit_sha
      and expected_config_digest = p_expected_config_digest;
    if not found then raise exception using errcode = '40001', message = 'Unable to resolve idempotent release preparation'; end if;
  end if;
  return v_release_id;
end;
$function$;

create or replace function public.c03_verify_configuration_release(p_release_id uuid, p_verifier_identity text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_configuration_releases%rowtype;
  v_digest text;
begin
  select * into v_release from public.assessment_configuration_releases where id = p_release_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Configuration release not found'; end if;
  if v_release.state = 'VERIFIED' or v_release.state = 'PUBLISHED' then
    return jsonb_build_object('release_id', v_release.id, 'state', v_release.state, 'config_digest', v_release.config_digest, 'idempotent', true);
  end if;
  if v_release.state <> 'PREPARED' then
    raise exception using errcode = '40908', message = 'Only PREPARED releases can be verified';
  end if;

  v_digest := public.c03_assessment_config_digest(v_release.assessment_type_id);
  if v_digest is distinct from v_release.expected_config_digest then
    update public.assessment_configuration_releases
      set state = 'REJECTED', config_digest = v_digest,
          failure_code = 'CONFIG_DIGEST_MISMATCH',
          failure_detail = 'Persisted assessment configuration differs from the Git release manifest'
    where id = v_release.id;
    return jsonb_build_object(
      'release_id', v_release.id, 'state', 'REJECTED',
      'expected_digest', v_release.expected_config_digest, 'actual_digest', v_digest,
      'failure_code', 'CONFIG_DIGEST_MISMATCH'
    );
  end if;

  if v_release.expected_current_published_version_id is distinct from (
    select f.current_published_version_id from public.assessment_families f where f.id = v_release.assessment_family_id
  ) then
    update public.assessment_configuration_releases
      set state = 'REJECTED', config_digest = v_digest,
          failure_code = 'ACTIVE_POINTER_CHANGED',
          failure_detail = 'Family active version changed after preparation'
    where id = v_release.id;
    return jsonb_build_object('release_id', v_release.id, 'state', 'REJECTED', 'failure_code', 'ACTIVE_POINTER_CHANGED');
  end if;

  update public.assessment_configuration_releases
    set state = 'VERIFIED', config_digest = v_digest,
        verified_at = now(), verifier_identity = nullif(btrim(coalesce(p_verifier_identity,'')), ''),
        failure_code = null, failure_detail = null
  where id = v_release.id;

  return jsonb_build_object('release_id', v_release.id, 'state', 'VERIFIED', 'config_digest', v_digest, 'idempotent', false);
end;
$function$;

create or replace function public.c03_publish_configuration_release(
  p_release_id uuid,
  p_expected_current_published_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_configuration_releases%rowtype;
  v_family public.assessment_families%rowtype;
  v_assessment public.assessment_types%rowtype;
  v_digest text;
begin
  select * into v_release from public.assessment_configuration_releases where id = p_release_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Configuration release not found'; end if;
  select * into v_family from public.assessment_families where id = v_release.assessment_family_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment family not found'; end if;
  select * into v_assessment from public.assessment_types where id = v_release.assessment_type_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment version not found'; end if;

  if v_release.state = 'PUBLISHED' and v_family.current_published_version_id = v_release.assessment_type_id then
    return jsonb_build_object('release_id', v_release.id, 'state', 'PUBLISHED', 'idempotent', true);
  end if;
  if v_release.state <> 'VERIFIED' then raise exception using errcode = '40908', message = 'Only VERIFIED releases may publish'; end if;
  if v_release.expected_current_published_version_id is distinct from p_expected_current_published_version_id
     or v_family.current_published_version_id is distinct from p_expected_current_published_version_id then
    raise exception using errcode = '40907', message = 'Active assessment pointer changed before publication';
  end if;

  v_digest := public.c03_assessment_config_digest(v_release.assessment_type_id);
  if v_digest is distinct from v_release.config_digest
     or v_digest is distinct from v_release.expected_config_digest then
    update public.assessment_configuration_releases set state = 'REJECTED',
      failure_code = 'CONFIG_DRIFT_BEFORE_PUBLISH',
      failure_detail = 'Configuration changed after verification'
    where id = v_release.id;
    raise exception using errcode = '40906', message = 'Assessment configuration drift detected before publication';
  end if;

  if v_assessment.status <> 'published' then
    update public.assessment_types set status = 'published', is_active = true, published_at = coalesce(published_at, now()), archived_at = null
    where id = v_assessment.id;
  end if;
  update public.assessment_types set is_active = false
    where family_id = v_release.assessment_family_id and id <> v_release.assessment_type_id and is_active is distinct from false;

  update public.assessment_families
    set current_published_version_id = v_release.assessment_type_id, updated_at = now()
    where id = v_family.id
      and current_published_version_id is not distinct from p_expected_current_published_version_id;
  if not found then raise exception using errcode = '40907', message = 'Concurrent publisher changed active assessment pointer'; end if;

  update public.assessment_configuration_releases
    set state = 'PUBLISHED', published_at = now(), failure_code = null, failure_detail = null
    where id = v_release.id;

  return jsonb_build_object('release_id', v_release.id, 'state', 'PUBLISHED', 'assessment_type_id', v_release.assessment_type_id, 'config_digest', v_digest, 'idempotent', false);
end;
$function$;

create or replace function public.c03_rollback_configuration_release(
  p_family_id uuid,
  p_target_release_id uuid,
  p_expected_current_published_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_family public.assessment_families%rowtype;
  v_target public.assessment_configuration_releases%rowtype;
  v_digest text;
begin
  select * into v_family from public.assessment_families where id = p_family_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment family not found'; end if;
  if v_family.current_published_version_id is distinct from p_expected_current_published_version_id then
    raise exception using errcode = '40907', message = 'Active assessment pointer changed before rollback';
  end if;

  select * into v_target from public.assessment_configuration_releases
  where id = p_target_release_id and assessment_family_id = p_family_id and state = 'PUBLISHED'
  for update;
  if not found then raise exception using errcode = '40908', message = 'Rollback target is not a previously verified published release'; end if;

  v_digest := public.c03_assessment_config_digest(v_target.assessment_type_id);
  if v_digest is distinct from v_target.config_digest then
    raise exception using errcode = '40906', message = 'Rollback target configuration has drifted';
  end if;

  update public.assessment_types set is_active = false
    where family_id = p_family_id and is_active is distinct from false;
  update public.assessment_types set is_active = true
    where id = v_target.assessment_type_id and status = 'published';
  if not found then raise exception using errcode = '40908', message = 'Rollback target assessment version is not published'; end if;

  update public.assessment_families
    set current_published_version_id = v_target.assessment_type_id, updated_at = now()
    where id = p_family_id
      and current_published_version_id is not distinct from p_expected_current_published_version_id;
  if not found then raise exception using errcode = '40907', message = 'Concurrent publisher changed active assessment pointer'; end if;

  return jsonb_build_object('release_id', v_target.id, 'state', 'PUBLISHED', 'rolled_back_to', v_target.assessment_type_id, 'config_digest', v_digest);
end;
$function$;

create or replace function public.c03_resolve_active_configuration_release(p_assessment_type_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_assessment public.assessment_types%rowtype;
  v_family public.assessment_families%rowtype;
  v_release public.assessment_configuration_releases%rowtype;
  v_digest text;
begin
  select * into v_assessment from public.assessment_types where id = p_assessment_type_id;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment version not found'; end if;
  select * into v_family from public.assessment_families where id = v_assessment.family_id;
  if not found or v_family.current_published_version_id is distinct from v_assessment.id then
    raise exception using errcode = '40906', message = 'Assessment version is not the active family version';
  end if;
  if v_assessment.status <> 'published' or v_assessment.is_active is distinct from true then
    raise exception using errcode = '40906', message = 'Assessment version is not active and published';
  end if;

  select * into v_release from public.assessment_configuration_releases
  where assessment_family_id = v_assessment.family_id
    and assessment_type_id = v_assessment.id
    and state = 'PUBLISHED'
  order by published_at desc, created_at desc
  limit 1;
  if not found then raise exception using errcode = '40905', message = 'No verified configuration release is registered for the active assessment'; end if;

  v_digest := public.c03_assessment_config_digest(v_assessment.id);
  if v_digest is distinct from v_release.config_digest then
    update public.assessment_configuration_releases set state = 'DEGRADED',
      degraded_at = now(), failure_code = 'POST_PUBLISH_CONFIG_DRIFT',
      failure_detail = 'Live assessment configuration differs from the verified release'
    where id = v_release.id;
    raise exception using errcode = '40906', message = 'Published assessment configuration drift detected';
  end if;

  return jsonb_build_object(
    'release_id', v_release.id, 'assessment_family_id', v_release.assessment_family_id,
    'assessment_type_id', v_release.assessment_type_id, 'git_commit_sha', v_release.git_commit_sha,
    'config_digest', v_release.config_digest, 'interpretation_version', v_release.interpretation_version,
    'interpretation_registry_digest', v_release.interpretation_registry_digest,
    'scoring_engine_version', v_release.scoring_engine_version,
    'scoring_contract_version', v_release.scoring_contract_version,
    'report_model_version', v_release.report_model_version,
    'migration_contract_version', v_release.migration_contract_version,
    'fixture_set_version', v_release.fixture_set_version
  );
end;
$function$;

create or replace function public.c03_assert_session_configuration_release(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_session public.sessions%rowtype;
  v_release public.assessment_configuration_releases%rowtype;
  v_digest text;
begin
  select * into v_session from public.sessions where id = p_session_id;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment session not found'; end if;
  if v_session.assessment_release_id is null then
    raise exception using errcode = '40905', message = 'Assessment session has no pinned configuration release';
  end if;
  select * into v_release from public.assessment_configuration_releases
    where id = v_session.assessment_release_id and assessment_type_id = v_session.assessment_type_id
      and state in ('PUBLISHED','DEGRADED');
  if not found then raise exception using errcode = '40905', message = 'Pinned configuration release is unavailable'; end if;
  if v_release.state = 'DEGRADED' then
    raise exception using errcode = '40906', message = 'Pinned configuration release is degraded; session requires recovery';
  end if;

  v_digest := public.c03_assessment_config_digest(v_release.assessment_type_id);
  if v_digest is distinct from v_release.config_digest then
    update public.assessment_configuration_releases set state = 'DEGRADED',
      degraded_at = now(), failure_code = 'PINNED_CONFIG_DRIFT',
      failure_detail = 'Pinned assessment configuration differs from the verified release'
    where id = v_release.id;
    raise exception using errcode = '40906', message = 'Pinned assessment configuration drift detected';
  end if;
  return jsonb_build_object('release_id', v_release.id, 'config_digest', v_digest, 'state', v_release.state);
end;
$function$;

revoke all on function public.c03_normalize_jsonb(jsonb) from public, anon, authenticated;
revoke all on function public.c03_assessment_config_projection(uuid) from public, anon, authenticated;
revoke all on function public.c03_assessment_config_digest(uuid) from public, anon, authenticated;
revoke all on function public.c03_prepare_configuration_release(uuid,text,text,text,integer,text,text,text,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.c03_verify_configuration_release(uuid,text) from public, anon, authenticated;
revoke all on function public.c03_publish_configuration_release(uuid,uuid) from public, anon, authenticated;
revoke all on function public.c03_rollback_configuration_release(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.c03_resolve_active_configuration_release(uuid) from public, anon, authenticated;
revoke all on function public.c03_assert_session_configuration_release(uuid) from public, anon, authenticated;

grant execute on function public.c03_assessment_config_projection(uuid) to service_role;
grant execute on function public.c03_assessment_config_digest(uuid) to service_role;
grant execute on function public.c03_prepare_configuration_release(uuid,text,text,text,integer,text,text,text,text,text,text,uuid) to service_role;
grant execute on function public.c03_verify_configuration_release(uuid,text) to service_role;
grant execute on function public.c03_publish_configuration_release(uuid,uuid) to service_role;
grant execute on function public.c03_rollback_configuration_release(uuid,uuid,uuid) to service_role;
grant execute on function public.c03_resolve_active_configuration_release(uuid) to service_role;
grant execute on function public.c03_assert_session_configuration_release(uuid) to service_role;


-- Pin each new session to the exact verified release, and fail closed on the legacy overload.
create or replace function public.start_assessment_session(
  p_access_token_hash text,
  p_assessment_user_id uuid,
  p_assessment_type_id uuid,
  p_lead_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_user public.assessment_users%rowtype;
  v_session public.sessions%rowtype;
  v_assessment_version integer;
  v_expiry timestamptz;
  v_release jsonb;
  v_release_id uuid;
begin
  select * into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and assessment_user_id = p_assessment_user_id
    and assessment_type_id = p_assessment_type_id
    and revoked_at is null
    and expires_at > now()
  for update;
  if not found then raise exception using errcode = '28000', message = 'Invalid or expired assessment access'; end if;

  select * into v_user from public.assessment_users where id = p_assessment_user_id for update;
  if not found or not v_user.active then raise exception using errcode = '28000', message = 'Assessment access is inactive'; end if;
  if v_user.expires_at is not null and v_user.expires_at <= now() then
    raise exception using errcode = '28000', message = 'Assessment access is expired';
  end if;
  if v_user.assessment_key is distinct from (
    select at.slug from public.assessment_types at where at.id = p_assessment_type_id
  ) then raise exception using errcode = '42501', message = 'Assessment mismatch'; end if;

  select * into v_session
  from public.sessions
  where assessment_user_id = p_assessment_user_id
    and assessment_type_id = p_assessment_type_id
    and status = 'in_progress'
    and submission_state in ('draft','processing')
    and last_activity_at >= now() - interval '7 days'
  order by last_activity_at desc
  limit 1
  for update;

  if found then
    perform public.c03_assert_session_configuration_release(v_session.id);
    v_assessment_version := v_session.assessment_version;
  else
    if coalesce(v_user.used_count, 0) >= coalesce(v_user.max_uses, 1) then
      raise exception using errcode = '42501', message = 'Usage limit exceeded';
    end if;
    v_release := public.c03_resolve_active_configuration_release(p_assessment_type_id);
    v_release_id := (v_release->>'release_id')::uuid;
    select at.version into v_assessment_version
    from public.assessment_types at
    where at.id = p_assessment_type_id and at.status = 'published';
    if v_assessment_version is null then raise exception using errcode = '42501', message = 'Assessment unavailable'; end if;

    insert into public.sessions (
      lead_id, assessment_type_id, assessment_user_id, status, submission_state,
      current_question, started_at, last_activity_at, assessment_version,
      scoring_engine_version, assessment_release_id
    ) values (
      p_lead_id, p_assessment_type_id, p_assessment_user_id, 'in_progress', 'draft',
      0, now(), now(), v_assessment_version, 'server-score-v1', v_release_id
    ) returning * into v_session;
  end if;

  v_expiry := least(now() + interval '24 hours', coalesce(v_user.expires_at, now() + interval '24 hours'));
  update public.assessment_session_access
    set session_id = v_session.id, last_seen_at = now(), expires_at = v_expiry
    where id = v_access.id;
  update public.sessions set last_activity_at = now() where id = v_session.id;

  return jsonb_build_object(
    'success', true, 'session_id', v_session.id, 'lead_id', v_session.lead_id,
    'assessment_version', v_session.assessment_version,
    'scoring_engine_version', v_session.scoring_engine_version,
    'assessment_release_id', v_session.assessment_release_id,
    'expires_at', v_expiry, 'resumed', true
  );
end;
$function$;

create or replace function public.start_public_assessment_session(
  p_access_token_hash text,
  p_assessment_type_id uuid,
  p_lead_id uuid,
  p_attempt_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_session public.sessions%rowtype;
  v_assessment_version integer;
  v_existing_session public.sessions%rowtype;
  v_expiry timestamptz;
  v_release jsonb;
  v_release_id uuid;
begin
  if nullif(btrim(coalesce(p_attempt_key_hash,'')), '') is null then
    raise exception using errcode = '22023', message = 'Attempt key is required';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_attempt_key_hash));

  select * into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and assessment_type_id = p_assessment_type_id
    and assessment_user_id is null and session_id is null
    and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception using errcode = '28000', message = 'Invalid or expired public assessment access'; end if;

  update public.sessions set status = 'abandoned', last_activity_at = now()
  where assessment_type_id = p_assessment_type_id
    and attempt_key_hash = p_attempt_key_hash and status = 'in_progress'
    and last_activity_at < now() - interval '7 days';

  select * into v_existing_session
  from public.sessions
  where assessment_type_id = p_assessment_type_id
    and attempt_key_hash = p_attempt_key_hash
    and status = 'in_progress' and submission_state = 'draft'
    and last_activity_at >= now() - interval '7 days'
  order by last_activity_at desc limit 1 for update;

  if found then
    perform public.c03_assert_session_configuration_release(v_existing_session.id);
    v_expiry := least(now() + interval '24 hours', v_access.expires_at);
    update public.assessment_session_access
      set session_id = v_existing_session.id, last_seen_at = now(), expires_at = v_expiry
      where id = v_access.id;
    update public.sessions set last_activity_at = now() where id = v_existing_session.id;
    return jsonb_build_object(
      'success', true, 'session_id', v_existing_session.id, 'lead_id', v_existing_session.lead_id,
      'assessment_version', v_existing_session.assessment_version,
      'scoring_engine_version', v_existing_session.scoring_engine_version,
      'assessment_release_id', v_existing_session.assessment_release_id,
      'expires_at', v_expiry, 'resumed', true
    );
  end if;

  v_release := public.c03_resolve_active_configuration_release(p_assessment_type_id);
  v_release_id := (v_release->>'release_id')::uuid;
  select at.version into v_assessment_version
  from public.assessment_types at
  where at.id = p_assessment_type_id and at.status = 'published';
  if v_assessment_version is null then raise exception using errcode = '42501', message = 'Assessment unavailable'; end if;

  insert into public.sessions (
    lead_id, assessment_type_id, assessment_user_id, status, submission_state,
    current_question, started_at, last_activity_at, attempt_key_hash,
    assessment_version, scoring_engine_version, assessment_release_id
  ) values (
    p_lead_id, p_assessment_type_id, null, 'in_progress', 'draft',
    0, now(), now(), p_attempt_key_hash,
    v_assessment_version, 'server-score-v1', v_release_id
  ) returning * into v_session;

  update public.assessment_session_access
    set session_id = v_session.id, last_seen_at = now()
    where id = v_access.id;

  return jsonb_build_object(
    'success', true, 'session_id', v_session.id, 'lead_id', v_session.lead_id,
    'assessment_version', v_session.assessment_version,
    'scoring_engine_version', v_session.scoring_engine_version,
    'assessment_release_id', v_session.assessment_release_id,
    'expires_at', v_access.expires_at, 'resumed', false
  );
end;
$function$;

-- The historical overload lacks the attempt-key/idempotency contract. Disable it so it cannot bypass release pinning.
create or replace function public.start_public_assessment_session(
  p_access_token_hash text,
  p_assessment_type_id uuid,
  p_lead_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
begin
  raise exception using errcode = '40905', message = 'Deprecated session-start overload; use the attempt-key signature';
end;
$function$;

create or replace function public.c03_validate_result_release_pin()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_session public.sessions%rowtype;
  v_release public.assessment_configuration_releases%rowtype;
begin
  if new.result is null then return new; end if;
  select * into v_session from public.sessions where id = new.session_id;
  if not found or v_session.assessment_release_id is null then
    raise exception using errcode = '40905', message = 'Result session has no pinned configuration release';
  end if;
  select * into v_release from public.assessment_configuration_releases
    where id = v_session.assessment_release_id
      and assessment_type_id = new.assessment_type_id
      and state = 'PUBLISHED';
  if not found then raise exception using errcode = '40905', message = 'Result release pin is unavailable'; end if;
  if new.result->'provenance'->>'configurationReleaseId' is distinct from v_release.id::text
     or new.result->'provenance'->>'configurationReleaseDigest' is distinct from v_release.config_digest then
    raise exception using errcode = '40906', message = 'Structured Result release identity does not match the session pin';
  end if;
  return new;
end;
$function$;

drop trigger if exists c03_validate_result_release_pin on public.assessment_results;
create trigger c03_validate_result_release_pin
before insert or update of result, assessment_type_id, session_id
on public.assessment_results
for each row execute function public.c03_validate_result_release_pin();

revoke all on function public.start_assessment_session(text,uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.start_public_assessment_session(text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.start_public_assessment_session(text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.c03_validate_result_release_pin() from public, anon, authenticated;
grant execute on function public.start_assessment_session(text,uuid,uuid,uuid) to service_role;
grant execute on function public.start_public_assessment_session(text,uuid,uuid,text) to service_role;
grant execute on function public.start_public_assessment_session(text,uuid,uuid) to service_role;

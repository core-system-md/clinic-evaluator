-- C-03: narrow CI workload authorization for the guarded GitHub OIDC release workflow.
-- New migration only. Never edit the already-applied 20261015100000 migration.
begin;

alter table public.assessment_config_releases
  add column if not exists release_actor jsonb not null default '{}'::jsonb,
  add column if not exists activation_actor jsonb not null default '{}'::jsonb;
alter table public.assessment_config_release_settings
  add column if not exists enabled_by_workflow_run_id text,
  add column if not exists enabled_by_workflow_sha text;

alter table public.assessment_config_releases
  drop constraint if exists assessment_config_releases_ci_actor_object_check;
alter table public.assessment_config_releases
  add constraint assessment_config_releases_ci_actor_object_check
  check (jsonb_typeof(release_actor) = 'object' and jsonb_typeof(activation_actor) = 'object');

create or replace function public.c03_release_immutable_guard()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op = 'DELETE' then
    if old.state in ('VERIFIED','PUBLISHED','DEGRADED') then
      raise exception 'Verified or published release evidence is immutable' using errcode = '55000';
    end if;
    return old;
  end if;
  if old.state in ('VERIFIED','PUBLISHED','DEGRADED') and (
    new.family_id is distinct from old.family_id or
    new.assessment_type_id is distinct from old.assessment_type_id or
    new.assessment_version is distinct from old.assessment_version or
    new.git_commit_sha is distinct from old.git_commit_sha or
    new.config_digest is distinct from old.config_digest or
    new.canonicalizer_version is distinct from old.canonicalizer_version or
    new.interpretation_version is distinct from old.interpretation_version or
    new.interpretation_registry_digest is distinct from old.interpretation_registry_digest or
    new.scoring_engine_version is distinct from old.scoring_engine_version or
    new.scoring_contract_version is distinct from old.scoring_contract_version or
    new.report_model_version is distinct from old.report_model_version or
    new.fixture_set_version is distinct from old.fixture_set_version or
    new.migration_contract_version is distinct from old.migration_contract_version or
    new.edge_release_ref is distinct from old.edge_release_ref or
    new.release_actor is distinct from old.release_actor
  ) then
    raise exception 'Verified or published release identity and actor evidence are immutable' using errcode = '55000';
  end if;
  return new;
end;
$function$;

create or replace function public.c03_require_ci_release_context(
  p_workflow_run_id text,
  p_workflow_run_attempt text,
  p_workflow_sha text,
  p_confirmation text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'C-03 CI service role required' using errcode = '42501';
  end if;
  if p_confirmation is distinct from 'ENABLE-C03-PRODUCTION'
     or coalesce(p_workflow_run_id, '') !~ '^[0-9]+$'
     or coalesce(p_workflow_run_attempt, '') !~ '^[0-9]+$'
     or coalesce(p_workflow_sha, '') !~ '^[0-9a-f]{40}$' then
    raise exception 'Invalid guarded GitHub release identity or confirmation' using errcode = '42501';
  end if;
end;
$function$;

create or replace function public.register_assessment_config_release_ci_secure(
  p_assessment_type_id uuid,
  p_git_commit_sha text,
  p_config_digest text,
  p_canonicalizer_version text,
  p_interpretation_version integer,
  p_interpretation_registry_digest text,
  p_scoring_engine_version text,
  p_scoring_contract_version text,
  p_report_model_version text,
  p_fixture_set_version text,
  p_migration_contract_version text,
  p_edge_release_ref text,
  p_workflow_run_id text,
  p_workflow_run_attempt text,
  p_workflow_sha text,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_assessment public.assessment_types%rowtype;
  v_release public.assessment_config_releases%rowtype;
  v_actor jsonb;
begin
  perform public.c03_require_ci_release_context(p_workflow_run_id, p_workflow_run_attempt, p_workflow_sha, p_confirmation);
  if p_workflow_sha is distinct from p_git_commit_sha then
    raise exception 'Release manifest SHA does not match the guarded workflow SHA' using errcode = '42501';
  end if;

  v_actor := jsonb_build_object(
    'provider','github-actions-oidc',
    'repository','core-system-md/clinic-evaluator',
    'workflow','.github/workflows/c03-production-release.yml',
    'environment','production-e2e',
    'run_id',p_workflow_run_id,
    'run_attempt',p_workflow_run_attempt,
    'sha',p_workflow_sha
  );

  select * into v_assessment
  from public.assessment_types
  where id = p_assessment_type_id
  for update;
  if not found then raise exception 'Assessment version not found' using errcode = 'P0002'; end if;
  if v_assessment.status not in ('draft','archived','published') then
    raise exception 'Only an existing draft, archived, or published version can be registered' using errcode = '55000';
  end if;
  if coalesce(p_git_commit_sha, '') !~ '^[0-9a-f]{40}$'
     or coalesce(p_config_digest, '') !~ '^[0-9a-f]{64}$'
     or coalesce(p_interpretation_registry_digest, '') !~ '^[0-9a-f]{64}$'
     or p_interpretation_version is null or p_interpretation_version < 1
     or nullif(trim(p_canonicalizer_version), '') is null
     or nullif(trim(p_scoring_engine_version), '') is null
     or nullif(trim(p_scoring_contract_version), '') is null
     or nullif(trim(p_report_model_version), '') is null
     or nullif(trim(p_fixture_set_version), '') is null
     or nullif(trim(p_migration_contract_version), '') is null
     or nullif(trim(p_edge_release_ref), '') is null then
    raise exception 'Release manifest is incomplete or has invalid digest/version fields' using errcode = '22023';
  end if;

  insert into public.assessment_config_releases(
    family_id, assessment_type_id, assessment_version, git_commit_sha,
    config_digest, canonicalizer_version, interpretation_version,
    interpretation_registry_digest, scoring_engine_version, scoring_contract_version,
    report_model_version, fixture_set_version, migration_contract_version,
    edge_release_ref, state, created_by, release_actor
  ) values (
    v_assessment.family_id, v_assessment.id, v_assessment.version, p_git_commit_sha,
    p_config_digest, p_canonicalizer_version, p_interpretation_version,
    p_interpretation_registry_digest, p_scoring_engine_version, p_scoring_contract_version,
    p_report_model_version, p_fixture_set_version, p_migration_contract_version,
    trim(p_edge_release_ref), 'PREPARED', null, v_actor
  )
  on conflict (assessment_type_id, git_commit_sha, config_digest) do nothing;

  select * into v_release
  from public.assessment_config_releases
  where assessment_type_id = p_assessment_type_id
    and git_commit_sha = p_git_commit_sha
    and config_digest = p_config_digest;

  if v_release.state = 'REJECTED' then
    raise exception 'This exact release identity was rejected; register a corrected manifest' using errcode = '55000';
  end if;
  if v_release.family_id is distinct from v_assessment.family_id
     or v_release.assessment_version is distinct from v_assessment.version
     or v_release.canonicalizer_version is distinct from p_canonicalizer_version
     or v_release.interpretation_version is distinct from p_interpretation_version
     or v_release.interpretation_registry_digest is distinct from p_interpretation_registry_digest
     or v_release.scoring_engine_version is distinct from p_scoring_engine_version
     or v_release.scoring_contract_version is distinct from p_scoring_contract_version
     or v_release.report_model_version is distinct from p_report_model_version
     or v_release.fixture_set_version is distinct from p_fixture_set_version
     or v_release.migration_contract_version is distinct from p_migration_contract_version
     or v_release.edge_release_ref is distinct from trim(p_edge_release_ref) then
    raise exception 'Release identity already exists with different manifest metadata' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'success',true,'release_id',v_release.id,'state',v_release.state,
    'assessment_type_id',v_release.assessment_type_id,'assessment_version',v_release.assessment_version,
    'config_digest',v_release.config_digest,'release_actor',v_release.release_actor
  );
end;
$function$;

create or replace function public.activate_existing_assessment_release_ci_secure(
  p_release_id uuid,
  p_expected_published_version_id uuid,
  p_workflow_run_id text,
  p_workflow_run_attempt text,
  p_workflow_sha text,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_family public.assessment_families%rowtype;
  v_version public.assessment_types%rowtype;
  v_actor jsonb;
begin
  perform public.c03_require_ci_release_context(p_workflow_run_id, p_workflow_run_attempt, p_workflow_sha, p_confirmation);
  v_actor := jsonb_build_object(
    'provider','github-actions-oidc','repository','core-system-md/clinic-evaluator',
    'workflow','.github/workflows/c03-production-release.yml','environment','production-e2e',
    'run_id',p_workflow_run_id,'run_attempt',p_workflow_run_attempt,'sha',p_workflow_sha
  );

  select * into v_release from public.assessment_config_releases where id = p_release_id for update;
  if not found then raise exception 'Assessment release not found' using errcode = 'P0002'; end if;
  if v_release.state not in ('VERIFIED','PUBLISHED')
     or v_release.verified_config_digest is distinct from v_release.config_digest
     or v_release.verified_registry_digest is distinct from v_release.interpretation_registry_digest
     or v_release.verified_git_commit_sha is distinct from v_release.git_commit_sha
     or v_release.verified_edge_release_ref is distinct from v_release.edge_release_ref
     or v_release.git_commit_sha is distinct from p_workflow_sha then
    raise exception 'Only a verified release attested to this workflow SHA can be activated' using errcode = '55000';
  end if;

  select * into v_family from public.assessment_families where id = v_release.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode = 'P0002'; end if;
  if v_release.state = 'PUBLISHED' and v_family.current_release_id is distinct from p_release_id then
    raise exception 'Published release is not the current release pointer; refusing stale reactivation' using errcode = '55000';
  end if;
  if v_family.current_published_version_id is distinct from p_expected_published_version_id
     or v_family.current_published_version_id is distinct from v_release.assessment_type_id then
    raise exception 'Published pointer compare-and-swap failed' using errcode = '40001';
  end if;
  select * into v_version from public.assessment_types where id = v_release.assessment_type_id;
  if not found or v_version.status <> 'published' or v_version.is_active is not true
     or v_version.family_id is distinct from v_release.family_id
     or v_version.version is distinct from v_release.assessment_version then
    raise exception 'Release does not match the current published version' using errcode = '55000';
  end if;

  if not public.c03_assessment_release_gate_enabled() then
    update public.assessment_config_releases
    set state = 'PUBLISHED', published_at = coalesce(published_at, now()), activation_actor = v_actor
    where id = p_release_id;
  else
    update public.assessment_config_releases set activation_actor = v_actor where id = p_release_id;
  end if;
  update public.assessment_families set current_release_id = p_release_id, updated_at = now()
  where id = v_family.id;
  return jsonb_build_object('success',true,'release_id',p_release_id,'state','PUBLISHED','activation_actor',v_actor);
end;
$function$;

create or replace function public.enable_assessment_config_release_gate_ci_secure(
  p_workflow_run_id text,
  p_workflow_run_attempt text,
  p_workflow_sha text,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_missing integer;
  v_actor jsonb;
begin
  perform public.c03_require_ci_release_context(p_workflow_run_id, p_workflow_run_attempt, p_workflow_sha, p_confirmation);
  v_actor := jsonb_build_object(
    'provider','github-actions-oidc','repository','core-system-md/clinic-evaluator',
    'workflow','.github/workflows/c03-production-release.yml','environment','production-e2e',
    'run_id',p_workflow_run_id,'run_attempt',p_workflow_run_attempt,'sha',p_workflow_sha
  );

  perform 1 from public.assessment_config_release_settings where singleton for update;
  select count(*) into v_missing
  from public.assessment_families f
  where f.current_published_version_id is not null
    and not exists (
      select 1 from public.assessment_config_releases r
      where r.id = f.current_release_id
        and r.family_id = f.id
        and r.assessment_type_id = f.current_published_version_id
        and r.state = 'PUBLISHED'
        and r.verified_config_digest = r.config_digest
        and r.verified_registry_digest = r.interpretation_registry_digest
        and r.verified_git_commit_sha = r.git_commit_sha
        and r.verified_edge_release_ref = r.edge_release_ref
        and r.git_commit_sha = p_workflow_sha
    );
  if v_missing > 0 then
    raise exception 'Cannot enable C-03 gate: % published families lack a verified active release for this workflow SHA', v_missing using errcode = '55000';
  end if;

  update public.assessment_config_release_settings
  set enabled = true, enabled_at = now(), enabled_by = null,
      enabled_by_workflow_run_id = p_workflow_run_id,
      enabled_by_workflow_sha = p_workflow_sha, updated_at = now()
  where singleton;
  return jsonb_build_object('success',true,'enabled',true,'enabled_by',v_actor);
end;
$function$;

revoke all on function public.c03_require_ci_release_context(text,text,text,text) from public, anon, authenticated;
revoke all on function public.register_assessment_config_release_ci_secure(uuid,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.activate_existing_assessment_release_ci_secure(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.enable_assessment_config_release_gate_ci_secure(text,text,text,text) from public, anon, authenticated;

grant execute on function public.c03_require_ci_release_context(text,text,text,text) to service_role;
grant execute on function public.register_assessment_config_release_ci_secure(uuid,text,text,text,integer,text,text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.activate_existing_assessment_release_ci_secure(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.enable_assessment_config_release_gate_ci_secure(text,text,text,text) to service_role;

commit;

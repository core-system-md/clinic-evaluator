-- C-03: allow verified releases for any current published assessment family after gate activation.
-- Preserve the existing guarded OIDC identity, release digest checks, and compare-and-swap.
-- New migration only; never edit the already-applied release-authorization migration.
begin;

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

  -- The same verified transition is required both during initial gate bootstrap and
  -- for subsequent assessment releases while the gate remains enabled. Do not leave
  -- the active pointer referencing a VERIFIED row merely because the gate is enabled.
  update public.assessment_config_releases
  set state = 'PUBLISHED',
      published_at = coalesce(published_at, now()),
      activation_actor = v_actor
  where id = p_release_id;

  update public.assessment_families
  set current_release_id = p_release_id, updated_at = now()
  where id = v_family.id;

  return jsonb_build_object(
    'success',true,'release_id',p_release_id,'state','PUBLISHED','activation_actor',v_actor
  );
end;
$function$;

commit;

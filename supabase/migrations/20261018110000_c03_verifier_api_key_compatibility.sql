-- C-03: allow the service_role-only verifier RPC to work with modern non-JWT sb_secret API keys.
-- The EXECUTE grant remains service_role-only; explicit non-service JWT claims are still rejected.
begin;

create or replace function public.verify_assessment_config_release_secure(
  p_release_id uuid,
  p_actual_family_id uuid,
  p_actual_assessment_type_id uuid,
  p_actual_assessment_version integer,
  p_actual_config_digest text,
  p_actual_canonicalizer_version text,
  p_actual_registry_digest text,
  p_actual_git_commit_sha text,
  p_actual_edge_release_ref text,
  p_actual_interpretation_version integer,
  p_actual_scoring_engine_version text,
  p_actual_scoring_contract_version text,
  p_actual_report_model_version text,
  p_actual_fixture_set_version text,
  p_actual_migration_contract_version text,
  p_validation_report jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_release public.assessment_config_releases%rowtype;
  v_mismatches jsonb := '[]'::jsonb;
begin
  -- Execute privilege is granted only to service_role. Modern sb_secret keys are not JWTs
  -- and may omit request.jwt.claim.role; reject an explicit conflicting JWT role, but allow
  -- the missing legacy claim when the caller has already passed the EXECUTE privilege check.
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'Service-role runtime verifier required' using errcode = '42501';
  end if;

  select * into v_release
  from public.assessment_config_releases
  where id = p_release_id
  for update;
  if not found then
    raise exception 'Assessment release not found' using errcode = 'P0002';
  end if;
  if v_release.state not in ('PREPARED','VERIFIED') then
    raise exception 'Only prepared releases can be verified' using errcode = '55000';
  end if;

  if p_actual_family_id is distinct from v_release.family_id then v_mismatches := v_mismatches || jsonb_build_array('family_id'); end if;
  if p_actual_assessment_type_id is distinct from v_release.assessment_type_id then v_mismatches := v_mismatches || jsonb_build_array('assessment_type_id'); end if;
  if p_actual_assessment_version is distinct from v_release.assessment_version then v_mismatches := v_mismatches || jsonb_build_array('assessment_version'); end if;
  if p_actual_config_digest is distinct from v_release.config_digest then v_mismatches := v_mismatches || jsonb_build_array('config_digest'); end if;
  if p_actual_canonicalizer_version is distinct from v_release.canonicalizer_version then v_mismatches := v_mismatches || jsonb_build_array('canonicalizer_version'); end if;
  if p_actual_registry_digest is distinct from v_release.interpretation_registry_digest then v_mismatches := v_mismatches || jsonb_build_array('interpretation_registry_digest'); end if;
  if p_actual_git_commit_sha is distinct from v_release.git_commit_sha then v_mismatches := v_mismatches || jsonb_build_array('git_commit_sha'); end if;
  if p_actual_edge_release_ref is distinct from v_release.edge_release_ref then v_mismatches := v_mismatches || jsonb_build_array('edge_release_ref'); end if;
  if p_actual_interpretation_version is distinct from v_release.interpretation_version then v_mismatches := v_mismatches || jsonb_build_array('interpretation_version'); end if;
  if p_actual_scoring_engine_version is distinct from v_release.scoring_engine_version then v_mismatches := v_mismatches || jsonb_build_array('scoring_engine_version'); end if;
  if p_actual_scoring_contract_version is distinct from v_release.scoring_contract_version then v_mismatches := v_mismatches || jsonb_build_array('scoring_contract_version'); end if;
  if p_actual_report_model_version is distinct from v_release.report_model_version then v_mismatches := v_mismatches || jsonb_build_array('report_model_version'); end if;
  if p_actual_fixture_set_version is distinct from v_release.fixture_set_version then v_mismatches := v_mismatches || jsonb_build_array('fixture_set_version'); end if;
  if p_actual_migration_contract_version is distinct from v_release.migration_contract_version then v_mismatches := v_mismatches || jsonb_build_array('migration_contract_version'); end if;

  if jsonb_array_length(v_mismatches) > 0 then
    if v_release.state = 'VERIFIED' then
      return jsonb_build_object('success', false, 'state', 'VERIFIED', 'mismatches', v_mismatches);
    end if;
    update public.assessment_config_releases
    set state = 'REJECTED',
        failure_reason = 'Runtime verification mismatch: ' || array_to_string(array(select jsonb_array_elements_text(v_mismatches)), ', '),
        validation_report = coalesce(p_validation_report, '{}'::jsonb) || jsonb_build_object('mismatches', v_mismatches)
    where id = p_release_id;
    return jsonb_build_object('success', false, 'state', 'REJECTED', 'mismatches', v_mismatches);
  end if;

  if v_release.state = 'VERIFIED' then
    return jsonb_build_object('success', true, 'state', 'VERIFIED', 'release_id', p_release_id, 'idempotent', true);
  end if;

  update public.assessment_config_releases
  set state = 'VERIFIED',
      verified_at = now(),
      verified_config_digest = p_actual_config_digest,
      verified_registry_digest = p_actual_registry_digest,
      verified_git_commit_sha = p_actual_git_commit_sha,
      verified_edge_release_ref = p_actual_edge_release_ref,
      verified_interpretation_version = p_actual_interpretation_version,
      verified_scoring_engine_version = p_actual_scoring_engine_version,
      verified_scoring_contract_version = p_actual_scoring_contract_version,
      verified_report_model_version = p_actual_report_model_version,
      verified_fixture_set_version = p_actual_fixture_set_version,
      verified_migration_contract_version = p_actual_migration_contract_version,
      validation_report = coalesce(p_validation_report, '{}'::jsonb),
      failure_reason = null
  where id = p_release_id;

  return jsonb_build_object('success', true, 'state', 'VERIFIED', 'release_id', p_release_id);
end;
$function$;

revoke all on function public.verify_assessment_config_release_secure(uuid,uuid,uuid,integer,text,text,text,text,text,integer,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.verify_assessment_config_release_secure(uuid,uuid,uuid,integer,text,text,text,text,text,integer,text,text,text,text,text,jsonb) to service_role;

commit;

-- C-03: support Supabase server-side API keys that do not populate legacy JWT role claims.
-- Security remains enforced by EXECUTE grants: CI release RPCs are callable only by service_role.
-- The signed GitHub OIDC identity is validated by the Edge handler before these RPCs are called.
begin;

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
  -- Do not depend on request.jwt.claim.role here: modern Supabase sb_secret API keys
  -- are not JWTs and therefore do not populate that legacy claim. The entry-point
  -- CI RPCs and this helper remain EXECUTE-restricted to service_role below.
  if p_confirmation is distinct from 'ENABLE-C03-PRODUCTION'
     or coalesce(p_workflow_run_id, '') !~ '^[0-9]+$'
     or coalesce(p_workflow_run_attempt, '') !~ '^[0-9]+$'
     or coalesce(p_workflow_sha, '') !~ '^[0-9a-f]{40}$' then
    raise exception 'Invalid guarded GitHub release identity or confirmation' using errcode = '42501';
  end if;
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
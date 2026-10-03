create or replace function public.get_admin_assessment_result_secure(
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_result public.assessment_results%rowtype;
begin
  perform public.require_admin_capability('reports.view');
  select * into v_result from public.assessment_results where session_id=p_session_id limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id',v_result.id,
    'session_id',v_result.session_id,
    'assessment_type_id',v_result.assessment_type_id,
    'assessment_version',v_result.assessment_version,
    'result_status',v_result.result_status,
    'calculated_at',v_result.calculated_at,
    'result',v_result.result
  );
end;
$$;

revoke execute on function public.get_admin_assessment_result_secure(uuid) from public,anon;
grant execute on function public.get_admin_assessment_result_secure(uuid) to authenticated;
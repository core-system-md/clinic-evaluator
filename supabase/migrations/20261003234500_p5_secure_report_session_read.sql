create or replace function public.get_admin_report_sessions_secure(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_rows jsonb;
begin
  perform public.require_admin_capability('reports.view');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',s.id,
        'status',s.status,
        'created_at',s.created_at,
        'completed_at',s.completed_at,
        'assessment_type_id',s.assessment_type_id
      )
      order by coalesce(s.completed_at,s.created_at) desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.sessions s
  where s.lead_id=p_lead_id;

  return v_rows;
end;
$$;

revoke all on function public.get_admin_report_sessions_secure(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_report_sessions_secure(uuid) to authenticated;
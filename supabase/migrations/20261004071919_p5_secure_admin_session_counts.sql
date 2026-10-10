create or replace function public.get_admin_assessment_session_counts_secure()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.require_admin_capability('assessment.edit');
  return coalesce((
    select jsonb_object_agg(x.assessment_type_id::text,x.session_count)
    from (
      select s.assessment_type_id,count(*)::integer as session_count
      from public.sessions s
      where s.assessment_type_id is not null
      group by s.assessment_type_id
    ) x
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.get_admin_assessment_session_counts_secure() from public,anon,authenticated;
grant execute on function public.get_admin_assessment_session_counts_secure() to authenticated;
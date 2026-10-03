create or replace function public.get_owner_admin_audit_secure(
  p_limit integer default 50,
  p_offset integer default 0,
  p_action text default null,
  p_actor_user_id uuid default null,
  p_family_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_rows jsonb;
  v_total integer;
begin
  perform public.require_owner();

  select count(*)::integer into v_total
  from public.admin_audit_log l
  where (p_action is null or l.action=p_action)
    and (p_actor_user_id is null or l.actor_user_id=p_actor_user_id)
    and (p_family_id is null or l.family_id=p_family_id)
    and (p_from is null or l.created_at>=p_from)
    and (p_to is null or l.created_at<p_to);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',l.id,
      'actor_user_id',l.actor_user_id,
      'actor_name',coalesce(a.display_name,case when a.role='owner' then 'المالك' else 'مساعد إداري' end,'غير معروف'),
      'actor_role',a.role,
      'action',l.action,
      'entity_type',l.entity_type,
      'entity_id',l.entity_id,
      'family_id',l.family_id,
      'family_slug',f.slug,
      'before_data',l.before_data,
      'after_data',l.after_data,
      'created_at',l.created_at,
      'correlation_id',l.correlation_id,
      'success',l.success,
      'failure_reason',l.failure_reason
    ) order by l.created_at desc
  ),'[]'::jsonb)
  into v_rows
  from public.admin_audit_log l
  left join public.admin_users a on a.user_id=l.actor_user_id
  left join public.assessment_families f on f.id=l.family_id
  where (p_action is null or l.action=p_action)
    and (p_actor_user_id is null or l.actor_user_id=p_actor_user_id)
    and (p_family_id is null or l.family_id=p_family_id)
    and (p_from is null or l.created_at>=p_from)
    and (p_to is null or l.created_at<p_to)
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,50),1),100);

  return jsonb_build_object('rows',v_rows,'total',v_total,'limit',least(greatest(coalesce(p_limit,50),1),100),'offset',greatest(coalesce(p_offset,0),0));
end;
$$;

revoke all on function public.get_owner_admin_audit_secure(integer,integer,text,uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.get_owner_admin_audit_secure(integer,integer,text,uuid,uuid,timestamptz,timestamptz) to authenticated;
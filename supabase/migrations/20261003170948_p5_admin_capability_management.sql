create or replace function public.grant_admin_capability_secure(p_user_id uuid,p_capability text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text;
begin
  perform public.require_admin_capability('admin.permissions');
  select role into v_role from public.admin_users where user_id=p_user_id and active=true;
  if not found or v_role<>'admin' then raise exception 'Target must be an active assistant account' using errcode='22023'; end if;
  if nullif(trim(p_capability),'') is null then raise exception 'Capability is required' using errcode='22023'; end if;
  insert into public.admin_capabilities(user_id,capability,granted_by)
  values(p_user_id,trim(p_capability),(select auth.uid()))
  on conflict(user_id,capability) do update set granted_by=excluded.granted_by,created_at=now();
  perform public.write_admin_audit('admin.capability_grant','admin_users',p_user_id,null,null,
    jsonb_build_object('capability',trim(p_capability)));
  return jsonb_build_object('success',true,'user_id',p_user_id,'capability',trim(p_capability));
end; $$;

create or replace function public.revoke_admin_capability_secure(p_user_id uuid,p_capability text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform public.require_admin_capability('admin.permissions');
  delete from public.admin_capabilities where user_id=p_user_id and capability=trim(p_capability);
  perform public.write_admin_audit('admin.capability_revoke','admin_users',p_user_id,null,
    jsonb_build_object('capability',trim(p_capability)),null);
  return jsonb_build_object('success',true,'user_id',p_user_id,'capability',trim(p_capability));
end; $$;

create or replace function public.set_admin_active_secure(p_user_id uuid,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_old boolean;
begin
  perform public.require_admin_capability('admin.manage');
  select role,active into v_role,v_old from public.admin_users where user_id=p_user_id for update;
  if not found then raise exception 'Admin account not found' using errcode='P0002'; end if;
  if v_role='owner' then raise exception 'Owner account cannot be changed through assistant management' using errcode='55000'; end if;
  update public.admin_users set active=p_active where user_id=p_user_id;
  perform public.write_admin_audit(case when p_active then 'admin.activate' else 'admin.deactivate' end,
    'admin_users',p_user_id,null,jsonb_build_object('active',v_old),jsonb_build_object('active',p_active));
  return jsonb_build_object('success',true,'active',p_active);
end; $$;

grant execute on function public.grant_admin_capability_secure(uuid,text) to authenticated;
grant execute on function public.revoke_admin_capability_secure(uuid,text) to authenticated;
grant execute on function public.set_admin_active_secure(uuid,boolean) to authenticated;
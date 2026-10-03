-- P5 verification fixes: owner-controlled assistant profiles and permissions
alter table public.admin_users
  add column if not exists display_name text;

create or replace function public.require_owner()
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.is_owner() then
    raise exception 'owner authorization required' using errcode='42501';
  end if;
end;
$$;

create or replace function public.register_admin_assistant_secure(
  p_user_id uuid,
  p_display_name text,
  p_capabilities text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_cap text;
  v_allowed constant text[] := array[
    'assessment.view','assessment.edit','assessment.import',
    'results.view','reports.view','reports.export',
    'access.view','access.manage'
  ];
begin
  perform public.require_owner();

  if p_user_id is null or p_user_id=(select auth.uid()) then
    raise exception 'Invalid assistant user' using errcode='22023';
  end if;

  if exists(select 1 from public.admin_users where user_id=p_user_id) then
    raise exception 'User is already registered in Admin' using errcode='23505';
  end if;

  if coalesce(trim(p_display_name),'')='' then
    raise exception 'Assistant display name is required' using errcode='22023';
  end if;

  foreach v_cap in array coalesce(p_capabilities,'{}') loop
    if not (v_cap = any(v_allowed)) then
      raise exception 'Capability is not delegable to assistants: %',v_cap using errcode='22023';
    end if;
  end loop;

  insert into public.admin_users(user_id,role,active,created_by,display_name)
  values(p_user_id,'admin',true,(select auth.uid()),trim(p_display_name));

  if coalesce(array_length(p_capabilities,1),0)>0 then
    insert into public.admin_capabilities(user_id,capability,granted_by)
    select p_user_id,trim(v_cap),(select auth.uid())
    from unnest(p_capabilities) v_cap;
  end if;

  perform public.write_admin_audit(
    'admin.assistant_create','admin_users',p_user_id,null,null,
    jsonb_build_object('display_name',trim(p_display_name),'capabilities',coalesce(p_capabilities,'{}'::text[]))
  );

  return jsonb_build_object(
    'success',true,'user_id',p_user_id,'display_name',trim(p_display_name),
    'capabilities',coalesce(p_capabilities,'{}'::text[])
  );
end;
$$;

create or replace function public.update_admin_assistant_profile_secure(
  p_user_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_old jsonb;
begin
  perform public.require_owner();
  if coalesce(trim(p_display_name),'')='' then
    raise exception 'Assistant display name is required' using errcode='22023';
  end if;

  select to_jsonb(a) into v_old
  from public.admin_users a
  where a.user_id=p_user_id and a.role='admin'
  for update;

  if not found then raise exception 'Assistant account not found' using errcode='P0002'; end if;

  update public.admin_users
  set display_name=trim(p_display_name)
  where user_id=p_user_id;

  perform public.write_admin_audit(
    'admin.assistant_rename','admin_users',p_user_id,null,v_old,
    (select to_jsonb(a) from public.admin_users a where a.user_id=p_user_id)
  );

  return jsonb_build_object('success',true,'user_id',p_user_id,'display_name',trim(p_display_name));
end;
$$;

create or replace function public.grant_admin_capability_secure(
  p_user_id uuid,
  p_capability text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_role text; v_allowed constant text[] := array[
  'assessment.view','assessment.edit','assessment.import',
  'results.view','reports.view','reports.export',
  'access.view','access.manage'
];
begin
  perform public.require_owner();

  if not (trim(p_capability)=any(v_allowed)) then
    raise exception 'Capability is not delegable to assistants: %',p_capability using errcode='22023';
  end if;

  select role into v_role from public.admin_users where user_id=p_user_id and active=true;
  if not found or v_role<>'admin' then
    raise exception 'Target must be an active assistant account' using errcode='22023';
  end if;

  insert into public.admin_capabilities(user_id,capability,granted_by)
  values(p_user_id,trim(p_capability),(select auth.uid()))
  on conflict(user_id,capability) do update
    set granted_by=excluded.granted_by,created_at=now();

  perform public.write_admin_audit(
    'admin.capability_grant','admin_users',p_user_id,null,null,
    jsonb_build_object('capability',trim(p_capability))
  );

  return jsonb_build_object('success',true,'user_id',p_user_id,'capability',trim(p_capability));
end;
$$;

create or replace function public.revoke_admin_capability_secure(
  p_user_id uuid,
  p_capability text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.require_owner();
  delete from public.admin_capabilities
  where user_id=p_user_id and capability=trim(p_capability);

  perform public.write_admin_audit(
    'admin.capability_revoke','admin_users',p_user_id,null,
    jsonb_build_object('capability',trim(p_capability)),null
  );

  return jsonb_build_object('success',true,'user_id',p_user_id,'capability',trim(p_capability));
end;
$$;

create or replace function public.set_admin_active_secure(
  p_user_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_role text; v_old boolean;
begin
  perform public.require_owner();
  select role,active into v_role,v_old
  from public.admin_users
  where user_id=p_user_id
  for update;

  if not found then raise exception 'Admin account not found' using errcode='P0002'; end if;
  if v_role='owner' then raise exception 'Owner account cannot be changed' using errcode='55000'; end if;

  update public.admin_users set active=p_active where user_id=p_user_id;

  perform public.write_admin_audit(
    case when p_active then 'admin.activate' else 'admin.deactivate' end,
    'admin_users',p_user_id,null,
    jsonb_build_object('active',v_old),
    jsonb_build_object('active',p_active)
  );

  return jsonb_build_object('success',true,'active',p_active);
end;
$$;

revoke execute on function public.require_owner() from public,anon,authenticated;
grant execute on function public.require_owner() to authenticated;

grant execute on function public.register_admin_assistant_secure(uuid,text,text[]) to authenticated;
grant execute on function public.update_admin_assistant_profile_secure(uuid,text) to authenticated;
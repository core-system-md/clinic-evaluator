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
  v_caps text[] := '{}';
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
    v_cap:=trim(v_cap);
    if v_cap='' then continue; end if;
    if not (v_cap = any(v_allowed)) then
      raise exception 'Capability is not delegable to assistants: %',v_cap using errcode='22023';
    end if;
    if not (v_cap = any(v_caps)) then v_caps:=array_append(v_caps,v_cap); end if;
  end loop;

  insert into public.admin_users(user_id,role,active,created_by,display_name)
  values(p_user_id,'admin',true,(select auth.uid()),trim(p_display_name));

  if coalesce(array_length(v_caps,1),0)>0 then
    insert into public.admin_capabilities(user_id,capability,granted_by)
    select p_user_id,v_cap,(select auth.uid()) from unnest(v_caps) v_cap;
  end if;

  perform public.write_admin_audit(
    'admin.assistant_create','admin_users',p_user_id,null,null,
    jsonb_build_object('display_name',trim(p_display_name),'capabilities',v_caps)
  );

  return jsonb_build_object('success',true,'user_id',p_user_id,
    'display_name',trim(p_display_name),'capabilities',v_caps);
end;
$$;
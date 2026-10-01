-- Admin dashboard authorization hardening.
-- Requires the existing legacy admin RPC functions when present.
-- Safe on environments where those legacy functions have not yet been captured.

create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and active = true
      and role in ('owner', 'admin')
  ) then
    raise exception 'admin authorization required'
      using errcode = '42501';
  end if;
end;
$function$;

revoke execute on function public.require_admin() from public, anon, authenticated;

do $do$
declare
  r record;
  v_def text;
  v_pos integer;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
      and p.prosecdef = true
      and l.lanname = 'plpgsql'
      and p.proname in (
        'save_assessment_secure',
        'duplicate_assessment_secure',
        'toggle_assessment_auth_secure',
        'generate_assessment_user_secure',
        'update_assessment_status_secure',
        'save_axis_secure',
        'save_question_secure',
        'save_option_secure',
        'update_option_secure',
        'add_option_secure',
        'delete_option_secure',
        'check_assessment_leads_secure',
        'import_assessment_secure'
      )
  loop
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def, 'SECURITY DEFINER', 'SECURITY DEFINER SET search_path = public, pg_temp');
    if position('PERFORM public.require_admin();' in v_def) = 0 then
      v_pos := strpos(upper(v_def), 'BEGIN');
      if v_pos = 0 then
        raise exception 'Could not locate BEGIN in %', r.oid::regprocedure;
      end if;
      v_def := left(v_def, v_pos + 4) || E'\n  PERFORM public.require_admin();' || substr(v_def, v_pos + 5);
    end if;
    execute v_def;
    execute format('revoke execute on function %s from public, anon', r.oid::regprocedure);
    execute format('grant execute on function %s to authenticated', r.oid::regprocedure);
  end loop;
end
$do$;

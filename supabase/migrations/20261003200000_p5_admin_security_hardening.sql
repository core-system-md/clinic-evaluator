create index if not exists admin_audit_log_actor_idx on public.admin_audit_log(actor_user_id);
create index if not exists admin_audit_log_family_idx on public.admin_audit_log(family_id);
create index if not exists admin_capabilities_granted_by_idx on public.admin_capabilities(granted_by);

revoke execute on function public.grant_admin_capability_secure(uuid,text) from public,anon;
revoke execute on function public.revoke_admin_capability_secure(uuid,text) from public,anon;
revoke execute on function public.set_admin_active_secure(uuid,boolean) from public,anon;
revoke execute on function public.has_admin_capability(text) from public,anon;
revoke execute on function public.is_active_admin() from public,anon;
revoke execute on function public.is_owner() from public,anon;
revoke execute on function public.import_assessment_secure(jsonb) from public,anon;
revoke execute on function public.update_option_secure(uuid,text,integer) from public,anon,authenticated;
revoke execute on function public.update_option_secure(uuid,text,text,integer,boolean,integer) from public,anon,authenticated;
revoke execute on function public.save_option_secure(uuid,integer,integer,text,text,text,text,boolean,integer) from public,anon,authenticated;

grant execute on function public.grant_admin_capability_secure(uuid,text) to authenticated;
grant execute on function public.revoke_admin_capability_secure(uuid,text) to authenticated;
grant execute on function public.set_admin_active_secure(uuid,boolean) to authenticated;
grant execute on function public.has_admin_capability(text) to authenticated;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.import_assessment_secure(jsonb) to authenticated;
-- P5 security closure: assistant administration RPCs are authenticated owner operations.
-- CREATE OR REPLACE preserves prior function ACLs, so explicitly revoke any stale anonymous execute grant.
revoke execute on function public.register_admin_assistant_secure(uuid,text,text[]) from public, anon;
grant execute on function public.register_admin_assistant_secure(uuid,text,text[]) to authenticated;

revoke execute on function public.update_admin_assistant_profile_secure(uuid,text) from public, anon;
grant execute on function public.update_admin_assistant_profile_secure(uuid,text) to authenticated;

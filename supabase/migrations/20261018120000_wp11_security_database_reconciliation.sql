-- WP-11: bounded least-privilege correction for admin tables and identity probes.
-- This migration changes current object grants and policy callers only. It deliberately
-- does not alter schema-wide default privileges; that broader security boundary remains
-- a separately documented owner-decision item.
begin;

do $wp11_preflight$
declare
  v_missing text;
  v_expected_count integer;
begin
  if to_regprocedure('public.is_active_admin()') is null
     or to_regprocedure('public.is_owner()') is null
     or to_regprocedure('public.is_active_admin(uuid)') is null
     or to_regprocedure('public.is_owner(uuid)') is null then
    raise exception 'WP-11 preflight failed: expected admin identity helper signatures are missing';
  end if;

  if to_regclass('public.admin_audit_log') is null
     or to_regclass('public.admin_capabilities') is null
     or to_regclass('public.admin_users') is null then
    raise exception 'WP-11 preflight failed: an expected admin table is missing';
  end if;

  with expected(tablename, policyname) as (
    values
      ('admin_users','admin_users_delete_owner_admins'),
      ('admin_users','admin_users_insert_owner'),
      ('admin_users','admin_users_select_self_or_admin'),
      ('admin_users','admin_users_update_owner'),
      ('admin_users','p0_admin_select_admin_users'),
      ('answers','p0_admin_select_answers'),
      ('assessment_settings','p0_admin_select_assessment_settings'),
      ('assessment_types','p0_admin_select_assessment_types'),
      ('axes','p0_admin_select_axes'),
      ('leads','p0_admin_select_leads'),
      ('options','p0_admin_select_options'),
      ('questions','p0_admin_select_questions'),
      ('scores','p0_admin_select_scores')
  )
  select count(*) into v_expected_count
  from expected e
  join pg_policies p
    on p.schemaname = 'public'
   and p.tablename = e.tablename
   and p.policyname = e.policyname;

  if v_expected_count <> 13 then
    raise exception 'WP-11 preflight failed: expected 13 known admin identity policies, found %', v_expected_count;
  end if;
end;
$wp11_preflight$;

-- D-08: these tables are SELECT-only for authenticated clients. Mutation remains
-- behind guarded RPCs; the service_role privileges are intentionally unchanged.
revoke maintain, references, trigger, truncate
  on table public.admin_audit_log, public.admin_capabilities
  from authenticated;

-- D-15: policies use zero-argument helpers that resolve the current auth.uid()
-- internally. Never pass an arbitrary UUID to these identity-check functions from
-- a policy; direct authenticated EXECUTE on the UUID overloads is revoked below.
drop policy admin_users_delete_owner_admins on public.admin_users;
create policy admin_users_delete_owner_admins
  on public.admin_users for delete to authenticated
  using (role = 'admin'::text and public.is_owner());

drop policy admin_users_insert_owner on public.admin_users;
create policy admin_users_insert_owner
  on public.admin_users for insert to authenticated
  with check (role = 'admin'::text and public.is_owner());

drop policy admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or public.is_active_admin());

drop policy admin_users_update_owner on public.admin_users;
create policy admin_users_update_owner
  on public.admin_users for update to authenticated
  using (public.is_owner())
  with check (
    role = 'admin'::text
    and user_id <> (select auth.uid())
    and public.is_owner()
  );

drop policy p0_admin_select_admin_users on public.admin_users;
create policy p0_admin_select_admin_users
  on public.admin_users for select to authenticated
  using (public.is_active_admin());

do $wp11_rebind_policies$
declare
  t text;
begin
  foreach t in array array[
    'assessment_settings','assessment_types','axes','questions',
    'options','leads','scores','answers'
  ] loop
    execute format('drop policy p0_admin_select_%I on public.%I', t, t);
    execute format(
      'create policy p0_admin_select_%I on public.%I for select to authenticated using (public.is_active_admin())',
      t, t
    );
  end loop;
end;
$wp11_rebind_policies$;

revoke all on function public.is_active_admin(uuid) from public, anon, authenticated;
revoke all on function public.is_owner(uuid) from public, anon, authenticated;

commit;

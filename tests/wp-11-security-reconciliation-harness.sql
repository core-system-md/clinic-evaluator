\set ON_ERROR_STOP on

-- Disposable PostgreSQL fixture for WP-11 security/database reconciliation.
-- This does not connect to or mutate Supabase Production.

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'create role anon nologin';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'create role authenticated nologin';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'create role service_role nologin bypassrls';
  end if;
end;
$roles$;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $uid$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$uid$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.admin_users (
  user_id uuid primary key,
  role text not null,
  active boolean not null default true
);
create table public.admin_audit_log (id integer primary key);
create table public.admin_capabilities (user_id uuid not null, capability text not null);
create table public.answers (id integer primary key);
create table public.assessment_settings (id integer primary key);
create table public.assessment_types (id integer primary key);
create table public.axes (id integer primary key);
create table public.leads (id integer primary key);
create table public.options (id integer primary key);
create table public.questions (id integer primary key);
create table public.scores (id integer primary key);

create or replace function public.is_active_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true and role in ('owner','admin')
  );
$fn$;

create or replace function public.is_owner()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true and role = 'owner'
  );
$fn$;

create or replace function public.is_active_admin(p_user_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.admin_users
    where user_id = p_user_id
      and active = true and role in ('owner','admin')
  );
$fn$;

create or replace function public.is_owner(p_user_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.admin_users
    where user_id = p_user_id
      and active = true and role = 'owner'
  );
$fn$;

revoke all on function public.is_active_admin() from public, anon;
revoke all on function public.is_owner() from public, anon;
revoke all on function public.is_active_admin(uuid) from public, anon;
revoke all on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_active_admin() to authenticated, service_role;
grant execute on function public.is_owner() to authenticated, service_role;
grant execute on function public.is_active_admin(uuid) to authenticated, service_role;
grant execute on function public.is_owner(uuid) to authenticated, service_role;

alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_capabilities enable row level security;
alter table public.answers enable row level security;
alter table public.assessment_settings enable row level security;
alter table public.assessment_types enable row level security;
alter table public.axes enable row level security;
alter table public.leads enable row level security;
alter table public.options enable row level security;
alter table public.questions enable row level security;
alter table public.scores enable row level security;

grant select on public.admin_users, public.answers, public.assessment_settings,
  public.assessment_types, public.axes, public.leads, public.options,
  public.questions, public.scores to authenticated;
grant select on public.admin_audit_log, public.admin_capabilities to authenticated;
grant all privileges on public.admin_audit_log, public.admin_capabilities to service_role;

-- Reproduce the observed excess authenticated privileges from Production.
grant maintain, references, trigger, truncate
  on table public.admin_audit_log, public.admin_capabilities to authenticated;

create policy owner_audit_read
  on public.admin_audit_log for select to authenticated using (public.is_owner());
create policy admin_capabilities_self_read
  on public.admin_capabilities for select to authenticated
  using (user_id = (select auth.uid()) or public.is_owner());

create policy admin_users_delete_owner_admins on public.admin_users for delete to authenticated
  using (role = 'admin'::text and public.is_owner((select auth.uid())));
create policy admin_users_insert_owner on public.admin_users for insert to authenticated
  with check (role = 'admin'::text and public.is_owner((select auth.uid())));
create policy admin_users_select_self_or_admin on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or public.is_active_admin((select auth.uid())));
create policy admin_users_update_owner on public.admin_users for update to authenticated
  using (public.is_owner((select auth.uid())))
  with check (role = 'admin'::text and user_id <> (select auth.uid()) and public.is_owner((select auth.uid())));
create policy p0_admin_select_admin_users on public.admin_users for select to authenticated
  using (public.is_active_admin((select auth.uid())));

do $initial_p0_policies$
declare t text;
begin
  foreach t in array array[
    'assessment_settings','assessment_types','axes','questions',
    'options','leads','scores','answers'
  ] loop
    execute format(
      'create policy p0_admin_select_%I on public.%I for select to authenticated using (public.is_active_admin((select auth.uid())))',
      t,t
    );
  end loop;
end;
$initial_p0_policies$;

insert into public.admin_users(user_id, role, active) values
  ('11111111-1111-4111-8111-111111111111', 'owner', true),
  ('22222222-2222-4222-8222-222222222222', 'admin', true),
  ('33333333-3333-4333-8333-333333333333', 'staff', true);

-- Seed one visible row into each representative admin-read surface so the
-- subsequent owner-vs-staff assertions verify RLS filters, not empty-table counts.
insert into public.answers(id) values (1);
insert into public.assessment_settings(id) values (1);
insert into public.assessment_types(id) values (1);
insert into public.axes(id) values (1);
insert into public.leads(id) values (1);
insert into public.options(id) values (1);
insert into public.questions(id) values (1);
insert into public.scores(id) values (1);

\echo 'Apply the WP-11 forward-only migration in disposable PostgreSQL'
\i supabase/migrations/20261018120000_wp11_security_database_reconciliation.sql

do $assert_grants$
begin
  if has_table_privilege('authenticated', 'public.admin_audit_log', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.admin_audit_log', 'TRIGGER')
     or has_table_privilege('authenticated', 'public.admin_audit_log', 'REFERENCES')
     or has_table_privilege('authenticated', 'public.admin_audit_log', 'MAINTAIN')
     or has_table_privilege('authenticated', 'public.admin_capabilities', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.admin_capabilities', 'TRIGGER')
     or has_table_privilege('authenticated', 'public.admin_capabilities', 'REFERENCES')
     or has_table_privilege('authenticated', 'public.admin_capabilities', 'MAINTAIN') then
    raise exception 'authenticated retains a forbidden admin-table privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.admin_audit_log', 'SELECT')
     or not has_table_privilege('authenticated', 'public.admin_capabilities', 'SELECT') then
    raise exception 'the approved authenticated SELECT privileges were not preserved';
  end if;

  if not has_table_privilege('service_role', 'public.admin_audit_log', 'INSERT')
     or not has_table_privilege('service_role', 'public.admin_capabilities', 'INSERT') then
    raise exception 'service_role write privileges were unexpectedly changed';
  end if;

  if has_function_privilege('authenticated', 'public.is_active_admin(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_active_admin(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.is_owner(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_owner(uuid)', 'EXECUTE') then
    raise exception 'authenticated/anon can still execute a UUID-parameterized identity probe';
  end if;

  if not has_function_privilege('authenticated', 'public.is_active_admin()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.is_owner()', 'EXECUTE') then
    raise exception 'the current-user identity helpers lost their authenticated EXECUTE grant';
  end if;

  if not has_function_privilege('service_role', 'public.is_active_admin(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.is_owner(uuid)', 'EXECUTE') then
    raise exception 'service_role helper privileges were unexpectedly changed';
  end if;

  if (select count(*) from pg_policies
      where schemaname = 'public'
        and (
          (tablename = 'admin_users' and policyname in (
            'admin_users_delete_owner_admins','admin_users_insert_owner',
            'admin_users_select_self_or_admin','admin_users_update_owner',
            'p0_admin_select_admin_users'
          ))
          or (tablename in ('assessment_settings','assessment_types','axes','questions','options','leads','scores','answers')
              and policyname = 'p0_admin_select_' || tablename)
        )
        and (
          coalesce(qual,'') ~ 'is_active_admin[(][^)]'
          or coalesce(qual,'') ~ 'is_owner[(][^)]'
          or coalesce(with_check,'') ~ 'is_active_admin[(][^)]'
          or coalesce(with_check,'') ~ 'is_owner[(][^)]'
        )
     ) <> 0 then
    raise exception 'an affected RLS policy still passes an explicit identity argument';
  end if;
end;
$assert_grants$;

-- The current-user RLS boundary still works: owner sees all admin rows,
-- a non-admin staff user sees only their own row.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set role authenticated;
select count(*) as wp11_owner_visible_rows from public.admin_users \gset
reset role;
select 1 / ((:wp11_owner_visible_rows = 3)::int) as owner_rls_scope_ok;

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set role authenticated;
select count(*) as wp11_owner_answers from public.answers \gset
select count(*) as wp11_owner_assessment_settings from public.assessment_settings \gset
select count(*) as wp11_owner_assessment_types from public.assessment_types \gset
select count(*) as wp11_owner_axes from public.axes \gset
select count(*) as wp11_owner_leads from public.leads \gset
select count(*) as wp11_owner_options from public.options \gset
select count(*) as wp11_owner_questions from public.questions \gset
select count(*) as wp11_owner_scores from public.scores \gset
reset role;
select 1 / ((:wp11_owner_answers = 1)::int) as owner_answers_visible_ok;
select 1 / ((:wp11_owner_assessment_settings = 1)::int) as owner_assessment_settings_visible_ok;
select 1 / ((:wp11_owner_assessment_types = 1)::int) as owner_assessment_types_visible_ok;
select 1 / ((:wp11_owner_axes = 1)::int) as owner_axes_visible_ok;
select 1 / ((:wp11_owner_leads = 1)::int) as owner_leads_visible_ok;
select 1 / ((:wp11_owner_options = 1)::int) as owner_options_visible_ok;
select 1 / ((:wp11_owner_questions = 1)::int) as owner_questions_visible_ok;
select 1 / ((:wp11_owner_scores = 1)::int) as owner_scores_visible_ok;

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
set role authenticated;
select count(*) as wp11_staff_answers from public.answers \gset
select count(*) as wp11_staff_assessment_settings from public.assessment_settings \gset
select count(*) as wp11_staff_assessment_types from public.assessment_types \gset
select count(*) as wp11_staff_axes from public.axes \gset
select count(*) as wp11_staff_leads from public.leads \gset
select count(*) as wp11_staff_options from public.options \gset
select count(*) as wp11_staff_questions from public.questions \gset
select count(*) as wp11_staff_scores from public.scores \gset
reset role;
select 1 / ((:wp11_staff_answers = 0)::int) as staff_answers_hidden_ok;
select 1 / ((:wp11_staff_assessment_settings = 0)::int) as staff_assessment_settings_hidden_ok;
select 1 / ((:wp11_staff_assessment_types = 0)::int) as staff_assessment_types_hidden_ok;
select 1 / ((:wp11_staff_axes = 0)::int) as staff_axes_hidden_ok;
select 1 / ((:wp11_staff_leads = 0)::int) as staff_leads_hidden_ok;
select 1 / ((:wp11_staff_options = 0)::int) as staff_options_hidden_ok;
select 1 / ((:wp11_staff_questions = 0)::int) as staff_questions_hidden_ok;
select 1 / ((:wp11_staff_scores = 0)::int) as staff_scores_hidden_ok;

-- Assert the two direct UUID probes fail at the PostgreSQL EXECUTE boundary.
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
do $identity_probe_rejected$
begin
  begin
    perform public.is_owner('11111111-1111-4111-8111-111111111111'::uuid);
    raise exception 'authenticated UUID owner probe unexpectedly executed';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.is_active_admin('22222222-2222-4222-8222-222222222222'::uuid);
    raise exception 'authenticated UUID admin probe unexpectedly executed';
  exception when insufficient_privilege then
    null;
  end;
end;
$identity_probe_rejected$;
reset role;

\echo 'WP-11 scoped privilege and identity-boundary checks passed'

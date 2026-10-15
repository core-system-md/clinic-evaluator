-- Disposable PostgreSQL harness for the C-03 migration.
-- Only minimal schema/API stubs are created; never run against a production database.
\set ON_ERROR_STOP on

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
'select ''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa''::uuid';
create or replace function auth.role() returns text language sql stable as
'select current_setting(''request.jwt.claim.role'', true)';

-- Mirror the live Supabase schema shape for the C-03 migration's direct dependencies.
create table public.assessment_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  current_published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create table public.assessment_types (
  id uuid primary key,
  slug text not null unique,
  title_ar text not null,
  title_en text,
  description text,
  question_count integer not null default 0,
  axis_count integer not null default 0,
  has_traps boolean default false,
  has_ev_simulator boolean default false,
  config_version integer default 1,
  is_active boolean default true,
  created_at timestamptz default now(),
  status varchar default 'published' check (status in ('draft', 'published', 'archived')),
  version integer default 1,
  updated_at timestamptz default now(),
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id),
  parent_id uuid references public.assessment_types(id),
  kpi_mappings jsonb,
  ev_mappings jsonb,
  axis_roles jsonb,
  family_id uuid not null references public.assessment_families(id),
  unique (family_id, version)
);
create unique index assessment_types_one_published_per_family_uidx
  on public.assessment_types(family_id) where status = 'published';
alter table public.assessment_families
  add constraint assessment_families_current_published_version_fkey
  foreign key (current_published_version_id) references public.assessment_types(id);

create table public.assessment_settings (
  assessment_key text primary key,
  auth_enabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.assessment_settings(assessment_key,auth_enabled)
values ('c03-fixture-family',true);

create table public.axes (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  code varchar not null,
  title varchar not null,
  title_ar varchar,
  description text,
  weight numeric not null default 0.00,
  display_order integer not null default 0,
  status varchar default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.questions (
  id uuid primary key,
  axis_id uuid not null references public.axes(id),
  assessment_type_id uuid not null references public.assessment_types(id),
  code varchar not null,
  question_text text not null,
  question_text_ar text,
  question_type varchar default 'likert',
  display_order integer not null default 0,
  is_required boolean default true,
  trap_index integer,
  status varchar default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  impact text default 'medium',
  layer text default 'A',
  trap_for jsonb default '[]'::jsonb
);
create table public.options (
  id uuid primary key,
  question_id uuid not null references public.questions(id),
  option_index integer not null,
  option_value integer not null,
  label varchar not null,
  label_ar varchar,
  display_text text,
  display_text_ar text,
  is_trap boolean default false,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  unique (question_id, option_index)
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id),
  role text not null default 'admin' check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  display_name text
);
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  family_id uuid references public.assessment_families(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  success boolean not null default true,
  failure_reason text
);

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid()) and active = true and role = 'owner'
  )
$$;
create or replace function public.has_admin_capability(p_capability text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_owner()
$$;
create or replace function public.require_admin_capability(p_capability text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.has_admin_capability(p_capability) then
    raise exception 'admin capability required: %', p_capability using errcode = '42501';
  end if;
end
$$;
create or replace function public.write_admin_audit(
  p_action text, p_entity_type text, p_entity_id uuid, p_family_id uuid,
  p_before jsonb default null, p_after jsonb default null,
  p_success boolean default true, p_failure_reason text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $audit$
declare v_id uuid;
begin
  insert into public.admin_audit_log(
    actor_user_id, action, entity_type, entity_id, family_id,
    before_data, after_data, success, failure_reason
  ) values (
    (select auth.uid()), p_action, p_entity_type, p_entity_id, p_family_id,
    p_before, p_after, p_success, p_failure_reason
  ) returning id into v_id;
  return v_id;
end
$audit$;

insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.admin_users(user_id, role, active)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner', true);
insert into public.assessment_families(id, slug, created_by)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'c03-fixture-family',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.assessment_types(
  id, slug, title_ar, family_id, version, status, question_count, axis_count
)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c03-fixture-v1', 'C03 fixture',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'draft', 1, 1);
insert into public.axes(id, assessment_type_id, code, title, weight)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'AX1', 'Axis 1', 100);
insert into public.questions(id, assessment_type_id, axis_id, code, question_text, display_order, is_required)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Q1', 'Question 1', 1, true);
insert into public.options(id, question_id, option_index, option_value, label, display_order)
values ('ffffffff-ffff-4fff-8fff-ffffffffffff',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 0, 0, 'Option 0', 1),
       ('11111111-1111-4111-8111-111111111111',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, 1, 'Option 1', 2);

create table public.traps (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  name text not null,
  message text,
  message_ar text,
  question_id uuid references public.questions(id),
  validates jsonb,
  target_axis text,
  penalty_base numeric,
  penalty_max numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.traps(
  id,assessment_type_id,name,message,message_ar,question_id,validates,target_axis,penalty_base,penalty_max
) values (
  '22222222-2222-4222-8222-222222222222',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'fixture-trap','Fixture trap','فخ اختبار',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '{"mode":"fixture"}'::jsonb,'AX1',1,5
);

\ir ../supabase/migrations/20261015130000_c03_full_configuration_release_digest.sql


do $test$
declare
  v_result jsonb;
  v_rejected boolean := false;
  v_registry_digest text := repeat('a',64);
  v_config_digest text;
  v_config_digest_after text;
  v_trap_digest_after text;
  v_settings_digest_after text;
  v_source_commit_sha text := repeat('b',40);
  v_edge_release_ref text := 'assessment-access-c03-registry-attestation-v1';
  v_option_manifest jsonb;
  v_first_release_id uuid;
  v_second_release_id uuid;
  v_release_count integer;
begin
  v_config_digest := public.assessment_configuration_digest('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  v_config_digest_after := public.assessment_configuration_digest('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if v_config_digest !~ '^[0-9a-f]{64}$' or v_config_digest <> v_config_digest_after then
    raise exception 'Full configuration digest is not deterministic';
  end if;

  select jsonb_agg(jsonb_build_object(
    'question_code',q.code,'option_id',o.id,'option_index',o.option_index,
    'source_option_value',o.option_value
  ) order by q.display_order,q.id,o.display_order,o.id)
  into v_option_manifest
  from public.questions q join public.options o on o.question_id=q.id
  where q.assessment_type_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  begin
    perform public.register_assessment_interpretation_release_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,v_registry_digest,v_config_digest,
      'c03-assessment-config-canonicalizer-v1',v_source_commit_sha,v_edge_release_ref,
      jsonb_build_array(v_option_manifest->0)
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Incomplete option manifest was accepted'; end if;

  v_result := public.register_assessment_interpretation_release_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,v_registry_digest,v_config_digest,
    'c03-assessment-config-canonicalizer-v1',v_source_commit_sha,v_edge_release_ref,v_option_manifest
  );
  if coalesce((v_result->>'success')::boolean,false) is not true then
    raise exception 'Full configuration release registration failed: %',v_result;
  end if;
  v_first_release_id := (v_result->>'release_id')::uuid;
  if (select state from public.assessment_interpretation_releases where id=v_first_release_id) <> 'PREPARED' then
    raise exception 'New release did not enter PREPARED state';
  end if;

  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,true) is not false then
    raise exception 'Publication validator accepted a release before runtime attestation: %',v_result;
  end if;

  perform set_config('request.jwt.claim.role','authenticated',true);
  v_rejected := false;
  begin
    perform public.mark_assessment_interpretation_release_runtime_verified_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',v_registry_digest,v_config_digest,
      v_edge_release_ref,v_source_commit_sha
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Authenticated client was allowed to attest runtime release'; end if;

  perform set_config('request.jwt.claim.role','service_role',true);
  v_rejected := false;
  begin
    perform public.mark_assessment_interpretation_release_runtime_verified_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',v_registry_digest,repeat('c',64),
      v_edge_release_ref,v_source_commit_sha
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Mismatched configuration digest was accepted'; end if;

  v_result := public.mark_assessment_interpretation_release_runtime_verified_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',v_registry_digest,v_config_digest,
    v_edge_release_ref,v_source_commit_sha
  );
  if coalesce((v_result->>'success')::boolean,false) is not true then
    raise exception 'Runtime attestation failed: %',v_result;
  end if;

  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,false) is not true then
    raise exception 'Validator rejected fully attested release: %',v_result;
  end if;
  if (select state from public.assessment_interpretation_releases where id=v_first_release_id) <> 'VERIFIED' then
    raise exception 'Successful runtime attestation did not transition release to VERIFIED';
  end if;

  v_result := public.register_assessment_interpretation_release_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,v_registry_digest,v_config_digest,
    'c03-assessment-config-canonicalizer-v1',v_source_commit_sha,v_edge_release_ref,v_option_manifest
  );
  v_second_release_id := (v_result->>'release_id')::uuid;
  select count(*) into v_release_count from public.assessment_interpretation_releases
   where assessment_type_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if v_release_count <> 2 or (select is_current from public.assessment_interpretation_releases where id=v_first_release_id) then
    raise exception 'Re-registration did not preserve history and switch the current release';
  end if;
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,true) is not false then
    raise exception 'New PREPARED release bypassed the runtime verification gate';
  end if;

  v_result := public.mark_assessment_interpretation_release_runtime_verified_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',v_registry_digest,v_config_digest,
    v_edge_release_ref,v_source_commit_sha
  );
  if coalesce((v_result->>'success')::boolean,false) is not true then
    raise exception 'Runtime attestation of second release failed: %',v_result;
  end if;

  v_result := public.restore_assessment_interpretation_release_secure(v_first_release_id);
  if coalesce((v_result->>'success')::boolean,false) is not true then
    raise exception 'Historical release rollback selection failed: %',v_result;
  end if;
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,true) is not false then
    raise exception 'Rollback retained stale runtime attestation';
  end if;
  v_result := public.mark_assessment_interpretation_release_runtime_verified_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',v_registry_digest,v_config_digest,
    v_edge_release_ref,v_source_commit_sha
  );
  if coalesce((v_result->>'success')::boolean,false) is not true then
    raise exception 'Runtime re-attestation after rollback failed: %',v_result;
  end if;
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,false) is not true then
    raise exception 'Validator rejected rolled-back and re-attested release: %',v_result;
  end if;

  update public.assessment_types set status='published'
   where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if (select state from public.assessment_interpretation_releases where id=v_first_release_id) <> 'PUBLISHED' then
    raise exception 'Publication transition did not advance the release state to PUBLISHED';
  end if;

  update public.questions set question_text='changed after release'
   where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_config_digest_after := public.assessment_configuration_digest('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if v_config_digest_after = v_config_digest then
    raise exception 'Full configuration digest did not change after question content mutation';
  end if;
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean,true) is not false then
    raise exception 'Validator accepted post-release configuration drift: %',v_result;
  end if;

  update public.traps set penalty_max=6
   where id='22222222-2222-4222-8222-222222222222';
  v_trap_digest_after := public.assessment_configuration_digest('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if v_trap_digest_after = v_config_digest_after then
    raise exception 'Full configuration digest did not change after trap configuration mutation';
  end if;

  update public.assessment_settings set auth_enabled=false
   where assessment_key='c03-fixture-family';
  v_settings_digest_after := public.assessment_configuration_digest('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if v_settings_digest_after = v_trap_digest_after then
    raise exception 'Full configuration digest did not change after access-policy mutation';
  end if;
end
$test$;

do $audit_assert$
begin
  if not exists (
    select 1 from public.admin_audit_log
     where action='assessment.interpretation_release.register'
       and entity_type='assessment_interpretation_releases'
       and success=true
  ) then raise exception 'C-03 release registration audit row missing'; end if;
end
$audit_assert$;

-- Disposable PostgreSQL harness for the C-03 migration.
-- Only minimal schema/API stubs are created; never run against a production database.
\set ON_ERROR_STOP on
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

create table public.assessment_families (
  id uuid primary key,
  current_published_version_id uuid,
  updated_at timestamptz default now()
);
create table public.assessment_types (
  id uuid primary key,
  family_id uuid not null references public.assessment_families(id),
  version integer not null,
  status text not null,
  question_count integer not null,
  axis_count integer not null,
  is_active boolean default false,
  published_at timestamptz,
  archived_at timestamptz,
  updated_at timestamptz default now()
);
create table public.axes (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  weight numeric not null
);
create table public.questions (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  axis_id uuid,
  code text not null,
  is_required boolean not null default true
);
create table public.options (
  id uuid primary key,
  question_id uuid not null references public.questions(id),
  option_index integer not null,
  option_value integer not null
);

create or replace function public.is_owner() returns boolean language sql stable as $$ select true $$;
create or replace function public.require_admin_capability(text) returns void language plpgsql as $$ begin return; end $$;
create or replace function public.write_admin_audit(text, text, uuid, uuid, jsonb, jsonb)
returns void language plpgsql as $$ begin return; end $$;

insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.assessment_families(id) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.assessment_types(id, family_id, version, status, question_count, axis_count)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'draft', 1, 1);
insert into public.axes(id, assessment_type_id, weight)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 100);
insert into public.questions(id, assessment_type_id, axis_id, code, is_required)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Q1', true);
insert into public.options(id, question_id, option_index, option_value)
values ('ffffffff-ffff-4fff-8fff-ffffffffffff',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 0, 0),
       ('11111111-1111-4111-8111-111111111111',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, 1);

\ir ../supabase/migrations/20261014120000_c03_interpretation_release_publication_gate.sql

do $test$
declare
  v_result jsonb;
  v_rejected boolean := false;
begin
  begin
    perform public.register_assessment_interpretation_release_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, repeat('a',64), repeat('b',40),
      'edge-v-test',
      '[{"question_code":"Q1","option_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","option_index":0,"source_option_value":0}]'::jsonb
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Incomplete option manifest was accepted'; end if;

  v_result := public.register_assessment_interpretation_release_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, repeat('a',64), repeat('b',40),
    'edge-v-test',
    '[{"question_code":"Q1","option_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","option_index":0,"source_option_value":0},{"question_code":"Q1","option_id":"11111111-1111-4111-8111-111111111111","option_index":1,"source_option_value":1}]'::jsonb
  );
  if coalesce((v_result->>'success')::boolean, false) is not true then
    raise exception 'Valid manifest registration failed: %', v_result;
  end if;

  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean, true) is not false then
    raise exception 'Publication validator accepted a release before runtime attestation: %', v_result;
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  v_rejected := false;
  begin
    perform public.mark_assessment_interpretation_release_runtime_verified_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('a',64), 'edge-v-test'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Authenticated client was allowed to attest runtime release'; end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_rejected := false;
  begin
    perform public.mark_assessment_interpretation_release_runtime_verified_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('c',64), 'edge-v-test'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Runtime attestation accepted a mismatched digest'; end if;

  v_rejected := false;
  begin
    perform public.mark_assessment_interpretation_release_runtime_verified_secure(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('a',64), 'wrong-edge-ref'
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'Runtime attestation accepted a mismatched Edge release reference'; end if;

  v_result := public.mark_assessment_interpretation_release_runtime_verified_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('a',64), 'edge-v-test'
  );
  if coalesce((v_result->>'success')::boolean, false) is not true then
    raise exception 'Runtime attestation failed: %', v_result;
  end if;

  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean, false) is not true then
    raise exception 'Validator rejected release after runtime attestation: %', v_result;
  end if;

  -- Re-registering a release must invalidate the previous runtime attestation.
  v_result := public.register_assessment_interpretation_release_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 1, repeat('a',64), repeat('b',40),
    'edge-v-test',
    '[{"question_code":"Q1","option_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","option_index":0,"source_option_value":0},{"question_code":"Q1","option_id":"11111111-1111-4111-8111-111111111111","option_index":1,"source_option_value":1}]'::jsonb
  );
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean, true) is not false then
    raise exception 'Re-registering a release retained stale runtime attestation: %', v_result;
  end if;
  v_result := public.mark_assessment_interpretation_release_runtime_verified_secure(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('a',64), 'edge-v-test'
  );

  update public.options set option_value = 99
   where id = '11111111-1111-4111-8111-111111111111';
  v_result := public.validate_assessment_version_secure('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  if coalesce((v_result->>'valid')::boolean, true) is not false then
    raise exception 'Validator accepted stale option identity after DB mutation: %', v_result;
  end if;
end
$test$;

select 'C-03 isolated migration harness passed' as result;

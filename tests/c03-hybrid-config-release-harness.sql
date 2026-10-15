-- Disposable PostgreSQL harness for C-03 hybrid configuration release gate.
-- Run from repository root with psql -v ON_ERROR_STOP=1 -f tests/c03-hybrid-config-release-harness.sql

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create table public.assessment_families (
  id uuid primary key,
  slug text not null unique,
  current_published_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.assessment_types (
  id uuid primary key,
  family_id uuid not null references public.assessment_families(id),
  slug text not null,
  title_ar text not null,
  title_en text,
  description text,
  question_count integer not null,
  axis_count integer not null,
  has_traps boolean,
  has_ev_simulator boolean,
  config_version integer,
  version integer,
  parent_id uuid,
  axis_roles jsonb,
  kpi_mappings jsonb,
  ev_mappings jsonb,
  status varchar,
  is_active boolean,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.axes (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  code varchar not null,
  title varchar not null,
  title_ar varchar,
  description text,
  weight numeric not null,
  display_order integer not null,
  status varchar,
  created_at timestamptz,
  updated_at timestamptz
);
create table public.questions (
  id uuid primary key,
  axis_id uuid not null references public.axes(id),
  assessment_type_id uuid not null references public.assessment_types(id),
  code varchar not null,
  question_text text not null,
  question_text_ar text,
  question_type varchar,
  display_order integer not null,
  is_required boolean,
  trap_index integer,
  status varchar,
  impact text,
  layer text,
  trap_for jsonb,
  created_at timestamptz,
  updated_at timestamptz
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
  is_trap boolean,
  display_order integer not null,
  created_at timestamptz
);
create table public.traps (
  id uuid primary key,
  assessment_type_id uuid not null references public.assessment_types(id),
  name text,
  question_id text,
  validates text,
  target_axis text,
  penalty_base numeric,
  penalty_max numeric,
  message text,
  message_ar text,
  created_at timestamptz
);
create table public.sessions (
  id uuid primary key,
  lead_id uuid,
  assessment_type_id uuid references public.assessment_types(id),
  assessment_user_id uuid,
  status text,
  submission_state text not null default 'draft',
  current_question integer,
  started_at timestamptz,
  last_activity_at timestamptz,
  assessment_version integer,
  scoring_engine_version text,
  attempt_key_hash text,
  usage_consumed_at timestamptz
);
create table public.assessment_users (
  id uuid primary key,
  active boolean,
  expires_at timestamptz,
  assessment_key text,
  used_count integer,
  max_uses integer
);
create table public.assessment_session_access (
  id uuid primary key,
  session_id uuid,
  assessment_user_id uuid,
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  assessment_type_id uuid
);
create table public.assessment_results (
  id uuid primary key,
  session_id uuid not null,
  assessment_type_id uuid not null,
  result jsonb not null
);

\i supabase/migrations/20261015110000_c03_hybrid_configuration_release_gate.sql

insert into public.assessment_families (id, slug) values
  ('10000000-0000-4000-8000-000000000001', 'fixture-family');
insert into public.assessment_types (
  id, family_id, slug, title_ar, title_en, description, question_count, axis_count,
  has_traps, has_ev_simulator, config_version, version, axis_roles, kpi_mappings,
  ev_mappings, status, is_active, published_at
) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   'fixture-assessment', 'تقييم', 'Assessment', 'fixture', 1, 1, false, false, 1, 1,
   '{"lead":"AX1"}', '{"KPI1":"AX1"}', '{}', 'published', true, now());
update public.assessment_families
set current_published_version_id = '20000000-0000-4000-8000-000000000001'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.axes (id, assessment_type_id, code, title, title_ar, description, weight, display_order, status)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'AX1', 'Axis', 'محور', 'fixture axis', 100, 1, 'active');
insert into public.questions (id, axis_id, assessment_type_id, code, question_text, question_text_ar, question_type, display_order, is_required, status, impact, layer, trap_for)
values ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Q1', 'Question', 'سؤال', 'single_choice', 1, true, 'active', 'high', 'L1', '[]');
insert into public.options (id, question_id, option_index, option_value, label, label_ar, display_text, display_text_ar, is_trap, display_order)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 0, 70, 'Seventy', 'سبعون', 'display', 'عرض', false, 1);

do $tests$
declare
  v_digest text;
  v_after_timestamp text;
  v_release_a uuid;
  v_release_b uuid;
  v_result jsonb;
  v_state text;
begin
  v_digest := public.c03_assessment_config_digest('20000000-0000-4000-8000-000000000001');
  if length(v_digest) <> 64 then raise exception 'Digest must be a SHA-256 hex string'; end if;

  update public.assessment_types set updated_at = now() + interval '1 hour'
  where id = '20000000-0000-4000-8000-000000000001';
  v_after_timestamp := public.c03_assessment_config_digest('20000000-0000-4000-8000-000000000001');
  if v_digest is distinct from v_after_timestamp then raise exception 'Audit timestamp must not affect config digest'; end if;

  v_release_a := public.c03_prepare_configuration_release(
    '20000000-0000-4000-8000-000000000001',
    repeat('a',40), v_digest, 'c03-config-v1', 2, repeat('b',64),
    'engine-v1', 'contract-v1', 'report-v1', 'migration-v1', 'fixtures-v1',
    '20000000-0000-4000-8000-000000000001'
  );
  v_result := public.c03_verify_configuration_release(v_release_a, 'c03-test-ci');
  if v_result->>'state' <> 'VERIFIED' then raise exception 'Initial release verification failed: %', v_result; end if;
  v_result := public.c03_publish_configuration_release(v_release_a, '20000000-0000-4000-8000-000000000001');
  if v_result->>'state' <> 'PUBLISHED' then raise exception 'Bootstrap release publication failed: %', v_result; end if;

  v_result := public.c03_resolve_active_configuration_release('20000000-0000-4000-8000-000000000001');
  if v_result->>'state' <> 'PUBLISHED' or v_result->>'config_digest' <> v_digest then
    raise exception 'Active release resolution failed: %', v_result;
  end if;

  insert into public.sessions (id, assessment_type_id, status, submission_state, assessment_version, assessment_release_id)
  values ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
          'in_progress', 'draft', 1, v_release_a);
  v_result := public.c03_assert_session_configuration_release('60000000-0000-4000-8000-000000000001');
  if v_result->>'state' <> 'PUBLISHED' then raise exception 'Pinned session assertion failed: %', v_result; end if;

  insert into public.assessment_results (id, session_id, assessment_type_id, result)
  values (
    '70000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    jsonb_build_object('provenance', jsonb_build_object(
      'configurationReleaseId', v_release_a::text,
      'configurationReleaseDigest', v_digest
    ))
  );

  insert into public.assessment_types (
    id, family_id, slug, title_ar, title_en, description, question_count, axis_count,
    has_traps, has_ev_simulator, config_version, version, parent_id, axis_roles,
    kpi_mappings, ev_mappings, status, is_active
  ) values (
    '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
    'fixture-assessment-v2', 'تقييم 2', 'Assessment 2', 'fixture v2', 1, 1,
    false, false, 2, 2, '20000000-0000-4000-8000-000000000001',
    '{"lead":"AX1"}', '{"KPI1":"AX1"}', '{}', 'draft', false
  );
  insert into public.axes (id, assessment_type_id, code, title, title_ar, description, weight, display_order, status)
  values ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'AX1', 'Axis', 'محور', 'fixture axis', 100, 1, 'active');
  insert into public.questions (id, axis_id, assessment_type_id, code, question_text, question_text_ar, question_type, display_order, is_required, status, impact, layer, trap_for)
  values ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Q1', 'Question', 'سؤال', 'single_choice', 1, true, 'active', 'high', 'L1', '[]');
  insert into public.options (id, question_id, option_index, option_value, label, label_ar, display_text, display_text_ar, is_trap, display_order)
  values ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 0, 70, 'Seventy', 'سبعون', 'display', 'عرض', false, 1);

  v_digest := public.c03_assessment_config_digest('20000000-0000-4000-8000-000000000002');
  v_release_b := public.c03_prepare_configuration_release(
    '20000000-0000-4000-8000-000000000002',
    repeat('c',40), v_digest, 'c03-config-v1', 2, repeat('d',64),
    'engine-v1', 'contract-v1', 'report-v1', 'migration-v1', 'fixtures-v1',
    '20000000-0000-4000-8000-000000000001'
  );
  v_result := public.c03_verify_configuration_release(v_release_b, 'c03-test-ci');
  if v_result->>'state' <> 'VERIFIED' then raise exception 'Second release verification failed: %', v_result; end if;
  v_result := public.c03_publish_configuration_release(v_release_b, '20000000-0000-4000-8000-000000000001');
  if v_result->>'state' <> 'PUBLISHED' then raise exception 'Second release publication failed: %', v_result; end if;

  v_result := public.c03_rollback_configuration_release(
    '10000000-0000-4000-8000-000000000001', v_release_a,
    '20000000-0000-4000-8000-000000000002'
  );
  if v_result->>'rolled_back_to' <> '20000000-0000-4000-8000-000000000001' then raise exception 'Rollback failed: %', v_result; end if;

  begin
    perform public.c03_rollback_configuration_release(
      '10000000-0000-4000-8000-000000000001', v_release_b,
      '20000000-0000-4000-8000-000000000002'
    );
    raise exception 'Expected stale-pointer rollback rejection';
  exception when sqlstate '40907' then null;
  end;

  update public.options set option_value = 71
  where id = '50000000-0000-4000-8000-000000000001';
  select state into v_state from public.assessment_configuration_releases where id = v_release_a;
  if v_state <> 'DEGRADED' then raise exception 'Config mutation must degrade its published release, got %', v_state; end if;

  begin
    perform public.c03_assert_session_configuration_release('60000000-0000-4000-8000-000000000001');
    raise exception 'Expected pinned-session drift rejection';
  exception when sqlstate '40906' then null;
  end;
end
$tests$;

select 'C-03 hybrid configuration release harness passed' as result;

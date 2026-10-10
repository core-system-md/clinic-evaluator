\set ON_ERROR_STOP on

create role anon;
create role authenticated;
create role service_role;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.assessment_types (
  id uuid primary key,
  slug text not null,
  version integer not null default 1,
  status text not null default 'draft'
);

create table public.assessment_users (
  id uuid primary key default gen_random_uuid(),
  assessment_key text not null,
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer not null default 1,
  used_count integer not null default 0
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  completed boolean not null default false,
  score_total integer,
  score_percentage numeric,
  completed_at timestamptz
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  assessment_type_id uuid not null,
  assessment_user_id uuid,
  status text not null default 'in_progress',
  current_question integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  assessment_version integer,
  scoring_engine_version text,
  interpretation_version integer,
  scoring_contract_version text,
  assessment_config_digest text,
  usage_consumed_at timestamptz,
  submission_state text not null default 'draft',
  submission_snapshot jsonb,
  submission_fingerprint text,
  submission_started_at timestamptz,
  last_activity_at timestamptz not null default now(),
  attempt_key_hash text,
  submission_economic_input jsonb
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null,
  code text not null,
  question_text text,
  question_text_ar text,
  question_type text,
  display_order integer,
  is_required boolean default true,
  impact text,
  layer text
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  option_index integer not null,
  option_value integer not null,
  label text,
  label_ar text,
  is_trap boolean default false,
  display_order integer
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  lead_id uuid,
  question_id text,
  axis_id text,
  question_text text,
  chosen_option_label text,
  option_index integer,
  option_value integer,
  answer_value integer,
  is_trap boolean default false,
  trap_triggered boolean default false,
  answered_at timestamptz default now()
);

create table public.assessment_session_access (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  assessment_user_id uuid not null,
  assessment_type_id uuid,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create unique index assessment_session_access_session_uidx
  on public.assessment_session_access(session_id)
  where session_id is not null;

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  lead_id uuid,
  axis_id text,
  axis_name_ar text,
  axis_name_en text,
  raw_score integer,
  max_possible integer,
  percentage numeric,
  weight numeric,
  weighted_score numeric,
  grade text
);

create table public.assessment_results (
  id uuid primary key,
  session_id uuid not null unique,
  assessment_type_id uuid not null,
  assessment_version integer not null,
  interpretation_version integer not null,
  scoring_engine_version text not null,
  scoring_contract_version text not null,
  assessment_config_digest text not null,
  calculated_at timestamptz not null,
  result_status text not null,
  result jsonb not null
);

\i supabase/migrations/20261003082558_20261003090000_p4_submission_foundation.sql
\i supabase/migrations/20261003082603_20261003093000_p4_submission_prepare_finalize.sql
\i supabase/migrations/20261003084304_20261003103000_p4_submission_context_lock.sql

insert into public.assessment_types(id,slug,version,status)
values('44444444-4444-4444-8444-444444444444','p4-protected-fixture',1,'draft');

insert into public.assessment_users(id,assessment_key,username,password_hash,active,expires_at,max_uses,used_count)
values('33333333-3333-4333-8333-333333333333','p4-protected-fixture','p4-fixture','fixture-password-hash',true,now()+interval '1 day',1,0);

insert into public.sessions(
  id,lead_id,assessment_type_id,assessment_user_id,status,submission_state,
  current_question,started_at,last_activity_at,assessment_version,scoring_engine_version
) values (
  '22222222-2222-4222-8222-222222222222',null,
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'in_progress','draft',0,now(),now(),1,'server-score-v1'
);

insert into public.assessment_session_access(
  id,session_id,assessment_user_id,assessment_type_id,token_hash,expires_at
) values (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  'p4-fixture-token-hash',now()+interval '1 day'
);

select public.prepare_assessment_submission(
  '22222222-2222-4222-8222-222222222222'::uuid,
  'p4-fixture-token-hash',
  '{}'::jsonb
);

do $test$
begin
  if not exists (
    select 1 from public.sessions
    where id='22222222-2222-4222-8222-222222222222'::uuid
      and submission_state='processing'
      and submission_snapshot='[]'::jsonb
      and submission_economic_input='{}'::jsonb
      and submission_fingerprint is not null
  ) then
    raise exception 'prepare did not freeze protected submission context';
  end if;
end $test$;

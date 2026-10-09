\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
\set ON_ERROR_STOP on

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.leads (
  id uuid primary key,
  completed boolean not null default false,
  score_total integer,
  score_percentage numeric,
  completed_at timestamptz
);

create table public.assessment_users (
  id uuid primary key,
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer not null default 1,
  used_count integer not null default 0
);

create table public.sessions (
  id uuid primary key,
  lead_id uuid,
  assessment_type_id uuid not null,
  assessment_user_id uuid,
  status text not null default 'in_progress',
  submission_state text not null default 'processing',
  submission_snapshot jsonb,
  submission_fingerprint text,
  assessment_version integer,
  interpretation_version integer,
  scoring_engine_version text,
  scoring_contract_version text,
  assessment_config_digest text,
  completed_at timestamptz,
  usage_consumed_at timestamptz,
  last_activity_at timestamptz default now()
);

create table public.assessment_session_access (
  id uuid primary key,
  session_id uuid,
  assessment_user_id uuid,
  token_hash text unique not null,
  assessment_type_id uuid,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz
);

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

\i supabase/migrations/20261008100000_structured_result_authority.sql

insert into public.leads(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

insert into public.assessment_users(id,active,expires_at,max_uses,used_count)
values ('33333333-3333-4333-8333-333333333333',true,now()+interval '1 day',1,0);

insert into public.sessions(
 id,lead_id,assessment_type_id,assessment_user_id,status,submission_state,
 submission_snapshot,submission_fingerprint,assessment_version
) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-999999999999',
  '33333333-3333-4333-8333-333333333333',
  'in_progress','processing','[]','fp-protected',1),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-999999999999',
  null,
  'in_progress','processing','[]','fp-public',1),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-999999999999',
  null,
  'in_progress','processing','[]','fp-tamper',1);

insert into public.assessment_session_access(
 id,session_id,assessment_user_id,assessment_type_id,token_hash,expires_at
) values
 ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '33333333-3333-4333-8333-333333333333',
  '99999999-9999-4999-8999-999999999999','token-protected',now()+interval '1 day'),
 ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  null,
  '99999999-9999-4999-8999-999999999999','token-public',now()+interval '1 day'),
 ('cccccccc-1111-4111-8111-cccccccccccc',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  null,
  '99999999-9999-4999-8999-999999999999','token-tamper',now()+interval '1 day');

create temporary table wp04_fixture(result jsonb);
insert into wp04_fixture values ($${
  "schemaVersion":"P3_STRUCTURED_RESULT_V1",
  "status":"PRODUCTION",
  "identity":{
    "sessionId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "assessmentFamilyId":"88888888-8888-4888-8888-888888888888",
    "assessmentTypeId":"99999999-9999-4999-8999-999999999999",
    "assessmentVersion":"1",
    "resultId":"44444444-4444-4444-8444-444444444444",
    "calculatedAt":"2026-10-08T00:00:00Z"
  },
  "provenance":{
    "engineIdentity":"MD_CODE_ASSESSMENT_ENGINE",
    "scoringEngineVersion":"MD_CODE_ASSESSMENT_ENGINE",
    "scoringContractVersion":"FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    "assessmentConfigDigest":"sha256:wp04",
    "interpretationVersion":"1",
    "inputLineage":["Q1:O1","Q2:O2"]
  },
  "inputs":{
    "responses":[{"questionCode":"Q1","optionId":"O1","optionIndex":0,"sourceOptionValue":0,"semanticStateKey":"LOW"}]
  },
  "measurement":{"profile":{"components":[],"overallComposite":null}},
  "scores":{
    "overallScore":70,
    "axes":[
      {"axisCode":"A1","axisNameAr":"A1","axisNameEn":"A1","score":80,"rawScore":80,"maxPossible":100,"percentage":80,"weight":0.5,"weightedScore":40,"status":"measured"},
      {"axisCode":"A2","axisNameAr":"A2","axisNameEn":"A2","score":60,"rawScore":60,"maxPossible":100,"percentage":60,"weight":0.5,"weightedScore":30,"status":"measured"}
    ]
  },
  "coverage":{"coverageRatio":1,"coverageStatus":"FULL"},
  "consistency":{"findings":[]},
  "criticality":{"status":"NORMAL","sourceItems":[],"reviewRequired":false},
  "development":{"signals":[]},
  "roles":[],
  "kpis":[],
  "economics":{"status":"NOT_COMPUTED","modelCode":null,"output":null},
  "classification":{"bandCode":"Q3","numericBasis":70,"bandDefinitionVersion":"P3_BANDS_V1","provenance":"test"},
  "diagnostics":{"findings":[]},
  "audit":{"replayableFrom":["pinned assessment version","stored answers","interpretation version:1","scoring contract:FINAL_IMPLEMENTATION_CONTRACT-2026-10-07","assessment config digest:sha256:wp04"]}
}$$::jsonb);

select public.complete_protected_assessment_from_result(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
 'token-protected','33333333-3333-4333-8333-333333333333'::uuid,
 'fp-protected', (select result from wp04_fixture)
);

select public.complete_protected_assessment_from_result(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
 'token-protected','33333333-3333-4333-8333-333333333333'::uuid,
 'fp-protected', (select result from wp04_fixture)
);

do $test$
declare v_used integer; v_results integer; v_scores integer; v_state text; v_lead numeric; v_source jsonb;
begin
 select used_count into v_used from public.assessment_users where id='33333333-3333-4333-8333-333333333333';
 select count(*) into v_results from public.assessment_results where session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 select count(*) into v_scores from public.scores where session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 select submission_state into v_state from public.sessions where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 select score_percentage into v_lead from public.leads where id='11111111-1111-4111-8111-111111111111';
 select result into v_source from public.assessment_results where session_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 if v_used <> 1 then raise exception 'protected usage was not exactly once: %',v_used; end if;
 if v_results <> 1 then raise exception 'result row count mismatch: %',v_results; end if;
 if v_scores <> 2 then raise exception 'score projection count mismatch: %',v_scores; end if;
 if v_state <> 'completed' then raise exception 'session not completed: %',v_state; end if;
 if v_lead <> 70 then raise exception 'lead projection mismatch: %',v_lead; end if;
 if v_source ? 'resolvedSelections' or v_source ? 'axisPersistenceRows' or v_source ? 'leakageIndex' then
   raise exception 'internal/removed fields leaked into authoritative result';
 end if;
end $test$;

select public.complete_public_assessment_from_result(
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
 'token-public','fp-public',
 jsonb_set(
   (select result from wp04_fixture),
   '{identity}',
   (select (result->'identity') ||
      '{"sessionId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","resultId":"66666666-6666-4666-8666-666666666666"}'::jsonb
    from wp04_fixture)
 )
);

do $test$
declare v_results integer; v_scores integer; v_state text;
begin
 select count(*) into v_results from public.assessment_results where session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 select count(*) into v_scores from public.scores where session_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 select submission_state into v_state from public.sessions where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 if v_results <> 1 or v_scores <> 2 or v_state <> 'completed' then raise exception 'public persistence projection mismatch'; end if;
end $test$;

do $tamper$
declare v_payload jsonb := (select result from wp04_fixture);
begin
 v_payload := jsonb_set(v_payload,'{identity,sessionId}','"cccccccc-cccc-4ccc-8ccc-cccccccccccc"');
 v_payload := jsonb_set(v_payload,'{identity,resultId}','"77777777-7777-4777-8777-777777777777"');
 v_payload := v_payload || '{"resolvedSelections":[{"fake":true}]}'::jsonb;
 begin
   perform public.complete_public_assessment_from_result(
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
     'token-tamper','fp-tamper',v_payload
   );
   raise exception 'tampered internal field was accepted';
 exception when sqlstate '22023' then
   null;
 end;
end $tamper$;

do $verify$
begin
 if exists(select 1 from public.assessment_results where session_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') then
   raise exception 'tamper session unexpectedly persisted';
 end if;
 if (select submission_state from public.sessions where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 'processing' then
   raise exception 'tamper session state changed';
 end if;
end $verify$;

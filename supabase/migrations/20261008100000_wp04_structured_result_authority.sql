-- WP-04 — Structured Result authoritative persistence
-- Canonical completion persistence consumes one factual payload: p_result.
-- Scalars and legacy score rows are database projections of the Structured Result.

create or replace function public.complete_p4_public_assessment_from_result(
  p_session_id uuid,
  p_access_token_hash text,
  p_submission_fingerprint text,
  p_result jsonb
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_session public.sessions%rowtype;
  v_access public.assessment_session_access%rowtype;
  v_completed_at timestamptz := now();
  v_result_id uuid;
  v_assessment_version integer;
  v_interpretation_version integer;
  v_engine_version text;
  v_contract_version text;
  v_config_digest text;
  v_overall_score numeric;
  v_classification text;
begin
  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assessment session not found';
  end if;
  if v_session.assessment_user_id is not null then
    raise exception using errcode = '42501', message = 'Protected session requires protected completion';
  end if;

  select * into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and session_id = p_session_id
    and assessment_user_id is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired public assessment access';
  end if;

  if v_session.status = 'completed' or v_session.submission_state = 'completed' then
    return jsonb_build_object(
      'success', true,
      'already_completed', true,
      'session_id', v_session.id,
      'overall_score', (
        select l.score_percentage from public.leads l where l.id = v_session.lead_id
      ),
      'result', (
        select r.result from public.assessment_results r where r.session_id = p_session_id
      )
    );
  end if;

  if v_session.status <> 'in_progress' or v_session.submission_state <> 'processing' then
    raise exception using errcode = '40901', message = 'Assessment submission is not prepared';
  end if;

  if nullif(btrim(coalesce(p_submission_fingerprint, '')), '') is null
     or p_submission_fingerprint is distinct from v_session.submission_fingerprint
     or v_session.submission_snapshot is null then
    raise exception using errcode = '40903', message = 'Submission fingerprint mismatch';
  end if;

  if jsonb_typeof(p_result) <> 'object'
     or p_result->>'schemaVersion' <> 'P3_STRUCTURED_RESULT_V1'
     or p_result->>'status' <> 'PRODUCTION' then
    raise exception using errcode = '22023', message = 'Invalid P3 structured result';
  end if;

  if (p_result->'identity'->>'sessionId') is distinct from p_session_id::text
     or (p_result->'identity'->>'assessmentTypeId') is distinct from v_session.assessment_type_id::text
     or (p_result->'identity'->>'assessmentVersion') is null
     or (p_result->'provenance'->>'interpretationVersion') is null
     or nullif(btrim(coalesce(p_result->'provenance'->>'scoringEngineVersion','')), '') is null
     or nullif(btrim(coalesce(p_result->'provenance'->>'scoringContractVersion','')), '') is null
     or nullif(btrim(coalesce(p_result->'provenance'->>'assessmentConfigDigest','')), '') is null
     or jsonb_typeof(p_result->'provenance'->'inputLineage') <> 'array'
     or jsonb_array_length(p_result->'provenance'->'inputLineage') = 0
     or jsonb_typeof(p_result->'scores'->'axes') <> 'array'
     or jsonb_typeof(p_result->'inputs'->'responses') <> 'array'
     or jsonb_typeof(p_result->'measurement') <> 'object'
     or jsonb_typeof(p_result->'coverage') <> 'object'
     or jsonb_typeof(p_result->'consistency') <> 'object'
     or jsonb_typeof(p_result->roles) <> 'array'
     or jsonb_typeof(p_result->'kpis') <> 'array'
     or jsonb_typeof(p_result->'economics') <> 'object'
     or jsonb_typeof(p_result->'classification') <> 'object'
     or jsonb_typeof(p_result->'diagnostics') <> 'object'
     or jsonb_typeof(p_result->'audit') <> 'object'
     or p_result ? 'resolvedSelections'
     or p_result ? 'axisPersistenceRows' then
    raise exception using errcode = '22023', message = 'Incomplete Structured Result';
  end if;

  v_assessment_version := nullif(p_result->'identity'->>'assessmentVersion','')::integer;
  v_interpretation_version := nullif(p_result->'provenance'->>'interpretationVersion','')::integer;
  v_engine_version := p_result->'provenance'->>'scoringEngineVersion';
  v_contract_version := p_result->'provenance'->>'scoringContractVersion';
  v_config_digest := p_result->'provenance'->>'assessmentConfigDigest';
  v_overall_score := nullif(p_result->'scores'->>'overallScore','')::numeric;
  v_classification := coalesce(p_result->'classification'->>'bandCode','');
  v_result_id := nullif(p_result->'identity'->>'resultId','')::uuid;

  if v_result_id is null or v_assessment_version is null or v_interpretation_version is null then
    raise exception using errcode = '22023', message = 'Structured Result identity/provenance is incomplete';
  end if;
  if v_session.assessment_version is distinct from v_assessment_version then
    raise exception using errcode = '40904', message = 'Assessment version mismatch';
  end if;
  if v_overall_score is not null and (v_overall_score < 0 or v_overall_score > 100) then
    raise exception using errcode = '22023', message = 'Invalid overall score';
  end if;

  if exists (
    select 1
    from (
      select "axisCode" axis_code, count(*) n
      from jsonb_to_recordset(p_result->'scores'->'axes') as s(
        "axisCode" text,
        "axisNameAr" text,
        "axisNameEn" text,
        score numeric,
        "rawScore" numeric,
        "maxPossible" numeric,
        percentage numeric,
        weight numeric,
        "weightedScore" numeric,
        status text
      )
      group by "axisCode"
    ) d
    where d.axis_code is null or btrim(d.axis_code) = '' or d.n <> 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid or duplicate Structured Result axes';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_result->'scores'->'axes') as s(
      "axisCode" text,
      "axisNameAr" text,
      "axisNameEn" text,
      score numeric,
      "rawScore" numeric,
      "maxPossible" numeric,
      percentage numeric,
      weight numeric,
      "weightedScore" numeric,
      status text
    )
    where status = 'measured'
      and (
        score is null
        or "rawScore" is null or "rawScore" < 0
        or "maxPossible" is null or "maxPossible" <= 0
        or percentage is null or percentage < 0 or percentage > 100
        or weight is null or weight <= 0 or weight > 1
        or "weightedScore" is null
      )
  ) then
    raise exception using errcode = '22023', message = 'Invalid measured Structured Result axis';
  end if;

  delete from public.scores where session_id = p_session_id;

  insert into public.scores (
    session_id, lead_id, axis_id, axis_name_ar, axis_name_en,
    raw_score, max_possible, percentage, weight, weighted_score, grade
  )
  select
    p_session_id, v_session.lead_id,
    s."axisCode", s."axisNameAr", s."axisNameEn",
    round(s."rawScore")::integer, round(s."maxPossible")::integer,
    s.percentage, s.weight, s."weightedScore",
    case
      when s.percentage >= 75 then 'Q4'
      when s.percentage >= 50 then 'Q3'
      when s.percentage >= 25 then 'Q2'
      else 'Q1'
    end
  from jsonb_to_recordset(p_result->'scores'->'axes') as s(
    "axisCode" text,
    "axisNameAr" text,
    "axisNameEn" text,
    score numeric,
    "rawScore" numeric,
    "maxPossible" numeric,
    percentage numeric,
    weight numeric,
    "weightedScore" numeric,
    status text
  )
  where s.status = 'measured';

  insert into public.assessment_results (
    id, session_id, assessment_type_id, assessment_version,
    interpretation_version, scoring_engine_version,
    scoring_contract_version, assessment_config_digest,
    calculated_at, result_status, result
  ) values (
    v_result_id, p_session_id, v_session.assessment_type_id, v_assessment_version,
    v_interpretation_version, v_engine_version,
    v_contract_version, v_config_digest,
    v_completed_at, 'PRODUCTION', p_result
  );

  update public.leads
  set completed = true,
      score_total = case when v_overall_score is null then null else round(v_overall_score) end,
      score_percentage = v_overall_score,
      completed_at = v_completed_at
  where id = v_session.lead_id;

  update public.sessions
  set status = 'completed',
      submission_state = 'completed',
      completed_at = v_completed_at,
      interpretation_version = v_interpretation_version,
      scoring_engine_version = v_engine_version,
      scoring_contract_version = v_contract_version,
      assessment_config_digest = v_config_digest,
      last_activity_at = v_completed_at
  where id = p_session_id;

  update public.assessment_session_access
  set last_seen_at = v_completed_at
  where id = v_access.id;

  return jsonb_build_object(
    'success', true,
    'already_completed', false,
    'session_id', p_session_id,
    'overall_score', v_overall_score,
    'classification', v_classification,
    'result', p_result,
    'completed_at', v_completed_at
  );
end;
$function$;

create or replace function public.complete_p4_assessment_from_result(
  p_session_id uuid,
  p_access_token_hash text,
  p_assessment_user_id uuid,
  p_submission_fingerprint text,
  p_result jsonb
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_session public.sessions%rowtype;
  v_access public.assessment_session_access%rowtype;
  v_user public.assessment_users%rowtype;
  v_completed_at timestamptz := now();
  v_result_id uuid;
  v_assessment_version integer;
  v_interpretation_version integer;
  v_engine_version text;
  v_contract_version text;
  v_config_digest text;
  v_overall_score numeric;
  v_classification text;
begin
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Assessment session not found'; end if;
  if v_session.assessment_user_id is distinct from p_assessment_user_id then
    raise exception using errcode = '42501', message = 'Assessment session ownership mismatch';
  end if;

  select * into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash and session_id = p_session_id
    and assessment_user_id = p_assessment_user_id and revoked_at is null and expires_at > now()
  for update;
  if not found then raise exception using errcode = '28000', message = 'Invalid or expired assessment access'; end if;

  if v_session.status = 'completed' or v_session.submission_state = 'completed' then
    return jsonb_build_object(
      'success', true, 'already_completed', true, 'session_id', v_session.id,
      'overall_score', (select l.score_percentage from public.leads l where l.id = v_session.lead_id),
      'result', (select r.result from public.assessment_results r where r.session_id = p_session_id)
    );
  end if;

  if v_session.status <> 'in_progress' or v_session.submission_state <> 'processing' then
    raise exception using errcode = '40901', message = 'Assessment submission is not prepared';
  end if;
  if nullif(btrim(coalesce(p_submission_fingerprint,'')), '') is null
     or p_submission_fingerprint is distinct from v_session.submission_fingerprint
     or v_session.submission_snapshot is null then
    raise exception using errcode = '40903', message = 'Submission fingerprint mismatch';
  end if;

  if jsonb_typeof(p_result) <> 'object'
     or p_result->>'schemaVersion' <> 'P3_STRUCTURED_RESULT_V1'
     or p_result->>'status' <> 'PRODUCTION' then
    raise exception using errcode = '22023', message = 'Invalid P3 structured result';
  end if;

  v_assessment_version := nullif(p_result->'identity'->>'assessmentVersion','')::integer;
  v_interpretation_version := nullif(p_result->'provenance'->>'interpretationVersion','')::integer;
  v_engine_version := p_result->'provenance'->>'scoringEngineVersion';
  v_contract_version := p_result->'provenance'->>'scoringContractVersion';
  v_config_digest := p_result->'provenance'->>'assessmentConfigDigest';
  v_overall_score := nullif(p_result->'scores'->>'overallScore','')::numeric;
  v_classification := coalesce(p_result->'classification'->>'bandCode','');
  v_result_id := nullif(p_result->'identity'->>'resultId','')::uuid;

  if p_result->'identity'->>'sessionId' is distinct from p_session_id::text
     or p_result->'identity'->>'assessmentTypeId' is distinct from v_session.assessment_type_id::text
     or v_result_id is null
     or v_assessment_version is null
     or v_interpretation_version is null
     or nullif(btrim(coalesce(v_engine_version,'')), '') is null
     or nullif(btrim(coalesce(v_contract_version,'')), '') is null
     or nullif(btrim(coalesce(v_config_digest,'')), '') is null
     or jsonb_typeof(p_result->'provenance'->'inputLineage') <> 'array'
     or jsonb_array_length(p_result->'provenance'->'inputLineage') = 0
     or jsonb_typeof(p_result->'scores'->'axes') <> 'array'
     or jsonb_typeof(p_result->'inputs'->'responses') <> 'array'
     or jsonb_typeof(p_result->'measurement') <> 'object'
     or jsonb_typeof(p_result->'coverage') <> 'object'
     or jsonb_typeof(p_result->'consistency') <> 'object'
     or jsonb_typeof(p_result->roles) <> 'array'
     or jsonb_typeof(p_result->'kpis') <> 'array'
     or jsonb_typeof(p_result->'economics') <> 'object'
     or jsonb_typeof(p_result->'classification') <> 'object'
     or jsonb_typeof(p_result->'diagnostics') <> 'object'
     or jsonb_typeof(p_result->'audit') <> 'object'
     or p_result ? 'resolvedSelections'
     or p_result ? 'axisPersistenceRows' then
    raise exception using errcode = '22023', message = 'Incomplete Structured Result identity/provenance';
  end if;
  if v_session.assessment_version is distinct from v_assessment_version then
    raise exception using errcode = '40904', message = 'Assessment version mismatch';
  end if;
  if v_overall_score is not null and (v_overall_score < 0 or v_overall_score > 100) then
    raise exception using errcode = '22023', message = 'Invalid overall score';
  end if;

  if exists (
    select 1
    from (
      select "axisCode" axis_code, count(*) n
      from jsonb_to_recordset(p_result->'scores'->'axes') as s("axisCode" text, "axisNameAr" text, "axisNameEn" text, score numeric, "rawScore" numeric, "maxPossible" numeric, percentage numeric, weight numeric, "weightedScore" numeric, status text)
      group by "axisCode"
    ) d
    where d.axis_code is null or btrim(d.axis_code) = '' or d.n <> 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid or duplicate Structured Result axes';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_result->'scores'->'axes') as s("axisCode" text, "axisNameAr" text, "axisNameEn" text, score numeric, "rawScore" numeric, "maxPossible" numeric, percentage numeric, weight numeric, "weightedScore" numeric, status text)
    where status = 'measured'
      and (score is null or "rawScore" is null or "rawScore" < 0 or "maxPossible" is null or "maxPossible" <= 0
        or percentage is null or percentage < 0 or percentage > 100 or weight is null or weight <= 0 or weight > 1
        or "weightedScore" is null)
  ) then
    raise exception using errcode = '22023', message = 'Invalid measured Structured Result axis';
  end if;

  if not exists (
    select 1 from public.assessment_users
    where id = p_assessment_user_id and active = true
      and (expires_at is null or expires_at > now())
  ) then
    raise exception using errcode = '42501', message = 'Assessment access is inactive or expired';
  end if;

  select * into v_user from public.assessment_users where id = p_assessment_user_id for update;
  if coalesce(v_user.used_count,0) >= coalesce(v_user.max_uses,1) then
    raise exception using errcode = '42501', message = 'Usage limit exceeded';
  end if;

  delete from public.scores where session_id = p_session_id;

  insert into public.scores (
    session_id, lead_id, axis_id, axis_name_ar, axis_name_en,
    raw_score, max_possible, percentage, weight, weighted_score, grade
  )
  select
    p_session_id, v_session.lead_id, s."axisCode", s."axisNameAr", s."axisNameEn",
    round(s."rawScore")::integer, round(s."maxPossible")::integer, s.percentage, s.weight, s."weightedScore",
    case when s.percentage >= 75 then 'Q4' when s.percentage >= 50 then 'Q3' when s.percentage >= 25 then 'Q2' else 'Q1' end
  from jsonb_to_recordset(p_result->'scores'->'axes') as s("axisCode" text, "axisNameAr" text, "axisNameEn" text, score numeric, "rawScore" numeric, "maxPossible" numeric, percentage numeric, weight numeric, "weightedScore" numeric, status text)
  where s.status = 'measured';

  insert into public.assessment_results (
    id, session_id, assessment_type_id, assessment_version, interpretation_version,
    scoring_engine_version, scoring_contract_version, assessment_config_digest,
    calculated_at, result_status, result
  ) values (
    v_result_id, p_session_id, v_session.assessment_type_id, v_assessment_version,
    v_interpretation_version, v_engine_version, v_contract_version, v_config_digest,
    v_completed_at, 'PRODUCTION', p_result
  );

  update public.leads
  set completed = true,
      score_total = case when v_overall_score is null then null else round(v_overall_score) end,
      score_percentage = v_overall_score,
      completed_at = v_completed_at
  where id = v_session.lead_id;

  update public.assessment_users
  set used_count = coalesce(used_count,0) + 1
  where id = p_assessment_user_id;

  update public.sessions
  set status='completed', submission_state='completed', completed_at=v_completed_at,
      usage_consumed_at=v_completed_at, interpretation_version=v_interpretation_version,
      scoring_engine_version=v_engine_version, scoring_contract_version=v_contract_version,
      assessment_config_digest=v_config_digest, last_activity_at=v_completed_at
  where id=p_session_id;

  update public.assessment_session_access set last_seen_at=v_completed_at where id=v_access.id;

  return jsonb_build_object(
    'success', true, 'already_completed', false, 'session_id', p_session_id,
    'overall_score', v_overall_score, 'classification', v_classification,
    'result', p_result, 'used_count', coalesce(v_user.used_count,0)+1, 'completed_at', v_completed_at
  );
end;
$function$;

revoke all on function public.complete_p4_public_assessment_from_result(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_p4_public_assessment_from_result(uuid,text,text,jsonb) to service_role;

revoke all on function public.complete_p4_assessment_from_result(uuid,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.complete_p4_assessment_from_result(uuid,text,uuid,text,jsonb) to service_role;

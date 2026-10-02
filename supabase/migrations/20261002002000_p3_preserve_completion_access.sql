-- Preserve P3 completion access to support idempotent retries.
CREATE OR REPLACE FUNCTION public.complete_p3_assessment_session(p_session_id uuid, p_access_token_hash text, p_assessment_user_id uuid, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_session public.sessions%rowtype;
  v_access public.assessment_session_access%rowtype;
  v_user public.assessment_users%rowtype;
  v_completed_at timestamptz := now();
  v_result_id uuid;
begin
  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assessment session not found';
  end if;

  if v_session.assessment_user_id is distinct from p_assessment_user_id then
    raise exception using errcode = '42501', message = 'Assessment session ownership mismatch';
  end if;

  select * into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and session_id = p_session_id
    and assessment_user_id = p_assessment_user_id
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired assessment access';
  end if;

  if v_session.status = 'completed' then
    select id into v_result_id
    from public.assessment_results
    where session_id = p_session_id;

    return jsonb_build_object(
      'success', true,
      'already_completed', true,
      'session_id', p_session_id,
      'overall_score', (
        select l.score_percentage from public.leads l where l.id = v_session.lead_id
      ),
      'result', (
        select r.result from public.assessment_results r where r.session_id = p_session_id
      )
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception using errcode = '42501', message = 'Assessment session is not completable';
  end if;

  if p_assessment_version is null
     or v_session.assessment_version is distinct from p_assessment_version then
    raise exception using errcode = '40901', message = 'Assessment version mismatch';
  end if;

  if p_interpretation_version is null or p_interpretation_version <= 0
     or nullif(btrim(coalesce(p_scoring_engine_version, '')), '') is null
     or nullif(btrim(coalesce(p_scoring_contract_version, '')), '') is null
     or nullif(btrim(coalesce(p_assessment_config_digest, '')), '') is null then
    raise exception using errcode = '22023', message = 'Incomplete P3 provenance';
  end if;

  if p_overall_score is not null and (p_overall_score < 0 or p_overall_score > 100) then
    raise exception using errcode = '22023', message = 'Invalid overall score';
  end if;

  if jsonb_typeof(p_score_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'Score rows must be an array';
  end if;

  if exists (
    select 1
    from (
      select axis_id, count(*) as n
      from jsonb_to_recordset(p_score_rows) as s(
        axis_id text,
        axis_name_ar text,
        axis_name_en text,
        raw_score integer,
        max_possible integer,
        percentage numeric,
        weight numeric,
        weighted_score numeric,
        grade text
      )
      group by axis_id
    ) d
    where d.axis_id is null or btrim(d.axis_id) = '' or d.n <> 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid or duplicate score rows';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_score_rows) as s(
      axis_id text,
      axis_name_ar text,
      axis_name_en text,
      raw_score integer,
      max_possible integer,
      percentage numeric,
      weight numeric,
      weighted_score numeric,
      grade text
    )
    where s.raw_score is null
       or s.raw_score < 0
       or s.max_possible is null
       or s.max_possible <= 0
       or s.percentage is null
       or s.percentage < 0
       or s.percentage > 100
       or s.weight is null
       or s.weight <= 0
       or s.weight > 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid score rows';
  end if;

  if jsonb_typeof(p_result) <> 'object'
     or p_result->>'schemaVersion' <> 'P3_STRUCTURED_RESULT_V1'
     or p_result->>'status' <> 'PRODUCTION' then
    raise exception using errcode = '22023', message = 'Invalid P3 structured result';
  end if;

  if (p_result->'identity'->>'sessionId') is distinct from p_session_id::text
     or (p_result->'identity'->>'assessmentTypeId') is distinct from v_session.assessment_type_id::text
     or (p_result->'identity'->>'assessmentVersion') is distinct from p_assessment_version::text
     or (p_result->'provenance'->>'interpretationVersion') is distinct from p_interpretation_version::text
     or (p_result->'provenance'->>'scoringEngineVersion') is distinct from p_scoring_engine_version
     or (p_result->'provenance'->>'scoringContractVersion') is distinct from p_scoring_contract_version
     or (p_result->'provenance'->>'assessmentConfigDigest') is distinct from p_assessment_config_digest then
    raise exception using errcode = '22023', message = 'Structured result provenance mismatch';
  end if;

  v_result_id := nullif(p_result->'identity'->>'resultId', '')::uuid;
  if v_result_id is null then
    raise exception using errcode = '22023', message = 'Structured result id is missing';
  end if;

  select * into v_user
  from public.assessment_users
  where id = p_assessment_user_id
  for update;

  if not found or not v_user.active then
    raise exception using errcode = '42501', message = 'Assessment access is inactive';
  end if;

  if v_user.expires_at is not null and v_user.expires_at <= now() then
    raise exception using errcode = '42501', message = 'Assessment access is expired';
  end if;

  if coalesce(v_user.used_count, 0) >= coalesce(v_user.max_uses, 1) then
    raise exception using errcode = '42501', message = 'Usage limit exceeded';
  end if;

  delete from public.scores where session_id = p_session_id;

  insert into public.scores (
    session_id, lead_id, axis_id, axis_name_ar, axis_name_en,
    raw_score, max_possible, percentage, weight, weighted_score, grade
  )
  select
    p_session_id, v_session.lead_id, s.axis_id, s.axis_name_ar, s.axis_name_en,
    s.raw_score, s.max_possible, s.percentage, s.weight, s.weighted_score, s.grade
  from jsonb_to_recordset(p_score_rows) as s(
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

  insert into public.assessment_results (
    id, session_id, assessment_type_id, assessment_version,
    interpretation_version, scoring_engine_version,
    scoring_contract_version, assessment_config_digest,
    calculated_at, result_status, result
  ) values (
    v_result_id, p_session_id, v_session.assessment_type_id, p_assessment_version,
    p_interpretation_version, p_scoring_engine_version,
    p_scoring_contract_version, p_assessment_config_digest,
    v_completed_at, 'PRODUCTION', p_result
  );

  update public.leads
  set completed = true,
      score_total = case when p_overall_score is null then null else round(p_overall_score) end,
      score_percentage = p_overall_score,
      completed_at = v_completed_at
  where id = v_session.lead_id;

  update public.assessment_users
  set used_count = coalesce(used_count, 0) + 1
  where id = p_assessment_user_id;

  update public.sessions
  set status = 'completed',
      completed_at = v_completed_at,
      usage_consumed_at = v_completed_at,
      interpretation_version = p_interpretation_version,
      scoring_engine_version = p_scoring_engine_version,
      scoring_contract_version = p_scoring_contract_version,
      assessment_config_digest = p_assessment_config_digest
  where id = p_session_id;

  update public.assessment_session_access
  set last_seen_at = v_completed_at
  where id = v_access.id;

  return jsonb_build_object(
    'success', true,
    'already_completed', false,
    'session_id', p_session_id,
    'overall_score', p_overall_score,
    'classification', p_classification,
    'result', p_result,
    'used_count', coalesce(v_user.used_count, 0) + 1,
    'completed_at', v_completed_at
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.complete_p3_public_assessment_session(p_session_id uuid, p_access_token_hash text, p_overall_score numeric, p_classification text, p_score_rows jsonb, p_assessment_version integer, p_interpretation_version integer, p_scoring_engine_version text, p_scoring_contract_version text, p_assessment_config_digest text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_session public.sessions%rowtype;
  v_access public.assessment_session_access%rowtype;
  v_completed_at timestamptz := now();
  v_result_id uuid;
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

  if v_session.status = 'completed' then
    select id into v_result_id
    from public.assessment_results
    where session_id = p_session_id;

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

  if v_session.status <> 'in_progress' then
    raise exception using errcode = '42501', message = 'Assessment session is not completable';
  end if;

  if p_assessment_version is null
     or v_session.assessment_version is distinct from p_assessment_version then
    raise exception using errcode = '40901', message = 'Assessment version mismatch';
  end if;

  if p_interpretation_version is null or p_interpretation_version <= 0
     or nullif(btrim(coalesce(p_scoring_engine_version, '')), '') is null
     or nullif(btrim(coalesce(p_scoring_contract_version, '')), '') is null
     or nullif(btrim(coalesce(p_assessment_config_digest, '')), '') is null then
    raise exception using errcode = '22023', message = 'Incomplete P3 provenance';
  end if;

  if p_overall_score is not null and (p_overall_score < 0 or p_overall_score > 100) then
    raise exception using errcode = '22023', message = 'Invalid overall score';
  end if;

  if jsonb_typeof(p_score_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'Score rows must be an array';
  end if;

  if exists (
    select 1
    from (
      select axis_id, count(*) as n
      from jsonb_to_recordset(p_score_rows) as s(
        axis_id text,
        axis_name_ar text,
        axis_name_en text,
        raw_score integer,
        max_possible integer,
        percentage numeric,
        weight numeric,
        weighted_score numeric,
        grade text
      )
      group by axis_id
    ) d
    where d.axis_id is null or btrim(d.axis_id) = '' or d.n <> 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid or duplicate score rows';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_score_rows) as s(
      axis_id text,
      axis_name_ar text,
      axis_name_en text,
      raw_score integer,
      max_possible integer,
      percentage numeric,
      weight numeric,
      weighted_score numeric,
      grade text
    )
    where s.raw_score is null
       or s.raw_score < 0
       or s.max_possible is null
       or s.max_possible <= 0
       or s.percentage is null
       or s.percentage < 0
       or s.percentage > 100
       or s.weight is null
       or s.weight <= 0
       or s.weight > 1
  ) then
    raise exception using errcode = '22023', message = 'Invalid score rows';
  end if;

  if jsonb_typeof(p_result) <> 'object'
     or p_result->>'schemaVersion' <> 'P3_STRUCTURED_RESULT_V1'
     or p_result->>'status' <> 'PRODUCTION' then
    raise exception using errcode = '22023', message = 'Invalid P3 structured result';
  end if;

  if (p_result->'identity'->>'sessionId') is distinct from p_session_id::text
     or (p_result->'identity'->>'assessmentTypeId') is distinct from v_session.assessment_type_id::text
     or (p_result->'identity'->>'assessmentVersion') is distinct from p_assessment_version::text
     or (p_result->'provenance'->>'interpretationVersion') is distinct from p_interpretation_version::text
     or (p_result->'provenance'->>'scoringEngineVersion') is distinct from p_scoring_engine_version
     or (p_result->'provenance'->>'scoringContractVersion') is distinct from p_scoring_contract_version
     or (p_result->'provenance'->>'assessmentConfigDigest') is distinct from p_assessment_config_digest then
    raise exception using errcode = '22023', message = 'Structured result provenance mismatch';
  end if;

  v_result_id := nullif(p_result->'identity'->>'resultId', '')::uuid;
  if v_result_id is null then
    raise exception using errcode = '22023', message = 'Structured result id is missing';
  end if;

  delete from public.scores where session_id = p_session_id;

  insert into public.scores (
    session_id, lead_id, axis_id, axis_name_ar, axis_name_en,
    raw_score, max_possible, percentage, weight, weighted_score, grade
  )
  select
    p_session_id, v_session.lead_id, s.axis_id, s.axis_name_ar, s.axis_name_en,
    s.raw_score, s.max_possible, s.percentage, s.weight, s.weighted_score, s.grade
  from jsonb_to_recordset(p_score_rows) as s(
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

  insert into public.assessment_results (
    id, session_id, assessment_type_id, assessment_version,
    interpretation_version, scoring_engine_version,
    scoring_contract_version, assessment_config_digest,
    calculated_at, result_status, result
  ) values (
    v_result_id, p_session_id, v_session.assessment_type_id, p_assessment_version,
    p_interpretation_version, p_scoring_engine_version,
    p_scoring_contract_version, p_assessment_config_digest,
    v_completed_at, 'PRODUCTION', p_result
  );

  update public.leads
  set completed = true,
      score_total = case when p_overall_score is null then null else round(p_overall_score) end,
      score_percentage = p_overall_score,
      completed_at = v_completed_at
  where id = v_session.lead_id;

  update public.sessions
  set status = 'completed',
      completed_at = v_completed_at,
      interpretation_version = p_interpretation_version,
      scoring_engine_version = p_scoring_engine_version,
      scoring_contract_version = p_scoring_contract_version,
      assessment_config_digest = p_assessment_config_digest
  where id = p_session_id;

  update public.assessment_session_access
  set last_seen_at = v_completed_at
  where id = v_access.id;

  return jsonb_build_object(
    'success', true,
    'already_completed', false,
    'session_id', p_session_id,
    'overall_score', p_overall_score,
    'classification', p_classification,
    'result', p_result,
    'completed_at', v_completed_at
  );
end;
$function$


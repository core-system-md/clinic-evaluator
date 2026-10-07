-- WP-04: enforce Structured Result as the authoritative persistence source.
-- The database validates projection consistency; it does not recalculate scores.
begin;

create or replace function public.validate_assessment_result_projection()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_axes jsonb;
begin
  if NEW.result is null or jsonb_typeof(NEW.result) <> 'object' then
    raise exception using errcode = '22023', message = 'Assessment result must be a JSON object';
  end if;

  if NEW.result->>'schemaVersion' <> 'P3_STRUCTURED_RESULT_V1'
     or NEW.result->>'status' <> NEW.result_status then
    raise exception using errcode = '22023', message = 'Structured Result schema/status mismatch';
  end if;

  if nullif(btrim(coalesce(NEW.result->'identity'->>'sessionId', '')), '') is null
     or (NEW.result->'identity'->>'sessionId') is distinct from NEW.session_id::text
     or (NEW.result->'identity'->>'assessmentTypeId') is distinct from NEW.assessment_type_id::text
     or (NEW.result->'identity'->>'assessmentVersion') is distinct from NEW.assessment_version::text
     or (NEW.result->'identity'->>'resultId') is distinct from NEW.id::text then
    raise exception using errcode = '22023', message = 'Structured Result identity mismatch';
  end if;

  if (NEW.result->'provenance'->>'interpretationVersion') is distinct from NEW.interpretation_version::text
     or (NEW.result->'provenance'->>'scoringEngineVersion') is distinct from NEW.scoring_engine_version
     or (NEW.result->'provenance'->>'scoringContractVersion') is distinct from NEW.scoring_contract_version
     or (NEW.result->'provenance'->>'assessmentConfigDigest') is distinct from NEW.assessment_config_digest
     or nullif(btrim(coalesce(NEW.result->'provenance'->>'engineIdentity', '')), '') is null then
    raise exception using errcode = '22023', message = 'Structured Result provenance mismatch';
  end if;

  v_axes := NEW.result->'scores'->'axes';
  if jsonb_typeof(v_axes) <> 'array'
     or jsonb_typeof(NEW.result->'inputs'->'responses') <> 'array'
     or jsonb_typeof(NEW.result->'measurement') <> 'object'
     or jsonb_typeof(NEW.result->'coverage') <> 'object'
     or jsonb_typeof(NEW.result->'consistency'->'findings') <> 'array'
     or jsonb_typeof(NEW.result->'roles') <> 'array'
     or jsonb_typeof(NEW.result->'kpis') <> 'array'
     or jsonb_typeof(NEW.result->'economics') <> 'object'
     or jsonb_typeof(NEW.result->'diagnostics'->'findings') <> 'array'
     or jsonb_typeof(NEW.result->'audit'->'replayableFrom') <> 'array' then
    raise exception using errcode = '22023', message = 'Structured Result required sections are missing';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_axes) as r(axis)
    where coalesce(r.axis->>'axisCode', '') = ''
       or (r.axis->>'weight') is null
       or (r.axis->>'status') not in ('measured', 'unavailable')
       or (
         r.axis->>'status' = 'unavailable'
         and (
           r.axis->>'rawScore' is not null
           or r.axis->>'maxPossible' is not null
           or r.axis->>'score' is not null
           or r.axis->>'weightedScore' is not null
           or r.axis->>'grade' is not null
         )
       )
       or (
         r.axis->>'status' = 'measured'
         and (
           r.axis->'rawScore' is null
           or r.axis->'maxPossible' is null
           or r.axis->'score' is null
           or r.axis->'weightedScore' is null
           or r.axis->>'grade' is null
         )
       )
  ) then
    raise exception using errcode = '22023', message = 'Invalid Structured Result axis measurement shape';
  end if;

  -- Every persisted score row must be a direct projection of a measured
  -- Structured Result axis. No score is recomputed here.
  if exists (
    select 1
    from public.scores s
    left join lateral (
      select
        axis->>'axisCode' as axis_code,
        nullif(axis->>'rawScore', '')::numeric as raw_score,
        nullif(axis->>'maxPossible', '')::numeric as max_possible,
        nullif(axis->>'score', '')::numeric as percentage,
        nullif(axis->>'weightedScore', '')::numeric as weighted_score,
        nullif(axis->>'weight', '')::numeric as weight,
        axis->>'grade' as grade,
        axis->>'status' as status
      from jsonb_array_elements(v_axes) as x(axis)
      where axis->>'axisCode' = s.axis_id
      limit 1
    ) r on true
    where s.session_id = NEW.session_id
      and (
        r.axis_code is null
        or r.status <> 'measured'
        or s.raw_score::numeric is distinct from r.raw_score
        or s.max_possible::numeric is distinct from r.max_possible
        or abs(s.percentage::numeric - r.percentage) > 0.011
        or abs((s.weight::numeric * 100) - r.weight) > 0.011
        or abs(s.weighted_score::numeric - r.weighted_score) > 0.011
        or coalesce(s.grade, '') is distinct from coalesce(r.grade, '')
      )
  ) then
    raise exception using errcode = '22023', message = 'Persisted score row is not an exact Structured Result projection';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_axes) as r(axis)
    where r.axis->>'status' = 'measured'
      and not exists (
        select 1
        from public.scores s
        where s.session_id = NEW.session_id
          and s.axis_id = r.axis->>'axisCode'
      )
  ) then
    raise exception using errcode = '22023', message = 'Measured Structured Result axis has no persisted score row';
  end if;

  return NEW;
end;
$function$;

drop trigger if exists trg_validate_assessment_result_projection
  on public.assessment_results;

create constraint trigger trg_validate_assessment_result_projection
after insert or update of result, result_status, session_id, assessment_type_id,
  assessment_version, interpretation_version, scoring_engine_version,
  scoring_contract_version, assessment_config_digest
on public.assessment_results
deferrable initially immediate
for each row
execute function public.validate_assessment_result_projection();

revoke all on function public.validate_assessment_result_projection() from public, anon, authenticated;
grant execute on function public.validate_assessment_result_projection() to service_role;

commit;

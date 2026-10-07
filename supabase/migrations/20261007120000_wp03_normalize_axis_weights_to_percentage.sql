-- WP-03: normalize assessment axis weights to the final percentage-point contract.
-- This migration is intentionally NOT applied by this WP.
-- It is safe for the currently verified zero-session/zero-result production state,
-- subject to the dependency checks required by the final version-reset workflow.
begin;

do $$
declare
  v_mixed integer;
  v_invalid integer;
begin
  -- Refuse to proceed if one assessment definition mixes fraction and percentage
  -- storage; such a state would require a manual reconciliation rather than
  -- a blind arithmetic conversion.
  select count(*) into v_mixed
  from (
    select assessment_type_id
    from public.axes
    group by assessment_type_id
    having count(*) filter (where weight > 0 and weight <= 1) > 0
       and count(*) filter (where weight > 1) > 0
  ) mixed;

  if v_mixed > 0 then
    raise exception 'WP-03 refused: mixed axis-weight representations found in % assessment definitions', v_mixed;
  end if;

  select count(*) into v_invalid
  from public.axes
  where weight <= 0 or weight > 100;

  if v_invalid > 0 then
    raise exception 'WP-03 refused: % invalid axis weights found before normalization', v_invalid;
  end if;
end;
$$;

-- Current verified fraction-style definitions:
-- 0.35 -> 35%, 0.30 -> 30%, 0.25 -> 25%, 0.20 -> 20%,
-- 0.15 -> 15%, 0.10 -> 10%, 0.50 -> 50%.
update public.axes
set weight = round(weight * 100, 2)
where weight > 0 and weight <= 1;

do $$
declare
  v_invalid integer;
begin
  select count(*) into v_invalid
  from public.axes
  where weight <= 0 or weight > 100;

  if v_invalid > 0 then
    raise exception 'WP-03 failed: % invalid axis weights remain after normalization', v_invalid;
  end if;

  if exists (
    select 1
    from public.axes
    group by assessment_type_id
    having abs(sum(weight) - 100) > 0.001
  ) then
    raise exception 'WP-03 failed: one or more assessment definitions do not total 100 percentage points';
  end if;
end;
$$;

commit;

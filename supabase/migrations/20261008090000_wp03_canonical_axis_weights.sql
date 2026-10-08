-- WP-03 — Canonical axis-weight representation
-- Governing contract: FINAL-IMPLEMENTATION-CONTRACT-2026-10-07
-- Normalize the three current families whose axis weights are stored as
-- fractions (0..1) into canonical percentage points (0..100).
-- No intended value changes: 0.50 -> 50, 0.35 -> 35, etc.
begin;

do $guard$
declare
  v_invalid integer;
begin
  select count(*) into v_invalid
  from (
    select at.id
    from public.assessment_types at
    join public.axes a on a.assessment_type_id = at.id
    where at.slug in ('clinic-performance','medical-team-assessment','patient-journey')
      and at.version = 1
    group by at.id
    having abs(sum(a.weight) - 1) > 0.000001
  ) bad;

  if v_invalid <> 0 then
    raise exception 'WP-03 precondition failed: expected fractional axis-weight sum = 1 for the three targeted V1 families';
  end if;
end
$guard$;

with family_weights as (
  select at.id as assessment_type_id, sum(a.weight) as weight_sum
  from public.assessment_types at
  join public.axes a on a.assessment_type_id = at.id
  where at.slug in ('clinic-performance','medical-team-assessment','patient-journey')
    and at.version = 1
  group by at.id
)
update public.axes a
set weight = round(a.weight * 100, 2)
from family_weights f
join public.assessment_types at on at.id = f.assessment_type_id
where a.assessment_type_id = f.assessment_type_id
  and at.slug in ('clinic-performance','medical-team-assessment','patient-journey')
  and at.version = 1
  and f.weight_sum between 0.999999 and 1.000001;

do $verify$
declare
  v_invalid integer;
  v_updated integer;
begin
  select count(*) into v_invalid
  from (
    select at.slug, at.version
    from public.assessment_types at
    join public.axes a on a.assessment_type_id = at.id
    group by at.slug, at.version
    having (
      at.slug in ('clinic-performance','medical-team-assessment','patient-journey')
      and at.version = 1
      and abs(sum(a.weight) - 100) > 0.000001
    )
  ) bad;

  if v_invalid <> 0 then
    raise exception 'WP-03 postcondition failed: targeted family does not sum to 100 percentage points';
  end if;

  select count(*) into v_updated
  from public.assessment_types at
  join public.axes a on a.assessment_type_id = at.id
  where at.slug in ('clinic-performance','medical-team-assessment','patient-journey')
    and at.version = 1
    and a.weight >= 10
    and a.weight <= 50;

  if v_updated <> 12 then
    raise exception 'WP-03 postcondition failed: expected 12 normalized axis rows, found %', v_updated;
  end if;
end
$verify$;

commit;

\set ON_ERROR_STOP on
\if :{?assessment_type_id}
\else
  \echo 'Required: -v assessment_type_id=<assessment-type-uuid>'
  \quit 2
\endif
\if :{?interpretation_version}
\else
  \echo 'Required: -v interpretation_version=<1-or-2>'
  \quit 2
\endif

-- Read-only export. Run after the C-03 migration exists in the target database.
-- Example:
-- psql "$DATABASE_URL" -X -qAt -v assessment_type_id=<uuid> -v interpretation_version=1 -f .github/scripts/c03-export-assessment-release-snapshot.sql > /tmp/c03-release-snapshot.json
select jsonb_build_object(
  'assessmentTypeId', a.id::text,
  'familyId', a.family_id::text,
  'assessmentVersion', a.version,
  'interpretationVersion', :'interpretation_version'::integer,
  'slug', f.slug,
  'status', a.status,
  'configDigest', public.assessment_configuration_digest(a.id),
  'releaseHistoryCount', (
    select count(*) from public.assessment_interpretation_releases r
     where r.assessment_type_id = a.id
  ),
  'bootstrapPublished', (
    a.status = 'published'
    and not exists (
      select 1 from public.assessment_interpretation_releases r
       where r.assessment_type_id = a.id
    )
  ),
  'questions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', q.code,
      'options', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', o.id::text,
          'optionIndex', o.option_index,
          'optionValue', o.option_value
        ) order by o.option_index, o.id)
          from public.options o
         where o.question_id = q.id
      ), '[]'::jsonb)
    ) order by q.display_order, q.id)
      from public.questions q
     where q.assessment_type_id = a.id
  ), '[]'::jsonb)
)::text
from public.assessment_types a
join public.assessment_families f on f.id = a.family_id
where a.id = :'assessment_type_id'::uuid;

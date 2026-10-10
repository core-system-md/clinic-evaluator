-- P5 recovery: preserve complete public option projection behind the existing server boundary.
-- Root cause observed in production: assessment-access get_content returns exactly two
-- options per question while the protected database graph contains the complete option set.
-- Keep the browser contract unchanged; move the option projection into one JSONB result
-- so Data API row limits cannot truncate the option graph.

create or replace function public.get_public_assessment_options_secure(
  p_assessment_type_id uuid
)
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'question_id', o.question_id,
        'option_index', o.option_index,
        'option_value', o.option_value,
        'label', o.label,
        'label_ar', o.label_ar,
        'is_trap', o.is_trap,
        'display_order', o.display_order
      )
      order by o.display_order, o.option_index
    ),
    '[]'::jsonb
  )
  from public.options o
  join public.questions q on q.id = o.question_id
  join public.assessment_types a on a.id = q.assessment_type_id
  where q.assessment_type_id = p_assessment_type_id
    and a.status = 'published'
    and a.is_active = true;
$$;

revoke execute on function public.get_public_assessment_options_secure(uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_assessment_options_secure(uuid)
  to service_role;

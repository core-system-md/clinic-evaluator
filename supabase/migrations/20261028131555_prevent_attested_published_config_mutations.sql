-- Prevent a configuration mutation after the current published version is bound to a verified C-03 release.
-- The release digest intentionally includes report-visible assessment text, axis/question labels, scoring values,
-- interpretation, and scoring configuration. Any such change must go through a new version and release.

create or replace function public.c03_prevent_attested_published_config_mutation()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_assessment_id uuid;
  v_release_id uuid;
  v_config_changed boolean := false;
begin
  if tg_table_name = 'assessment_types' then
    if old.status <> 'published' then
      return new;
    end if;

    v_assessment_id := old.id;
    v_config_changed :=
      new.id is distinct from old.id
      or new.family_id is distinct from old.family_id
      or new.slug is distinct from old.slug
      or new.version is distinct from old.version
      or new.config_version is distinct from old.config_version
      or new.title_ar is distinct from old.title_ar
      or new.title_en is distinct from old.title_en
      or new.description is distinct from old.description
      or new.question_count is distinct from old.question_count
      or new.axis_count is distinct from old.axis_count
      or new.has_traps is distinct from old.has_traps
      or new.has_ev_simulator is distinct from old.has_ev_simulator
      or new.axis_roles is distinct from old.axis_roles
      or new.kpi_mappings is distinct from old.kpi_mappings
      or new.ev_mappings is distinct from old.ev_mappings;

  elsif tg_table_name = 'axes' then
    v_assessment_id := old.assessment_type_id;
    v_config_changed :=
      new.id is distinct from old.id
      or new.assessment_type_id is distinct from old.assessment_type_id
      or new.code is distinct from old.code
      or new.weight is distinct from old.weight
      or new.title is distinct from old.title
      or new.title_ar is distinct from old.title_ar
      or new.description is distinct from old.description
      or new.display_order is distinct from old.display_order;

  elsif tg_table_name = 'questions' then
    v_assessment_id := old.assessment_type_id;
    v_config_changed :=
      new.id is distinct from old.id
      or new.assessment_type_id is distinct from old.assessment_type_id
      or new.code is distinct from old.code
      or new.axis_id is distinct from old.axis_id
      or new.question_text is distinct from old.question_text
      or new.question_text_ar is distinct from old.question_text_ar
      or new.question_type is distinct from old.question_type
      or new.display_order is distinct from old.display_order
      or new.is_required is distinct from old.is_required
      or new.impact is distinct from old.impact
      or new.layer is distinct from old.layer
      or new.trap_for is distinct from old.trap_for;

  elsif tg_table_name = 'options' then
    select q.assessment_type_id
      into v_assessment_id
    from public.questions q
    where q.id = old.question_id;

    v_config_changed :=
      new.id is distinct from old.id
      or new.question_id is distinct from old.question_id
      or new.option_index is distinct from old.option_index
      or new.option_value is distinct from old.option_value
      or new.label is distinct from old.label
      or new.label_ar is distinct from old.label_ar
      or new.is_trap is distinct from old.is_trap
      or new.display_order is distinct from old.display_order;

  else
    return new;
  end if;

  if not v_config_changed or v_assessment_id is null then
    return new;
  end if;

  if not public.c03_assessment_release_gate_enabled() then
    return new;
  end if;

  select r.id
    into v_release_id
  from public.assessment_types a
  join public.assessment_families f
    on f.id = a.family_id
   and f.current_published_version_id = a.id
  join public.assessment_config_releases r
    on r.id = f.current_release_id
   and r.family_id = a.family_id
   and r.assessment_type_id = a.id
   and r.state in ('VERIFIED', 'PUBLISHED')
  where a.id = v_assessment_id
    and a.status = 'published'
  limit 1;

  if v_release_id is not null then
    raise exception 'هذا الإصدار المنشور مرتبط ببصمة موثّقة؛ أنشئ نسخة عمل جديدة لتعديل المحتوى ثم انشر إصداراً جديداً.'
      using errcode = '55000';
  end if;

  return new;
end;
$function$;

drop trigger if exists c03_prevent_attested_assessment_config_mutation on public.assessment_types;
create trigger c03_prevent_attested_assessment_config_mutation
before update on public.assessment_types
for each row execute function public.c03_prevent_attested_published_config_mutation();

drop trigger if exists c03_prevent_attested_axis_config_mutation on public.axes;
create trigger c03_prevent_attested_axis_config_mutation
before update on public.axes
for each row execute function public.c03_prevent_attested_published_config_mutation();

drop trigger if exists c03_prevent_attested_question_config_mutation on public.questions;
create trigger c03_prevent_attested_question_config_mutation
before update on public.questions
for each row execute function public.c03_prevent_attested_published_config_mutation();

drop trigger if exists c03_prevent_attested_option_config_mutation on public.options;
create trigger c03_prevent_attested_option_config_mutation
before update on public.options
for each row execute function public.c03_prevent_attested_published_config_mutation();

comment on function public.c03_prevent_attested_published_config_mutation() is
  'Fail-closed guard for digest-bound configuration changes to the current published assessment version; requires a new working version and verified release.';

-- P2 follow-up: fix definition-graph immutability trigger branching.
begin;

create or replace function public.p2_assert_draft_version()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_assessment_type_id uuid;
  v_status text;
begin
  if TG_ARGV[0] = 'direct' then
    if TG_TABLE_NAME = 'axes' then
      v_assessment_type_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'questions' then
      v_assessment_type_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'traps' then
      v_assessment_type_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'insights_mapping' then
      v_assessment_type_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'assessment_assets' then
      v_assessment_type_id := NEW.assessment_type_id;
    end if;
  elsif TG_ARGV[0] = 'option' then
    v_assessment_type_id := (
      select q.assessment_type_id
      from public.questions q
      where q.id = case when TG_OP = 'DELETE' then OLD.question_id else NEW.question_id end
    );
  end if;

  select at.status
    into v_status
    from public.assessment_types at
   where at.id = v_assessment_type_id;

  if v_status is distinct from 'draft' then
    raise exception 'Published or archived assessment versions are immutable'
      using errcode = '55000';
  end if;

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$function$;

commit;

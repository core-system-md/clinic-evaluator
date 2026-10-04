begin;

create or replace function public.p2_assert_draft_version()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_old_assessment_id uuid;
  v_new_assessment_id uuid;
  v_old_status text;
  v_new_status text;
begin
  if TG_OP = 'DELETE' then
    if TG_TABLE_NAME = 'axes' then
      v_old_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'questions' then
      v_old_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'traps' then
      v_old_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'insights_mapping' then
      v_old_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'assessment_assets' then
      v_old_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'options' then
      -- During ON DELETE CASCADE from questions, the parent question can
      -- already be gone when the option trigger fires. That is still a
      -- legitimate Draft structural delete.
      select q.assessment_type_id
        into v_old_assessment_id
      from public.questions q
      where q.id=OLD.question_id;

      if v_old_assessment_id is null then
        return OLD;
      end if;
    end if;

    select a.status
      into v_old_status
    from public.assessment_types a
    where a.id=v_old_assessment_id;

    if v_old_status='draft' then
      return OLD;
    end if;

    raise exception 'Published or archived assessment structure is immutable' using errcode='55000';
  end if;

  if TG_TABLE_NAME = 'axes' then
    v_new_assessment_id := NEW.assessment_type_id;
    if TG_OP='UPDATE' then v_old_assessment_id := OLD.assessment_type_id; end if;
  elsif TG_TABLE_NAME = 'questions' then
    v_new_assessment_id := NEW.assessment_type_id;
    if TG_OP='UPDATE' then v_old_assessment_id := OLD.assessment_type_id; end if;
  elsif TG_TABLE_NAME = 'traps' then
    v_new_assessment_id := NEW.assessment_type_id;
    if TG_OP='UPDATE' then v_old_assessment_id := OLD.assessment_type_id; end if;
  elsif TG_TABLE_NAME = 'insights_mapping' then
    v_new_assessment_id := NEW.assessment_type_id;
    if TG_OP='UPDATE' then v_old_assessment_id := OLD.assessment_type_id; end if;
  elsif TG_TABLE_NAME = 'assessment_assets' then
    v_new_assessment_id := NEW.assessment_type_id;
    if TG_OP='UPDATE' then v_old_assessment_id := OLD.assessment_type_id; end if;
  elsif TG_TABLE_NAME = 'options' then
    select q.assessment_type_id into v_new_assessment_id
    from public.questions q where q.id=NEW.question_id;
    if TG_OP='UPDATE' then
      select q.assessment_type_id into v_old_assessment_id
      from public.questions q where q.id=OLD.question_id;
    end if;
  end if;

  select a.status into v_new_status
  from public.assessment_types a where a.id=v_new_assessment_id;

  if TG_OP='UPDATE' then
    select a.status into v_old_status
    from public.assessment_types a where a.id=v_old_assessment_id;
  end if;

  if TG_OP<>'UPDATE' then
    if v_new_status='draft' then return NEW; end if;
    raise exception 'Published or archived assessment structure is immutable' using errcode='55000';
  end if;

  if v_old_status='draft' and v_new_status='draft' then
    return NEW;
  end if;

  if v_old_status='published' and v_new_status='published' then
    if TG_TABLE_NAME='axes' then
      if NEW.id is distinct from OLD.id
         or NEW.assessment_type_id is distinct from OLD.assessment_type_id
         or NEW.code is distinct from OLD.code
         or NEW.weight is distinct from OLD.weight
         or NEW.display_order is distinct from OLD.display_order
         or NEW.status is distinct from OLD.status
         or NEW.created_at is distinct from OLD.created_at then
        raise exception 'Published axis measurement/structure is immutable; only editorial axis text may change' using errcode='55000';
      end if;
      return NEW;
    elsif TG_TABLE_NAME='questions' then
      if NEW.id is distinct from OLD.id
         or NEW.axis_id is distinct from OLD.axis_id
         or NEW.assessment_type_id is distinct from OLD.assessment_type_id
         or NEW.code is distinct from OLD.code
         or NEW.question_type is distinct from OLD.question_type
         or NEW.display_order is distinct from OLD.display_order
         or NEW.is_required is distinct from OLD.is_required
         or NEW.trap_index is distinct from OLD.trap_index
         or NEW.status is distinct from OLD.status
         or NEW.created_at is distinct from OLD.created_at then
        raise exception 'Published question measurement/structure is immutable; only question text may change' using errcode='55000';
      end if;
      return NEW;
    elsif TG_TABLE_NAME='options' then
      if NEW.id is distinct from OLD.id
         or NEW.question_id is distinct from OLD.question_id
         or NEW.option_index is distinct from OLD.option_index
         or NEW.option_value is distinct from OLD.option_value
         or NEW.is_trap is distinct from OLD.is_trap
         or NEW.display_order is distinct from OLD.display_order
         or NEW.created_at is distinct from OLD.created_at then
        raise exception 'Published option measurement/structure is immutable; only option text may change' using errcode='55000';
      end if;
      return NEW;
    else
      raise exception 'Published assessment structure is immutable' using errcode='55000';
    end if;
  end if;

  raise exception 'Assessment version status change cannot bypass lifecycle controls' using errcode='55000';
end;
$function$;

commit;
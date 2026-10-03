-- P5 — Published content-only edit lifecycle
-- 2026-10-04
-- Published assessment versions may change only explicitly editorial fields.
-- Structural/measurement changes remain Draft-only.

begin;

create or replace function public.p2_assert_draft_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_status text;
  v_assessment_id uuid;
begin
  if TG_OP = 'DELETE' then
    if TG_TABLE_NAME = 'axes' then
      v_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'questions' then
      v_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'traps' then
      v_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'insights_mapping' then
      v_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'assessment_assets' then
      v_assessment_id := OLD.assessment_type_id;
    elsif TG_TABLE_NAME = 'options' then
      select q.assessment_type_id into v_assessment_id
      from public.questions q where q.id = OLD.question_id;
    end if;
  else
    if TG_TABLE_NAME = 'axes' then
      v_assessment_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'questions' then
      v_assessment_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'traps' then
      v_assessment_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'insights_mapping' then
      v_assessment_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'assessment_assets' then
      v_assessment_id := NEW.assessment_type_id;
    elsif TG_TABLE_NAME = 'options' then
      select q.assessment_type_id into v_assessment_id
      from public.questions q where q.id = NEW.question_id;
    end if;
  end if;

  select a.status into v_status
  from public.assessment_types a
  where a.id = v_assessment_id;

  if v_status = 'draft' then
    return coalesce(NEW, OLD);
  end if;

  if v_status = 'published' and TG_OP = 'UPDATE' then
    if TG_TABLE_NAME = 'axes' then
      if NEW.id is distinct from OLD.id
         or NEW.assessment_type_id is distinct from OLD.assessment_type_id
         or NEW.code is distinct from OLD.code
         or NEW.weight is distinct from OLD.weight
         or NEW.display_order is distinct from OLD.display_order
         or NEW.status is distinct from OLD.status
         or NEW.created_at is distinct from OLD.created_at
      then
        raise exception 'Published axis measurement/structure is immutable; only editorial axis text may change' using errcode='55000';
      end if;
      return NEW;
    elsif TG_TABLE_NAME = 'questions' then
      if NEW.id is distinct from OLD.id
         or NEW.axis_id is distinct from OLD.axis_id
         or NEW.assessment_type_id is distinct from OLD.assessment_type_id
         or NEW.code is distinct from OLD.code
         or NEW.question_type is distinct from OLD.question_type
         or NEW.display_order is distinct from OLD.display_order
         or NEW.is_required is distinct from OLD.is_required
         or NEW.trap_index is distinct from OLD.trap_index
         or NEW.status is distinct from OLD.status
         or NEW.created_at is distinct from OLD.created_at
      then
        raise exception 'Published question measurement/structure is immutable; only question text may change' using errcode='55000';
      end if;
      return NEW;
    elsif TG_TABLE_NAME = 'options' then
      if NEW.id is distinct from OLD.id
         or NEW.question_id is distinct from OLD.question_id
         or NEW.option_index is distinct from OLD.option_index
         or NEW.option_value is distinct from OLD.option_value
         or NEW.is_trap is distinct from OLD.is_trap
         or NEW.display_order is distinct from OLD.display_order
         or NEW.created_at is distinct from OLD.created_at
      then
        raise exception 'Published option measurement/structure is immutable; only option text may change' using errcode='55000';
      end if;
      return NEW;
    end if;
  end if;

  raise exception 'Published or archived assessment structure is immutable' using errcode='55000';
end;
$function$;

create or replace function public.p2_assessment_type_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if TG_OP = 'DELETE' then
    if OLD.status <> 'draft' then
      raise exception 'Published or archived assessment versions are immutable' using errcode='55000';
    end if;
    return OLD;
  end if;

  if OLD.status = 'archived' then
    raise exception 'Archived assessment versions are immutable' using errcode='55000';
  end if;

  if OLD.status = 'published' then
    if NEW.status is distinct from OLD.status
       or NEW.id is distinct from OLD.id
       or NEW.family_id is distinct from OLD.family_id
       or NEW.version is distinct from OLD.version
       or NEW.slug is distinct from OLD.slug
       or NEW.question_count is distinct from OLD.question_count
       or NEW.axis_count is distinct from OLD.axis_count
       or NEW.has_traps is distinct from OLD.has_traps
       or NEW.has_ev_simulator is distinct from OLD.has_ev_simulator
       or NEW.config_version is distinct from OLD.config_version
       or NEW.is_active is distinct from OLD.is_active
       or NEW.created_at is distinct from OLD.created_at
       or NEW.published_at is distinct from OLD.published_at
       or NEW.archived_at is distinct from OLD.archived_at
       or NEW.created_by is distinct from OLD.created_by
       or NEW.parent_id is distinct from OLD.parent_id
       or NEW.kpi_mappings is distinct from OLD.kpi_mappings
       or NEW.ev_mappings is distinct from OLD.ev_mappings
       or NEW.axis_roles is distinct from OLD.axis_roles
       or (NEW.updated_at is distinct from OLD.updated_at
           and NEW.title_ar is not distinct from OLD.title_ar
           and NEW.title_en is not distinct from OLD.title_en
           and NEW.description is not distinct from OLD.description)
    then
      raise exception 'Published assessment may only change approved editorial metadata' using errcode='55000';
    end if;
  end if;

  return NEW;
end;
$function$;

create or replace function public.update_published_assessment_content_secure(
  p_id uuid,
  p_title_ar text,
  p_title_en text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(a), a.family_id
    into v_before, v_family
  from public.assessment_types a
  where a.id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;
  if (v_before->>'status') <> 'published' then
    raise exception 'This operation is only for a Published assessment' using errcode='55000';
  end if;

  update public.assessment_types
     set title_ar=coalesce(nullif(trim(p_title_ar),''),title_ar),
         title_en=coalesce(p_title_en,title_en),
         description=p_description,
         updated_at=now()
   where id=p_id;

  perform public.write_admin_audit(
    'assessment.published_content_edit','assessment_types',p_id,v_family,
    v_before,(select to_jsonb(a) from public.assessment_types a where a.id=p_id)
  );

  return jsonb_build_object('success',true,'id',p_id,'status','published');
end;
$function$;

create or replace function public.update_published_axis_content_secure(
  p_axis_id uuid,
  p_title text,
  p_title_ar text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_assessment_status text;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(a), at.family_id, at.status
    into v_before, v_family, v_assessment_status
  from public.axes a
  join public.assessment_types at on at.id=a.assessment_type_id
  where a.id=p_axis_id
  for update;

  if not found then
    raise exception 'Axis not found' using errcode='P0002';
  end if;
  if v_assessment_status <> 'published' then
    raise exception 'This operation is only for a Published assessment' using errcode='55000';
  end if;

  update public.axes
     set title=coalesce(nullif(trim(p_title),''),title),
         title_ar=coalesce(nullif(trim(p_title_ar),''),title_ar),
         description=p_description,
         updated_at=now()
   where id=p_axis_id;

  perform public.write_admin_audit(
    'assessment.published_axis_content_edit','axes',p_axis_id,v_family,
    v_before,(select to_jsonb(a) from public.axes a where a.id=p_axis_id)
  );

  return jsonb_build_object('success',true,'id',p_axis_id);
end;
$function$;

create or replace function public.update_published_question_text_secure(
  p_question_id uuid,
  p_question_text text,
  p_question_text_ar text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(q), at.family_id, at.status
    into v_before, v_family, v_status
  from public.questions q
  join public.assessment_types at on at.id=q.assessment_type_id
  where q.id=p_question_id
  for update;

  if not found then
    raise exception 'Question not found' using errcode='P0002';
  end if;
  if v_status <> 'published' then
    raise exception 'This operation is only for a Published question' using errcode='55000';
  end if;

  update public.questions
     set question_text=coalesce(nullif(trim(p_question_text),''),question_text),
         question_text_ar=coalesce(nullif(trim(p_question_text_ar),''),question_text_ar),
         updated_at=now()
   where id=p_question_id;

  perform public.write_admin_audit(
    'assessment.published_question_text_edit','questions',p_question_id,v_family,
    v_before,(select to_jsonb(q) from public.questions q where q.id=p_question_id)
  );

  return jsonb_build_object('success',true,'id',p_question_id);
end;
$function$;

create or replace function public.update_published_option_text_secure(
  p_option_id uuid,
  p_label text,
  p_label_ar text,
  p_display_text text,
  p_display_text_ar text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(o), at.family_id, at.status
    into v_before, v_family, v_status
  from public.options o
  join public.questions q on q.id=o.question_id
  join public.assessment_types at on at.id=q.assessment_type_id
  where o.id=p_option_id
  for update;

  if not found then
    raise exception 'Option not found' using errcode='P0002';
  end if;
  if v_status <> 'published' then
    raise exception 'This operation is only for a Published option' using errcode='55000';
  end if;

  update public.options
     set label=coalesce(p_label,label),
         label_ar=coalesce(p_label_ar,label_ar),
         display_text=coalesce(p_display_text,display_text),
         display_text_ar=coalesce(p_display_text_ar,display_text_ar)
   where id=p_option_id;

  perform public.write_admin_audit(
    'assessment.published_option_text_edit','options',p_option_id,v_family,
    v_before,(select to_jsonb(o) from public.options o where o.id=p_option_id)
  );

  return jsonb_build_object('success',true,'id',p_option_id);
end;
$function$;

create or replace function public.save_assessment_secure(
  p_id uuid,p_title_ar text,p_title_en text,p_slug text,p_description text,
  p_status text,p_has_traps boolean,p_has_ev_simulator boolean
)
returns json
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_status text;
begin
  if p_id is null then
    return public.create_assessment_secure(
      lower(trim(p_slug)),p_title_ar,p_title_en,p_description,p_has_traps,p_has_ev_simulator
    )::json;
  end if;

  select status into v_status
  from public.assessment_types
  where id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v_status='published' then
    return public.update_published_assessment_content_secure(
      p_id,p_title_ar,p_title_en,p_description
    )::json;
  end if;

  if v_status='archived' then
    raise exception 'Archived assessment versions are immutable' using errcode='55000';
  end if;

  return public.update_assessment_working_copy_secure(
    p_id,p_title_ar,p_title_en,p_description,p_has_traps,p_has_ev_simulator
  )::json;
end;
$function$;

create or replace function public.update_option_secure(
  p_option_id uuid,
  p_label_ar text,
  p_option_value integer
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_status text;
  v_family uuid;
  v_before jsonb;
begin
  perform public.require_admin_capability('assessment.edit');

  select at.status,at.family_id,to_jsonb(o)
    into v_status,v_family,v_before
  from public.options o
  join public.questions q on q.id=o.question_id
  join public.assessment_types at on at.id=q.assessment_type_id
  where o.id=p_option_id
  for update;

  if not found then
    raise exception 'Option not found' using errcode='P0002';
  end if;

  if v_status='published' then
    if p_option_value is not null then
      raise exception 'Changing option score/value requires a new working copy' using errcode='55000';
    end if;

    update public.options
       set label_ar=coalesce(p_label_ar,label_ar)
     where id=p_option_id;

    perform public.write_admin_audit(
      'assessment.published_option_text_edit','options',p_option_id,v_family,v_before,
      (select to_jsonb(o) from public.options o where o.id=p_option_id)
    );
    return;
  end if;

  if v_status<>'draft' then
    raise exception 'Only working copies can be edited' using errcode='55000';
  end if;

  update public.options
     set label_ar=coalesce(p_label_ar,label_ar),
         option_value=coalesce(p_option_value,option_value)
   where id=p_option_id;

  perform public.write_admin_audit(
    'assessment.option.edit','options',p_option_id,v_family,v_before,
    (select to_jsonb(o) from public.options o where o.id=p_option_id)
  );
end;
$function$;

create or replace function public.update_assessment_status_secure(
  p_id uuid,p_status text,p_is_active boolean
)
returns json
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');

  select status into v_status
  from public.assessment_types
  where id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v_status='draft' and lower(coalesce(p_status,'draft'))='draft' then
    return json_build_object('success',true,'status','draft');
  end if;

  raise exception 'Drafts cannot be archived and publication lifecycle must use dedicated operations' using errcode='55000';
end;
$function$;

create or replace function public.delete_assessment_draft_secure(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_assessment public.assessment_types%rowtype;
  v_child_count integer;
  v_session_count integer;
  v_result_count integer;
  v_lead_count integer;
  v_before jsonb;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v_assessment
  from public.assessment_types
  where id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;
  if v_assessment.status <> 'draft' then
    raise exception 'Only working-copy drafts can be deleted' using errcode='55000';
  end if;
  if exists (select 1 from public.assessment_families where current_published_version_id=p_id) then
    raise exception 'The current public assessment cannot be deleted' using errcode='55000';
  end if;

  select count(*) into v_child_count from public.assessment_types where parent_id=p_id;
  select count(*) into v_session_count from public.sessions where assessment_type_id=p_id;
  select count(*) into v_result_count from public.assessment_results where assessment_type_id=p_id;
  select count(*) into v_lead_count from public.leads where assessment_type_id=p_id;

  if v_child_count > 0 then
    raise exception 'This working copy is referenced by another version and cannot be deleted' using errcode='55000';
  end if;

  if v_session_count > 0 or v_result_count > 0 or v_lead_count > 0 then
    raise exception 'A working copy with execution history cannot be deleted; preserve it as history' using errcode='55000';
  end if;

  v_before:=to_jsonb(v_assessment);
  perform public.write_admin_audit(
    'assessment.working_copy_delete','assessment_types',p_id,v_assessment.family_id,v_before,
    jsonb_build_object('deleted',true,'reason','working_copy_without_execution_history',
      'session_count',v_session_count,'result_count',v_result_count,'lead_count',v_lead_count)
  );

  delete from public.assessment_types where id=p_id;
  return jsonb_build_object('success',true,'deleted_version_id',p_id);
end;
$$;

revoke all on function public.update_published_assessment_content_secure(uuid,text,text,text) from public,anon;
grant execute on function public.update_published_assessment_content_secure(uuid,text,text,text) to authenticated;
revoke all on function public.update_published_axis_content_secure(uuid,text,text,text) from public,anon;
grant execute on function public.update_published_axis_content_secure(uuid,text,text,text) to authenticated;
revoke all on function public.update_published_question_text_secure(uuid,text,text) from public,anon;
grant execute on function public.update_published_question_text_secure(uuid,text,text) to authenticated;
revoke all on function public.update_published_option_text_secure(uuid,text,text,text,text) from public,anon;
grant execute on function public.update_published_option_text_secure(uuid,text,text,text,text) to authenticated;


 
create or replace function public.update_draft_axis_secure(
  p_axis_id uuid,
  p_title text,
  p_title_ar text,
  p_description text,
  p_weight numeric,
  p_display_order integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select to_jsonb(a),at.family_id,at.status
    into v_before,v_family,v_status
  from public.axes a join public.assessment_types at on at.id=a.assessment_type_id
  where a.id=p_axis_id for update;
  if not found then raise exception 'Axis not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Structural axis edits require a working copy' using errcode='55000'; end if;

  update public.axes
     set title=coalesce(nullif(trim(p_title),''),title),
         title_ar=coalesce(nullif(trim(p_title_ar),''),title_ar),
         description=coalesce(p_description,description),
         weight=coalesce(p_weight,weight),
         display_order=coalesce(p_display_order,display_order),
         updated_at=now()
   where id=p_axis_id;

  perform public.write_admin_audit(
    'assessment.axis.edit','axes',p_axis_id,v_family,v_before,
    (select to_jsonb(a) from public.axes a where a.id=p_axis_id)
  );
  return jsonb_build_object('success',true,'id',p_axis_id);
end;
$function$;

create or replace function public.update_draft_question_secure(
  p_question_id uuid,
  p_question_text text,
  p_question_text_ar text,
  p_axis_id uuid,
  p_display_order integer,
  p_is_required boolean,
  p_trap_index integer
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
  v_assessment uuid;
  v_axis_assessment uuid;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(q),at.family_id,at.status,at.id
    into v_before,v_family,v_status,v_assessment
  from public.questions q join public.assessment_types at on at.id=q.assessment_type_id
  where q.id=p_question_id for update;

  if not found then raise exception 'Question not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Structural question edits require a working copy' using errcode='55000'; end if;

  if p_axis_id is not null then
    select assessment_type_id into v_axis_assessment from public.axes where id=p_axis_id;
    if v_axis_assessment is null then raise exception 'Axis not found' using errcode='P0002'; end if;
    if v_axis_assessment<>v_assessment then raise exception 'Axis belongs to another assessment' using errcode='23514'; end if;
  end if;

  update public.questions
     set question_text=coalesce(nullif(trim(p_question_text),''),question_text),
         question_text_ar=coalesce(nullif(trim(p_question_text_ar),''),question_text_ar),
         axis_id=coalesce(p_axis_id,axis_id),
         display_order=coalesce(p_display_order,display_order),
         is_required=coalesce(p_is_required,is_required),
         trap_index=p_trap_index,
         updated_at=now()
   where id=p_question_id;

  perform public.write_admin_audit(
    'assessment.question.edit','questions',p_question_id,v_family,v_before,
    (select to_jsonb(q) from public.questions q where q.id=p_question_id)
  );
  return jsonb_build_object('success',true,'id',p_question_id);
end;
$function$;

revoke all on function public.update_draft_axis_secure(uuid,text,text,text,numeric,integer) from public,anon;
grant execute on function public.update_draft_axis_secure(uuid,text,text,text,numeric,integer) to authenticated;
revoke all on function public.update_draft_question_secure(uuid,text,text,uuid,integer,boolean,integer) from public,anon;
grant execute on function public.update_draft_question_secure(uuid,text,text,uuid,integer,boolean,integer) to authenticated;


create or replace function public.update_draft_question_text_secure(
  p_question_id uuid,
  p_question_text text,
  p_question_text_ar text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select to_jsonb(q),at.family_id,at.status
    into v_before,v_family,v_status
  from public.questions q
  join public.assessment_types at on at.id=q.assessment_type_id
  where q.id=p_question_id
  for update;
  if not found then raise exception 'Question not found' using errcode='P0002'; end if;
  if v_status<>'draft' then
    raise exception 'Draft question content operation requires a working copy' using errcode='55000';
  end if;

  update public.questions
     set question_text=coalesce(nullif(trim(p_question_text),''),question_text),
         question_text_ar=coalesce(nullif(trim(p_question_text_ar),''),question_text_ar),
         updated_at=now()
   where id=p_question_id;

  perform public.write_admin_audit(
    'assessment.question.edit','questions',p_question_id,v_family,v_before,
    (select to_jsonb(q) from public.questions q where q.id=p_question_id)
  );
  return jsonb_build_object('success',true,'id',p_question_id);
end;
$function$;

create or replace function public.update_draft_axis_content_secure(
  p_axis_id uuid,
  p_title text,
  p_title_ar text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select to_jsonb(a),at.family_id,at.status
    into v_before,v_family,v_status
  from public.axes a
  join public.assessment_types at on at.id=a.assessment_type_id
  where a.id=p_axis_id
  for update;
  if not found then raise exception 'Axis not found' using errcode='P0002'; end if;
  if v_status<>'draft' then
    raise exception 'Draft axis content operation requires a working copy' using errcode='55000';
  end if;

  update public.axes
     set title=coalesce(nullif(trim(p_title),''),title),
         title_ar=coalesce(nullif(trim(p_title_ar),''),title_ar),
         description=coalesce(p_description,description),
         updated_at=now()
   where id=p_axis_id;

  perform public.write_admin_audit(
    'assessment.axis.edit','axes',p_axis_id,v_family,v_before,
    (select to_jsonb(a) from public.axes a where a.id=p_axis_id)
  );
  return jsonb_build_object('success',true,'id',p_axis_id);
end;
$function$;

revoke all on function public.update_draft_question_text_secure(uuid,text,text) from public,anon;
grant execute on function public.update_draft_question_text_secure(uuid,text,text) to authenticated;

revoke all on function public.update_draft_axis_content_secure(uuid,text,text,text) from public,anon;
grant execute on function public.update_draft_axis_content_secure(uuid,text,text,text) to authenticated;

commit;

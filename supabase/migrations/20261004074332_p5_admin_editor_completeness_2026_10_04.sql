begin;

create or replace function public.update_draft_option_secure(
  p_option_id uuid,
  p_label text,
  p_label_ar text,
  p_option_value numeric,
  p_option_index integer,
  p_display_order integer,
  p_is_trap boolean,
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

  select to_jsonb(o),at.family_id,at.status
    into v_before,v_family,v_status
  from public.options o
  join public.questions q on q.id=o.question_id
  join public.assessment_types at on at.id=q.assessment_type_id
  where o.id=p_option_id
  for update;

  if not found then
    raise exception 'Option not found' using errcode='P0002';
  end if;
  if v_status<>'draft' then
    raise exception 'Draft option editing requires a working copy' using errcode='55000';
  end if;
  if p_option_value is not null and (p_option_value < 0 or p_option_value > 100) then
    raise exception 'Option score must be between 0 and 100' using errcode='22023';
  end if;
  if p_option_index is not null and p_option_index < 0 then
    raise exception 'Option index cannot be negative' using errcode='22023';
  end if;
  if p_display_order is not null and p_display_order < 1 then
    raise exception 'Option display order must be positive' using errcode='22023';
  end if;

  update public.options
     set label=coalesce(nullif(trim(p_label),''),label),
         label_ar=coalesce(nullif(trim(p_label_ar),''),label_ar),
         option_value=coalesce(p_option_value,option_value),
         option_index=coalesce(p_option_index,option_index),
         display_order=coalesce(p_display_order,display_order),
         is_trap=coalesce(p_is_trap,is_trap),
         display_text=coalesce(p_display_text,display_text),
         display_text_ar=coalesce(p_display_text_ar,display_text_ar)
   where id=p_option_id;

  perform public.write_admin_audit(
    'assessment.option.edit','options',p_option_id,v_family,v_before,
    (select to_jsonb(o) from public.options o where o.id=p_option_id)
  );

  return jsonb_build_object('success',true,'id',p_option_id);
end;
$function$;

create or replace function public.delete_draft_question_secure(p_question_id uuid)
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
  v_code text;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(q),at.family_id,at.status,at.id,q.code
    into v_before,v_family,v_status,v_assessment,v_code
  from public.questions q
  join public.assessment_types at on at.id=q.assessment_type_id
  where q.id=p_question_id
  for update;

  if not found then
    raise exception 'Question not found' using errcode='P0002';
  end if;
  if v_status<>'draft' then
    raise exception 'Only draft questions can be deleted' using errcode='55000';
  end if;

  delete from public.traps
   where assessment_type_id=v_assessment
     and (question_id=v_code or validates=v_code);

  delete from public.questions where id=p_question_id;

  update public.assessment_types
     set question_count=(select count(*) from public.questions where assessment_type_id=v_assessment),
         updated_at=now()
   where id=v_assessment;

  perform public.write_admin_audit(
    'assessment.question.delete','questions',p_question_id,v_family,v_before,
    jsonb_build_object('deleted',true)
  );

  return jsonb_build_object('success',true,'id',p_question_id);
end;
$function$;

create or replace function public.delete_draft_axis_secure(p_axis_id uuid)
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
  v_code text;
  v_question_codes text[];
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(a),at.family_id,at.status,at.id,a.code
    into v_before,v_family,v_status,v_assessment,v_code
  from public.axes a
  join public.assessment_types at on at.id=a.assessment_type_id
  where a.id=p_axis_id
  for update;

  if not found then
    raise exception 'Axis not found' using errcode='P0002';
  end if;
  if v_status<>'draft' then
    raise exception 'Only draft axes can be deleted' using errcode='55000';
  end if;

  select coalesce(array_agg(q.code),array[]::text[])
    into v_question_codes
  from public.questions q
  where q.axis_id=p_axis_id;

  delete from public.traps
   where assessment_type_id=v_assessment
     and (
       target_axis=v_code
       or question_id = any(v_question_codes)
       or validates = any(v_question_codes)
     );

  delete from public.axes where id=p_axis_id;

  update public.assessment_types
     set axis_count=(select count(*) from public.axes where assessment_type_id=v_assessment),
         question_count=(select count(*) from public.questions where assessment_type_id=v_assessment),
         updated_at=now()
   where id=v_assessment;

  perform public.write_admin_audit(
    'assessment.axis.delete','axes',p_axis_id,v_family,v_before,
    jsonb_build_object('deleted',true,'deleted_question_count',coalesce(array_length(v_question_codes,1),0))
  );

  return jsonb_build_object('success',true,'id',p_axis_id);
end;
$function$;

create or replace function public.update_draft_calculation_config_secure(
  p_id uuid,
  p_axis_roles jsonb,
  p_kpi_mappings jsonb,
  p_ev_mappings jsonb
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
  v_bad boolean;
  v_axis_codes text[];
  v_role text;
  v_key text;
  v_map jsonb;
  v_weight numeric;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(a),a.family_id,a.status
    into v_before,v_family,v_status
  from public.assessment_types a
  where a.id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;
  if v_status<>'draft' then
    raise exception 'Calculation configuration can only be changed on a draft' using errcode='55000';
  end if;

  if jsonb_typeof(coalesce(p_axis_roles,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_kpi_mappings,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_ev_mappings,'{}'::jsonb)) <> 'object'
  then
    raise exception 'Calculation configuration must be JSON objects' using errcode='22023';
  end if;

  select coalesce(array_agg(code),array[]::text[])
    into v_axis_codes
  from public.axes
  where assessment_type_id=p_id;

  for v_key, v_role in
    select key,value from jsonb_each_text(coalesce(p_axis_roles,'{}'::jsonb))
  loop
    if not (v_key = any(v_axis_codes)) then
      raise exception 'Axis role mapping references an unknown axis code: %',v_key using errcode='22023';
    end if;
    if nullif(trim(v_role),'') is null then
      raise exception 'Axis role cannot be empty for %',v_key using errcode='22023';
    end if;
  end loop;

  for v_key, v_map in
    select key,value from jsonb_each(coalesce(p_kpi_mappings,'{}'::jsonb))
  loop
    if jsonb_typeof(v_map) <> 'object' then
      raise exception 'KPI mapping % must be an object',v_key using errcode='22023';
    end if;
    if not exists (
      select 1 from jsonb_each(v_map) e
      where jsonb_typeof(e.value)='number'
        and (e.value::text)::numeric >= 0
    ) then
      raise exception 'KPI mapping % must contain at least one non-negative numeric weight',v_key using errcode='22023';
    end if;
    if coalesce((select sum((e.value::text)::numeric) from jsonb_each(v_map) e),0) <= 0 then
      raise exception 'KPI mapping % must have a positive total weight',v_key using errcode='22023';
    end if;
  end loop;

  for v_key, v_map in
    select key,value from jsonb_each(coalesce(p_ev_mappings,'{}'::jsonb))
  loop
    if jsonb_typeof(v_map) <> 'object' then
      raise exception 'EV mapping % must be an object',v_key using errcode='22023';
    end if;
    if coalesce((select sum((e.value::text)::numeric) from jsonb_each(v_map) e
                 where jsonb_typeof(e.value)='number'),0) <= 0 then
      raise exception 'EV mapping % must have a positive total weight',v_key using errcode='22023';
    end if;
    if exists (
      select 1 from jsonb_each(v_map) e
      where jsonb_typeof(e.value)<>'number' or (e.value::text)::numeric < 0
    ) then
      raise exception 'EV mapping % contains an invalid weight',v_key using errcode='22023';
    end if;
  end loop;

  update public.assessment_types
     set axis_roles=coalesce(p_axis_roles,'{}'::jsonb),
         kpi_mappings=coalesce(p_kpi_mappings,'{}'::jsonb),
         ev_mappings=coalesce(p_ev_mappings,'{}'::jsonb),
         updated_at=now()
   where id=p_id;

  perform public.write_admin_audit(
    'assessment.calculation_config.edit','assessment_types',p_id,v_family,v_before,
    (select to_jsonb(a) from public.assessment_types a where a.id=p_id)
  );

  return jsonb_build_object('success',true,'id',p_id);
end;
$function$;

-- A true never-published Draft is permanently deletable. A copied Draft is independent;
-- parent provenance must not block deletion. Draft-local trap rows are removed first.
create or replace function public.delete_assessment_draft_secure(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_assessment public.assessment_types%rowtype;
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

  select count(*) into v_session_count from public.sessions where assessment_type_id=p_id;
  select count(*) into v_result_count from public.assessment_results where assessment_type_id=p_id;
  select count(*) into v_lead_count from public.leads where assessment_type_id=p_id;

  if v_session_count > 0 or v_result_count > 0 or v_lead_count > 0 then
    raise exception 'A working copy with execution history cannot be deleted; preserve it as history' using errcode='55000';
  end if;

  v_before:=to_jsonb(v_assessment);

  delete from public.traps where assessment_type_id=p_id;

  perform public.write_admin_audit(
    'assessment.working_copy_delete','assessment_types',p_id,v_assessment.family_id,v_before,
    jsonb_build_object('deleted',true,'reason','working_copy_without_execution_history',
      'session_count',v_session_count,'result_count',v_result_count,'lead_count',v_lead_count)
  );

  delete from public.assessment_types where id=p_id;

  return jsonb_build_object('success',true,'deleted_version_id',p_id);
end;
$function$;

revoke all on function public.update_draft_option_secure(uuid,text,text,numeric,integer,integer,boolean,text,text) from public,anon;
grant execute on function public.update_draft_option_secure(uuid,text,text,numeric,integer,integer,boolean,text,text) to authenticated;

revoke all on function public.delete_draft_question_secure(uuid) from public,anon;
grant execute on function public.delete_draft_question_secure(uuid) to authenticated;

revoke all on function public.delete_draft_axis_secure(uuid) from public,anon;
grant execute on function public.delete_draft_axis_secure(uuid) to authenticated;

revoke all on function public.update_draft_calculation_config_secure(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.update_draft_calculation_config_secure(uuid,jsonb,jsonb,jsonb) to authenticated;

revoke all on function public.delete_assessment_draft_secure(uuid) from public,anon;
grant execute on function public.delete_assessment_draft_secure(uuid) to authenticated;

commit;
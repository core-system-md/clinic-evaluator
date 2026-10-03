create or replace function public.create_assessment_version_secure(p_source_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_source public.assessment_types%rowtype;
  v_new_id uuid:=gen_random_uuid();
  v_next_version integer;
  v_new_slug text;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v_source
  from public.assessment_types
  where id=p_source_version_id
  for update;

  if not found then raise exception 'Source assessment version not found' using errcode='P0002'; end if;
  if v_source.status not in ('draft','published') then
    raise exception 'Only draft or published versions can be used as a source' using errcode='55000';
  end if;

  perform 1 from public.assessment_families where id=v_source.family_id for update;
  select coalesce(max(version),0)+1 into v_next_version
  from public.assessment_types where family_id=v_source.family_id;

  v_new_slug:=v_source.slug||'--v'||v_next_version;

  insert into public.assessment_types(
    id,slug,title_ar,title_en,description,question_count,axis_count,
    has_traps,has_ev_simulator,config_version,is_active,status,version,
    created_at,updated_at,created_by,parent_id,kpi_mappings,ev_mappings,axis_roles,family_id
  )
  values(
    v_new_id,v_new_slug,v_source.title_ar,v_source.title_en,v_source.description,
    v_source.question_count,v_source.axis_count,v_source.has_traps,v_source.has_ev_simulator,
    v_source.config_version,true,'draft',v_next_version,now(),now(),
    (select auth.uid()),v_source.id,v_source.kpi_mappings,v_source.ev_mappings,v_source.axis_roles,v_source.family_id
  );

  create temp table _p5_axis_map(old_id uuid primary key,new_id uuid not null) on commit drop;
  create temp table _p5_question_map(old_id uuid primary key,new_id uuid not null) on commit drop;

  insert into _p5_axis_map
  select a.id,gen_random_uuid() from public.axes a where a.assessment_type_id=v_source.id;
  insert into public.axes(id,assessment_type_id,code,title,title_ar,description,weight,display_order,status,created_at,updated_at)
  select m.new_id,v_new_id,a.code,a.title,a.title_ar,a.description,a.weight,a.display_order,a.status,now(),now()
  from public.axes a join _p5_axis_map m on m.old_id=a.id;

  insert into _p5_question_map
  select q.id,gen_random_uuid() from public.questions q where q.assessment_type_id=v_source.id;
  insert into public.questions(
    id,axis_id,assessment_type_id,code,question_text,question_text_ar,question_type,
    display_order,is_required,trap_index,status,created_at,updated_at,impact,layer,trap_for
  )
  select m.new_id,am.new_id,v_new_id,q.code,q.question_text,q.question_text_ar,q.question_type,
         q.display_order,q.is_required,q.trap_index,q.status,now(),now(),q.impact,q.layer,q.trap_for
  from public.questions q
  join _p5_question_map m on m.old_id=q.id
  join _p5_axis_map am on am.old_id=q.axis_id;

  insert into public.options(
    id,question_id,option_index,option_value,label,label_ar,display_text,display_text_ar,is_trap,display_order,created_at
  )
  select gen_random_uuid(),qm.new_id,o.option_index,o.option_value,o.label,o.label_ar,o.display_text,o.display_text_ar,o.is_trap,o.display_order,now()
  from public.options o join _p5_question_map qm on qm.old_id=o.question_id;

  insert into public.traps(
    id,assessment_type_id,name,question_id,validates,target_axis,penalty_base,penalty_max,message,message_ar,created_at
  )
  select gen_random_uuid(),v_new_id,t.name,
    case
      when t.question_id ~* '^[0-9a-f-]{36}$'
        then coalesce((select qm.new_id::text from _p5_question_map qm where qm.old_id=t.question_id::uuid),t.question_id)
      else t.question_id
    end,
    t.validates,t.target_axis,t.penalty_base,t.penalty_max,t.message,t.message_ar,now()
  from public.traps t
  where t.assessment_type_id=v_source.id;

  insert into public.insights_mapping(
    id,assessment_type_id,insight_code,severity,title,title_ar,message,message_ar,
    recommendation,recommendation_ar,category,display_order,is_active,created_at,updated_at
  )
  select gen_random_uuid(),v_new_id,i.insight_code,i.severity,i.title,i.title_ar,i.message,i.message_ar,
         i.recommendation,i.recommendation_ar,i.category,i.display_order,i.is_active,now(),now()
  from public.insights_mapping i where i.assessment_type_id=v_source.id;

  insert into public.assessment_assets(
    id,assessment_type_id,asset_type,file_url,file_name,file_size,mime_type,
    alt_text,alt_text_ar,display_order,is_active,created_at,updated_at
  )
  select gen_random_uuid(),v_new_id,a.asset_type,a.file_url,a.file_name,a.file_size,a.mime_type,
         a.alt_text,a.alt_text_ar,a.display_order,a.is_active,now(),now()
  from public.assessment_assets a where a.assessment_type_id=v_source.id;

  perform public.write_admin_audit(
    'assessment.create_working_copy','assessment_types',v_new_id,v_source.family_id,null,
    jsonb_build_object('source_version_id',v_source.id,'version',v_next_version)
  );
  return v_new_id;
end;
$$;

revoke execute on function public.save_option_secure(uuid,integer,integer,text,text,text,text,boolean,integer)
  from public,anon,authenticated;
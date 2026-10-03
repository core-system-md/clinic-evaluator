create or replace function public.import_assessment_secure(p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_family_id uuid;
  v_assessment_id uuid:=gen_random_uuid();
  v_slug text:=lower(trim(coalesce(p_data->>'slug','')));
  v_ax jsonb; v_q jsonb; v_opt jsonb;
  v_axis_id uuid; v_question_id uuid;
  i integer; j integer; k integer;
  v_axis_count integer:=0; v_question_count integer:=0;
begin
  perform public.require_admin_capability('assessment.import');
  if v_slug='' then raise exception 'Imported assessment requires a stable public key' using errcode='22023'; end if;
  insert into public.assessment_families(slug,created_by)
  values(v_slug,(select auth.uid())) returning id into v_family_id;

  insert into public.assessment_types(
    id,slug,title_ar,title_en,description,status,has_traps,has_ev_simulator,
    is_active,version,question_count,axis_count,created_by,family_id
  ) values(
    v_assessment_id,v_slug,p_data->>'title_ar',p_data->>'title_en',p_data->>'description',
    'draft',coalesce((p_data->>'has_traps')::boolean,false),
    coalesce((p_data->>'has_ev_simulator')::boolean,false),true,1,0,0,
    (select auth.uid()),v_family_id
  );

  if jsonb_typeof(p_data->'axes')='array' then
    for i in 0..jsonb_array_length(p_data->'axes')-1 loop
      v_ax:=p_data->'axes'->i;
      v_axis_id:=gen_random_uuid();
      insert into public.axes(id,assessment_type_id,title_ar,title,code,weight,display_order,status)
      values(v_axis_id,v_assessment_id,coalesce(v_ax->>'title_ar',v_ax->>'title','محور'),
             coalesce(v_ax->>'title',v_ax->>'title_ar','Axis'),
             coalesce(v_ax->>'code','AX'||substr(md5(random()::text),1,6)),
             coalesce((v_ax->>'weight')::numeric,10),i+1,'active');
      v_axis_count:=v_axis_count+1;

      if jsonb_typeof(v_ax->'questions')='array' then
        for j in 0..jsonb_array_length(v_ax->'questions')-1 loop
          v_q:=v_ax->'questions'->j;
          v_question_id:=gen_random_uuid();
          insert into public.questions(
            id,assessment_type_id,axis_id,question_text_ar,question_text,code,question_type,
            display_order,is_required,status
          ) values(
            v_question_id,v_assessment_id,v_axis_id,coalesce(v_q->>'text_ar',v_q->>'text','سؤال'),
            coalesce(v_q->>'text',v_q->>'text_ar','Question'),
            coalesce(v_q->>'code','Q'||substr(md5(random()::text),1,6)),
            coalesce(v_q->>'question_type','select'),j+1,coalesce((v_q->>'is_required')::boolean,true),'active'
          );
          v_question_count:=v_question_count+1;

          if jsonb_typeof(v_q->'options')='array' then
            for k in 0..jsonb_array_length(v_q->'options')-1 loop
              v_opt:=v_q->'options'->k;
              insert into public.options(
                question_id,label_ar,label,option_value,option_index,display_order,is_trap
              ) values(
                v_question_id,coalesce(v_opt->>'label_ar',v_opt->>'label','خيار'),
                coalesce(v_opt->>'label',v_opt->>'label_ar','Option'),
                coalesce((v_opt->>'value')::integer,0),k,k+1,
                coalesce((v_opt->>'is_trap')::boolean,false)
              );
            end loop;
          end if;
        end loop;
      end if;
    end loop;
  end if;

  update public.assessment_types
  set axis_count=v_axis_count,question_count=v_question_count,updated_at=now()
  where id=v_assessment_id;

  perform public.write_admin_audit(
    'assessment.import','assessment_types',v_assessment_id,v_family_id,null,
    jsonb_build_object('family_id',v_family_id,'status','draft','axis_count',v_axis_count,'question_count',v_question_count)
  );
  return v_assessment_id;
end;
$$;

create or replace function public.save_axis_secure(
  p_assessment_type_id uuid,p_title text,p_title_ar text,p_code varchar,p_weight numeric,p_display_order integer default 1
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_status text; v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select status,family_id into v_status,v_family from public.assessment_types where id=p_assessment_type_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  insert into public.axes(assessment_type_id,title,title_ar,code,weight,display_order,status,description)
  values(p_assessment_type_id,coalesce(p_title,p_title_ar,'محور بدون اسم'),coalesce(p_title_ar,p_title,'محور بدون اسم'),
    coalesce(p_code,'AX_'||extract(epoch from now())::integer),coalesce(p_weight,10),coalesce(p_display_order,1),'active','')
  returning id into v_id;
  update public.assessment_types set axis_count=(select count(*) from public.axes where assessment_type_id=p_assessment_type_id),updated_at=now()
  where id=p_assessment_type_id;
  perform public.write_admin_audit('assessment.axis.add','axes',v_id,v_family,null,
    (select to_jsonb(a) from public.axes a where a.id=v_id));
  return v_id;
end; $$;

create or replace function public.save_question_secure(
  p_assessment_type_id uuid,p_axis_id uuid,p_question_text text,p_question_text_ar text,p_code varchar,
  p_question_type varchar default 'select',p_display_order integer default 1,p_is_required boolean default true,p_trap_index integer default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_status text; v_axis_assessment uuid; v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select status,family_id into v_status,v_family from public.assessment_types where id=p_assessment_type_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  select assessment_type_id into v_axis_assessment from public.axes where id=p_axis_id;
  if v_axis_assessment is null then raise exception 'Axis not found' using errcode='P0002'; end if;
  if v_axis_assessment<>p_assessment_type_id then raise exception 'Axis belongs to another assessment' using errcode='23514'; end if;
  if coalesce(p_question_type,'select')<>'select' then raise exception 'Unsupported question type' using errcode='22023'; end if;

  insert into public.questions(assessment_type_id,axis_id,question_text,question_text_ar,code,question_type,display_order,is_required,trap_index,status)
  values(p_assessment_type_id,p_axis_id,coalesce(p_question_text,p_question_text_ar,'سؤال بدون نص'),
    coalesce(p_question_text_ar,p_question_text,'سؤال بدون نص'),coalesce(p_code,'Q_'||extract(epoch from now())::integer),
    coalesce(p_question_type,'select'),coalesce(p_display_order,1),coalesce(p_is_required,true),p_trap_index,'active')
  returning id into v_id;
  update public.assessment_types set question_count=(select count(*) from public.questions where assessment_type_id=p_assessment_type_id),updated_at=now()
  where id=p_assessment_type_id;
  perform public.write_admin_audit('assessment.question.add','questions',v_id,v_family,null,
    (select to_jsonb(q) from public.questions q where q.id=v_id));
  return v_id;
end; $$;

create or replace function public.add_option_secure(
 p_question_id uuid,p_label_ar text,p_label text,p_option_value integer,p_option_index integer,p_display_order integer,p_is_trap boolean default false
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_assessment uuid; v_status text; v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select q.assessment_type_id,a.status,a.family_id into v_assessment,v_status,v_family
  from public.questions q join public.assessment_types a on a.id=q.assessment_type_id where q.id=p_question_id;
  if v_assessment is null then raise exception 'Question not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  insert into public.options(question_id,label_ar,label,option_value,option_index,display_order,is_trap)
  values(p_question_id,coalesce(p_label_ar,p_label,'خيار'),coalesce(p_label,p_label_ar,'Option'),
    coalesce(p_option_value,0),coalesce(p_option_index,0),coalesce(p_display_order,1),coalesce(p_is_trap,false))
  returning id into v_id;
  perform public.write_admin_audit('assessment.option.add','options',v_id,v_family,null,
    (select to_jsonb(o) from public.options o where o.id=v_id));
  return v_id;
end; $$;

create or replace function public.update_option_secure(p_option_id uuid,p_label_ar text,p_option_value integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text; v_family uuid; v_before jsonb;
begin
  perform public.require_admin_capability('assessment.edit');
  select a.status,a.family_id,to_jsonb(o) into v_status,v_family,v_before
  from public.options o join public.questions q on q.id=o.question_id join public.assessment_types a on a.id=q.assessment_type_id
  where o.id=p_option_id;
  if not found then raise exception 'Option not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  update public.options set label_ar=coalesce(p_label_ar,label_ar),option_value=coalesce(p_option_value,option_value) where id=p_option_id;
  perform public.write_admin_audit('assessment.option.edit','options',p_option_id,v_family,v_before,
    (select to_jsonb(o) from public.options o where o.id=p_option_id));
end; $$;

create or replace function public.delete_option_secure(p_option_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text; v_family uuid; v_before jsonb; v_deleted integer;
begin
  perform public.require_admin_capability('assessment.edit');
  select a.status,a.family_id,to_jsonb(o) into v_status,v_family,v_before
  from public.options o join public.questions q on q.id=o.question_id join public.assessment_types a on a.id=q.assessment_type_id
  where o.id=p_option_id;
  if not found then return false; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  delete from public.options where id=p_option_id;
  get diagnostics v_deleted=row_count;
  if v_deleted>0 then perform public.write_admin_audit('assessment.option.delete','options',p_option_id,v_family,v_before,null); end if;
  return v_deleted>0;
end; $$;

create or replace function public.update_assessment_status_secure(p_id uuid,p_status text,p_is_active boolean)
returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text; v_family uuid; v_before jsonb;
begin
  perform public.require_admin_capability('assessment.edit');
  select status,family_id,to_jsonb(a) into v_status,v_family,v_before from public.assessment_types a where id=p_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status='published' then raise exception 'Published versions require the publication lifecycle operations' using errcode='55000'; end if;
  if v_status='archived' then raise exception 'Archived versions are immutable' using errcode='55000'; end if;
  if lower(p_status) not in ('draft','archived') then raise exception 'Invalid status transition' using errcode='22023'; end if;
  update public.assessment_types set status=lower(p_status),is_active=p_is_active,archived_at=case when lower(p_status)='archived' then now() else null end,updated_at=now() where id=p_id;
  perform public.write_admin_audit('assessment.status_change','assessment_types',p_id,v_family,v_before,
    (select to_jsonb(a) from public.assessment_types a where a.id=p_id));
  return json_build_object('success',true,'status',lower(p_status));
end; $$;

grant execute on function public.import_assessment_secure(jsonb) to authenticated;

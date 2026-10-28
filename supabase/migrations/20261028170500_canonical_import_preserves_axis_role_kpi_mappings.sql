-- Preserve role/KPI metadata in secure imports and validate its relationship to measured axes.
create or replace function public.import_assessment_secure(p_data jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_family uuid;v_id uuid:=gen_random_uuid();v_slug text:=lower(trim(coalesce(p_data->>'slug','')));
 v_ax jsonb;v_q jsonb;v_o jsonb;v_axis uuid;v_qid uuid;v_k text;v_map jsonb;v_sum numeric;v_role_key text;
 i integer;j integer;k integer;v_ac integer:=0;v_qc integer:=0;
begin
 perform public.require_admin_capability('assessment.import');
 if v_slug='' then raise exception 'Stable assessment slug required' using errcode='22023'; end if;
 if p_data ? 'axis_roles' or p_data ? 'kpi_mappings' then
  if jsonb_typeof(p_data->'axes') is distinct from 'array' or jsonb_array_length(p_data->'axes')=0 then raise exception 'Mapped import requires a nonempty axes array' using errcode='22023'; end if;
  if jsonb_typeof(p_data->'axis_roles') is distinct from 'object' or jsonb_typeof(p_data->'kpi_mappings') is distinct from 'object' or jsonb_object_length(p_data->'axis_roles')=0 or jsonb_object_length(p_data->'kpi_mappings')=0 then raise exception 'Mapped import requires role and KPI maps' using errcode='22023'; end if;
  if jsonb_object_length(p_data->'axis_roles')<>(select count(*) from jsonb_array_elements(p_data->'axes')) then raise exception 'Each axis must have one role binding' using errcode='22023'; end if;
  for v_role_key in select key from jsonb_each(p_data->'axis_roles') loop
   if not exists(select 1 from jsonb_array_elements(p_data->'axes') a where a->>'code'=v_role_key) then raise exception 'Unknown axis in role map: %',v_role_key using errcode='22023'; end if;
  end loop;
  for v_k,v_map in select key,value from jsonb_each(p_data->'kpi_mappings') loop
   if jsonb_typeof(v_map) is distinct from 'object' or jsonb_object_length(v_map)=0 then raise exception 'Empty KPI map: %',v_k using errcode='22023'; end if;
   if exists(select 1 from jsonb_each_text(v_map) m where not exists(select 1 from jsonb_each_text(p_data->'axis_roles') r where r.value=m.key)) then raise exception 'KPI % refers to an unmeasured role',v_k using errcode='22023'; end if;
   begin select sum(value::numeric) into v_sum from jsonb_each_text(v_map); exception when invalid_text_representation then raise exception 'Nonnumeric KPI weight: %',v_k using errcode='22023'; end;
   if abs(coalesce(v_sum,0)-1)>0.000001 then raise exception 'KPI % weights must sum to 1',v_k using errcode='22023'; end if;
  end loop;
 end if;
 insert into public.assessment_families(slug,created_by) values(v_slug,(select auth.uid())) returning id into v_family;
 insert into public.assessment_types(id,slug,title_ar,title_en,description,status,has_traps,has_ev_simulator,is_active,version,question_count,axis_count,created_by,family_id,axis_roles,kpi_mappings,ev_mappings)
 values(v_id,v_slug,p_data->>'title_ar',p_data->>'title_en',p_data->>'description','draft',coalesce((p_data->>'has_traps')::boolean,false),coalesce((p_data->>'has_ev_simulator')::boolean,false),true,1,0,0,(select auth.uid()),v_family,coalesce(p_data->'axis_roles','{}'::jsonb),coalesce(p_data->'kpi_mappings','{}'::jsonb),coalesce(p_data->'ev_mappings','{}'::jsonb));
 if jsonb_typeof(p_data->'axes')='array' then
  for i in 0..jsonb_array_length(p_data->'axes')-1 loop
   v_ax:=p_data->'axes'->i;
   insert into public.axes(assessment_type_id,title,title_ar,code,weight,display_order,status,description) values(v_id,coalesce(v_ax->>'title',v_ax->>'title_ar'),coalesce(v_ax->>'title_ar',v_ax->>'title'),coalesce(v_ax->>'code','AX'||substr(md5(random()::text),1,6)),coalesce((v_ax->>'weight')::numeric,10),i+1,'active',v_ax->>'description') returning id into v_axis;v_ac:=v_ac+1;
   for j in 0..jsonb_array_length(v_ax->'questions')-1 loop
    v_q:=v_ax->'questions'->j;
    insert into public.questions(assessment_type_id,axis_id,question_text_ar,question_text,code,question_type,display_order,is_required,status) values(v_id,v_axis,v_q->>'text_ar',v_q->>'text',v_q->>'code',coalesce(v_q->>'question_type','select'),j+1,coalesce((v_q->>'is_required')::boolean,true),'active') returning id into v_qid;v_qc:=v_qc+1;
    for k in 0..jsonb_array_length(v_q->'options')-1 loop
     v_o:=v_q->'options'->k;
     insert into public.options(id,question_id,label_ar,label,option_value,option_index,display_order,is_trap) values(coalesce(nullif(v_o->>'id','')::uuid,gen_random_uuid()),v_qid,v_o->>'label_ar',v_o->>'label',coalesce((v_o->>'value')::integer,0),k,k+1,coalesce((v_o->>'is_trap')::boolean,false));
    end loop;
   end loop;
  end loop;
 end if;
 update public.assessment_types set axis_count=v_ac,question_count=v_qc,updated_at=now() where id=v_id;
 perform public.write_admin_audit('assessment.import','assessment_types',v_id,v_family,null,jsonb_build_object('status','draft','axis_count',v_ac,'question_count',v_qc,'has_role_kpi_mappings',p_data ? 'kpi_mappings'));
 return v_id;
end;
$$;
grant execute on function public.import_assessment_secure(jsonb) to authenticated;

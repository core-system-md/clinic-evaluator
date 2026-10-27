-- Preserve explicit option UUIDs in canonical admin imports so the official
-- interpretation registry binds to the same immutable option identities.
-- Existing imports without option.id retain generated UUID behavior.
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
                id,question_id,label_ar,label,option_value,option_index,display_order,is_trap
              ) values(
                coalesce(nullif(v_opt->>'id','')::uuid,gen_random_uuid()),v_question_id,coalesce(v_opt->>'label_ar',v_opt->>'label','خيار'),
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


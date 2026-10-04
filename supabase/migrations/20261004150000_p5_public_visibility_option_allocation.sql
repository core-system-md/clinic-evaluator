-- P5 correction: separate public visibility from lifecycle archiving and make option allocation server-authoritative.
-- Scope: P5 admin editor/lifecycle only. No P2/P3/P4 semantics are changed.

create or replace function public.add_option_secure(
  p_question_id uuid,
  p_label_ar text,
  p_label text,
  p_option_value integer,
  p_option_index integer default null,
  p_display_order integer default null,
  p_is_trap boolean default false
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_id uuid;
  v_assessment uuid;
  v_status text;
  v_family uuid;
  v_next_index integer;
  v_next_order integer;
  v_option_count integer;
begin
  perform public.require_admin_capability('assessment.edit');

  -- Lock the parent question so index/order allocation is serialized for this question.
  select q.assessment_type_id,a.status,a.family_id
    into v_assessment,v_status,v_family
  from public.questions q
  join public.assessment_types a on a.id=q.assessment_type_id
  where q.id=p_question_id
  for update;

  if v_assessment is null then
    raise exception 'Question not found' using errcode='P0002';
  end if;

  if v_status<>'draft' then
    raise exception 'Only working copies can be edited' using errcode='55000';
  end if;

  select count(*) into v_option_count
  from public.options
  where question_id=p_question_id;

  if v_option_count >= 5 then
    raise exception 'A question cannot contain more than 5 options' using errcode='22023';
  end if;

  select coalesce(max(option_index),-1)+1,
         coalesce(max(display_order),0)+1
    into v_next_index,v_next_order
  from public.options
  where question_id=p_question_id;

  insert into public.options(question_id,label_ar,label,option_value,option_index,display_order,is_trap)
  values(
    p_question_id,
    coalesce(p_label_ar,p_label,'خيار'),
    coalesce(p_label,p_label_ar,'Option'),
    coalesce(p_option_value,0),
    coalesce(p_option_index,v_next_index),
    coalesce(p_display_order,v_next_order),
    coalesce(p_is_trap,false)
  )
  returning id into v_id;

  perform public.write_admin_audit(
    'assessment.option.add','options',v_id,v_family,null,
    (select to_jsonb(o) from public.options o where o.id=v_id)
  );

  return v_id;
end;
$$;

revoke all on function public.add_option_secure(uuid,text,text,integer,integer,integer,boolean) from public,anon;
grant execute on function public.add_option_secure(uuid,text,text,integer,integer,integer,boolean) to authenticated;


create or replace function public.stop_public_assessment_secure(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_family public.assessment_families%rowtype;
  v_version public.assessment_types%rowtype;
begin
  perform public.require_admin_capability('public.stop');

  select * into v_family
  from public.assessment_families
  where id=p_family_id
  for update;

  if not found then
    raise exception 'Assessment family not found' using errcode='P0002';
  end if;

  if v_family.current_published_version_id is null then
    raise exception 'No published assessment is currently selected for this family' using errcode='55000';
  end if;

  select * into v_version
  from public.assessment_types
  where id=v_family.current_published_version_id
  for update;

  if not found or v_version.status <> 'published' then
    raise exception 'Current public assessment is not published' using errcode='55000';
  end if;

  if v_version.is_active = false then
    return jsonb_build_object(
      'success',true,
      'version_id',v_version.id,
      'already_stopped',true
    );
  end if;

  update public.assessment_types
     set is_active=false,
         updated_at=now()
   where id=v_version.id;

  perform public.write_admin_audit(
    'assessment.stop_public',
    'assessment_types',
    v_version.id,
    p_family_id,
    jsonb_build_object('status',v_version.status,'is_active',v_version.is_active),
    jsonb_build_object('status','published','is_active',false)
  );

  return jsonb_build_object(
    'success',true,
    'version_id',v_version.id,
    'already_stopped',false
  );
end;
$$;


create or replace function public.resume_public_assessment_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.assessment_types%rowtype;
  f public.assessment_families%rowtype;
begin
  perform public.require_admin_capability('public.restore');

  select * into v
  from public.assessment_types
  where id=p_version_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v.status <> 'published' then
    raise exception 'Only a published version can be returned to public visibility' using errcode='55000';
  end if;

  select * into f
  from public.assessment_families
  where id=v.family_id
  for update;

  if not found then
    raise exception 'Assessment family not found' using errcode='P0002';
  end if;

  if f.current_published_version_id is not null and f.current_published_version_id <> p_version_id then
    raise exception 'Another version is currently selected for public visibility' using errcode='55000';
  end if;

  update public.assessment_types
     set is_active=true,
         updated_at=now()
   where id=p_version_id;

  update public.assessment_families
     set current_published_version_id=p_version_id,
         updated_at=now()
   where id=f.id;

  perform public.write_admin_audit(
    'assessment.resume_public',
    'assessment_types',
    p_version_id,
    f.id,
    jsonb_build_object('status',v.status,'is_active',v.is_active),
    jsonb_build_object('status','published','is_active',true)
  );

  return jsonb_build_object('success',true,'family_id',f.id,'version_id',p_version_id);
end;
$$;

revoke all on function public.resume_public_assessment_secure(uuid) from public,anon,authenticated;
grant execute on function public.resume_public_assessment_secure(uuid) to authenticated;


create or replace function public.archive_assessment_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v public.assessment_types%rowtype;
  f public.assessment_families%rowtype;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v
  from public.assessment_types
  where id=p_version_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v.status <> 'published' then
    raise exception 'Only a published version can be archived' using errcode='55000';
  end if;

  if v.is_active = true then
    raise exception 'Stop public visibility before archiving this version' using errcode='55000';
  end if;

  select * into f
  from public.assessment_families
  where id=v.family_id
  for update;

  if not found then
    raise exception 'Assessment family not found' using errcode='P0002';
  end if;

  update public.assessment_types
     set status='archived',
         is_active=false,
         archived_at=now(),
         updated_at=now()
   where id=p_version_id;

  if f.current_published_version_id = p_version_id then
    update public.assessment_families
       set current_published_version_id=null,
           updated_at=now()
     where id=f.id;
  end if;

  perform public.write_admin_audit(
    'assessment.archive',
    'assessment_types',
    p_version_id,
    f.id,
    jsonb_build_object('status',v.status,'is_active',v.is_active),
    jsonb_build_object('status','archived','is_active',false)
  );

  return jsonb_build_object('success',true,'family_id',f.id,'version_id',p_version_id);
end;
$$;

revoke all on function public.archive_assessment_secure(uuid) from public,anon,authenticated;
grant execute on function public.archive_assessment_secure(uuid) to authenticated;

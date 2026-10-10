create or replace function public.publish_assessment_version_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_target public.assessment_types%rowtype;
  v_family public.assessment_families%rowtype;
  v_old uuid;
  v_validation jsonb;
begin
  perform public.require_admin_capability('public.publish');

  select * into v_target from public.assessment_types where id=p_version_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_target.status<>'draft' then raise exception 'Only draft versions can be published' using errcode='55000'; end if;

  select * into v_family from public.assessment_families where id=v_target.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode='P0002'; end if;

  v_validation:=public.validate_assessment_version_secure(p_version_id);
  if coalesce((v_validation->>'valid')::boolean,false) is not true then
    raise exception 'Assessment version failed publication validation: %',v_validation::text using errcode='22023';
  end if;

  v_old:=v_family.current_published_version_id;

  if v_old is not null and v_old<>p_version_id then
    -- P2 immutability permits only publication archival on an already-published row.
    update public.assessment_types
       set status='archived',
           archived_at=now()
     where id=v_old;
  end if;

  update public.assessment_types
     set status='published',
         published_at=now(),
         archived_at=null,
         is_active=true,
         updated_at=now()
   where id=p_version_id;

  update public.assessment_families
     set current_published_version_id=p_version_id,
         updated_at=now()
   where id=v_family.id;

  perform public.write_admin_audit(
    'assessment.publish','assessment_types',p_version_id,v_family.id,
    jsonb_build_object('previous_public_version_id',v_old),
    jsonb_build_object('public_version_id',p_version_id)
  );

  return jsonb_build_object('success',true,'family_id',v_family.id,'version_id',p_version_id,'slug',v_family.slug);
end;
$$;

create or replace function public.stop_public_assessment_secure(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_family public.assessment_families%rowtype; v_old uuid;
begin
  perform public.require_admin_capability('public.stop');
  select * into v_family from public.assessment_families where id=p_family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode='P0002'; end if;

  v_old:=v_family.current_published_version_id;

  if v_old is not null then
    -- Do not touch other immutable fields on the published version.
    update public.assessment_types
       set status='archived',
           archived_at=now()
     where id=v_old and status='published';

    update public.assessment_families
       set current_published_version_id=null,
           updated_at=now()
     where id=p_family_id;
  end if;

  perform public.write_admin_audit(
    'assessment.stop_public','assessment_families',p_family_id,p_family_id,
    jsonb_build_object('previous_public_version_id',v_old),
    jsonb_build_object('public_version_id',null)
  );

  return jsonb_build_object('success',true,'previous_public_version_id',v_old);
end;
$$;

create or replace function public.restore_public_assessment_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.assessment_types%rowtype; f public.assessment_families%rowtype; old uuid; validation jsonb;
begin
  perform public.require_admin_capability('public.restore');

  select * into v from public.assessment_types where id=p_version_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;

  select * into f from public.assessment_families where id=v.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode='P0002'; end if;

  validation:=public.validate_assessment_version_secure(p_version_id);
  if coalesce((validation->>'valid')::boolean,false) is not true then
    raise exception 'Selected historical assessment failed validation: %',validation::text using errcode='22023';
  end if;

  old:=f.current_published_version_id;

  if old is not null and old<>p_version_id then
    update public.assessment_types
       set status='archived',
           archived_at=now()
     where id=old;
  end if;

  update public.assessment_types
     set status='published',
         published_at=coalesce(published_at,now()),
         archived_at=null,
         is_active=true,
         updated_at=now()
   where id=p_version_id;

  update public.assessment_families
     set current_published_version_id=p_version_id,
         updated_at=now()
   where id=f.id;

  perform public.write_admin_audit(
    'assessment.restore_public','assessment_types',p_version_id,f.id,
    jsonb_build_object('previous_public_version_id',old),
    jsonb_build_object('public_version_id',p_version_id)
  );

  return jsonb_build_object('success',true,'family_id',f.id,'version_id',p_version_id);
end;
$$;
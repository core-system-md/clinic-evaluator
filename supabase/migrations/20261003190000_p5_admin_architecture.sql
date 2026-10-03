-- P5 Admin Architecture Consolidation
-- Owner-approved implementation. Canonical Admin authorization, audit, lifecycle and write paths.

create table if not exists public.admin_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, capability)
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  family_id uuid references public.assessment_families(id),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  success boolean not null default true,
  failure_reason text
);

alter table public.admin_capabilities enable row level security;
alter table public.admin_audit_log enable row level security;

grant select on public.admin_capabilities to authenticated;
grant select on public.admin_audit_log to authenticated;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true
      and role in ('owner','admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true
      and role = 'owner'
  );
$$;

create or replace function public.has_admin_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_owner()
      or exists (
        select 1 from public.admin_capabilities c
        join public.admin_users a on a.user_id = c.user_id
        where c.user_id = (select auth.uid())
          and a.active = true
          and a.role = 'admin'
          and c.capability = p_capability
      );
$$;

create or replace function public.require_admin_capability(p_capability text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_admin_capability(p_capability) then
    raise exception 'admin capability required: %', p_capability using errcode = '42501';
  end if;
end;
$$;

create or replace function public.write_admin_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_family_id uuid,
  p_before jsonb default null,
  p_after jsonb default null,
  p_success boolean default true,
  p_failure_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  insert into public.admin_audit_log(
    actor_user_id, action, entity_type, entity_id, family_id,
    before_data, after_data, success, failure_reason
  )
  values (
    (select auth.uid()), p_action, p_entity_type, p_entity_id, p_family_id,
    p_before, p_after, p_success, p_failure_reason
  )
  returning id into v_id;
  return v_id;
end;
$$;

drop policy if exists "admin capabilities self read" on public.admin_capabilities;
create policy "admin capabilities self read"
on public.admin_capabilities
for select to authenticated
using (
  user_id = (select auth.uid()) or public.is_owner()
);

drop policy if exists "owner audit read" on public.admin_audit_log;
create policy "owner audit read"
on public.admin_audit_log
for select to authenticated
using (public.is_owner());

drop policy if exists "active admin family read" on public.assessment_families;
create policy "active admin family read"
on public.assessment_families
for select to authenticated
using (public.has_admin_capability('assessment.view'));

grant select on public.assessment_families to authenticated;

create or replace function public.create_assessment_secure(
  p_slug text,
  p_title_ar text,
  p_title_en text default null,
  p_description text default null,
  p_has_traps boolean default false,
  p_has_ev_simulator boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family_id uuid;
  v_version_id uuid := gen_random_uuid();
begin
  perform public.require_admin_capability('assessment.edit');

  if nullif(trim(p_slug),'') is null then
    raise exception 'Assessment public key is required' using errcode='22023';
  end if;

  insert into public.assessment_families(slug, created_by)
  values (lower(trim(p_slug)), (select auth.uid()))
  returning id into v_family_id;

  insert into public.assessment_types(
    id, slug, title_ar, title_en, description,
    question_count, axis_count, has_traps, has_ev_simulator,
    config_version, is_active, status, version, created_by, family_id
  )
  values (
    v_version_id, lower(trim(p_slug)), coalesce(nullif(trim(p_title_ar),''),'تقييم جديد'),
    p_title_en, p_description, 0, 0, coalesce(p_has_traps,false),
    coalesce(p_has_ev_simulator,false), 1, true, 'draft', 1,
    (select auth.uid()), v_family_id
  );

  perform public.write_admin_audit(
    'assessment.create','assessment_types',v_version_id,v_family_id,
    null, jsonb_build_object('family_id',v_family_id,'status','draft')
  );

  return jsonb_build_object(
    'success',true,'family_id',v_family_id,'version_id',v_version_id,
    'slug',lower(trim(p_slug)),'status','draft'
  );
end;
$$;

create or replace function public.update_assessment_working_copy_secure(
  p_id uuid,
  p_title_ar text,
  p_title_en text,
  p_description text,
  p_has_traps boolean,
  p_has_ev_simulator boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_old jsonb; v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select to_jsonb(a), a.family_id into v_old,v_family
  from public.assessment_types a where a.id=p_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if (v_old->>'status') <> 'draft' then
    raise exception 'Only a non-public working copy can be edited' using errcode='55000';
  end if;

  update public.assessment_types
  set title_ar=coalesce(nullif(trim(p_title_ar),''),title_ar),
      title_en=p_title_en, description=p_description,
      has_traps=p_has_traps, has_ev_simulator=p_has_ev_simulator,
      updated_at=now()
  where id=p_id;

  perform public.write_admin_audit(
    'assessment.edit','assessment_types',p_id,v_family,v_old,
    (select to_jsonb(a) from public.assessment_types a where a.id=p_id)
  );
  return jsonb_build_object('success',true,'id',p_id);
end;
$$;

create or replace function public.save_assessment_secure(
  p_id uuid, p_title_ar text, p_title_en text, p_slug text,
  p_description text, p_status text, p_has_traps boolean, p_has_ev_simulator boolean
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_id is null then
    return public.create_assessment_secure(
      lower(trim(p_slug)),p_title_ar,p_title_en,p_description,p_has_traps,p_has_ev_simulator
    )::json;
  end if;

  if lower(coalesce(p_status,'draft')) = 'published' then
    raise exception 'Publication must use publish_assessment_version_secure' using errcode='55000';
  end if;

  return public.update_assessment_working_copy_secure(
    p_id,p_title_ar,p_title_en,p_description,p_has_traps,p_has_ev_simulator
  )::json;
end;
$$;

create or replace function public.create_assessment_version_secure(p_source_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.assessment_types%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_next_version integer;
  v_new_slug text;
  v_old jsonb;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v_source from public.assessment_types
  where id=p_source_version_id for update;
  if not found then raise exception 'Source assessment version not found' using errcode='P0002'; end if;
  if v_source.status not in ('draft','published') then
    raise exception 'Only draft or published versions can be used as a source' using errcode='55000';
  end if;

  perform 1 from public.assessment_families where id=v_source.family_id for update;
  select coalesce(max(version),0)+1 into v_next_version
  from public.assessment_types where family_id=v_source.family_id;

  v_new_slug := v_source.slug || '--v' || v_next_version;

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

  perform public.write_admin_audit(
    'assessment.create_working_copy','assessment_types',v_new_id,v_source.family_id,
    null,jsonb_build_object('source_version_id',v_source.id,'version',v_next_version)
  );

  return v_new_id;
end;
$$;

create or replace function public.validate_assessment_version_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v public.assessment_types%rowtype;
  v_family_exists boolean;
  v_q integer; v_a integer; v_bad_q integer; v_bad_o integer; v_required integer;
  v_weight numeric; v_checks jsonb;
begin
  perform public.require_admin_capability('assessment.edit');
  select * into v from public.assessment_types where id=p_version_id;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;

  select exists(select 1 from public.assessment_families f where f.id=v.family_id) into v_family_exists;
  select count(*),count(distinct axis_id),count(*) filter(where is_required) into v_q,v_a,v_required
  from public.questions where assessment_type_id=v.id;
  select count(*) into v_bad_q
  from public.questions q left join public.axes a on a.id=q.axis_id
  where q.assessment_type_id=v.id and (a.id is null or a.assessment_type_id<>v.id);
  select count(*) into v_bad_o
  from public.options o
  join public.questions q on q.id=o.question_id
  where q.assessment_type_id=v.id
    and (o.question_id is null or q.assessment_type_id<>v.id);
  select coalesce(sum(weight),0) into v_weight from public.axes where assessment_type_id=v.id;

  v_checks=jsonb_build_object(
    'family_valid',v_family_exists,
    'question_count_matches',v_q=v.question_count,
    'axis_count_matches',v_a=v.axis_count,
    'required_questions',v_required,
    'question_axis_integrity',v_bad_q=0,
    'option_question_integrity',v_bad_o=0,
    'weights_total',v_weight,
    'has_axes',v_a>0
  );

  return jsonb_build_object(
    'valid',
      v_family_exists and v_q=v.question_count and v_a=v.axis_count and
      v_bad_q=0 and v_bad_o=0 and v_a>0 and v_q>0,
    'checks',v_checks
  );
end;
$$;

create or replace function public.publish_assessment_version_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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
  if v_target.status <> 'draft' then raise exception 'Only draft versions can be published' using errcode='55000'; end if;

  select * into v_family from public.assessment_families where id=v_target.family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode='P0002'; end if;

  v_validation:=public.validate_assessment_version_secure(p_version_id);
  if coalesce((v_validation->>'valid')::boolean,false) is not true then
    raise exception 'Assessment version failed publication validation: %',v_validation::text using errcode='22023';
  end if;

  v_old:=v_family.current_published_version_id;
  if v_old is not null and v_old<>p_version_id then
    update public.assessment_types set status='archived',archived_at=now(),updated_at=now() where id=v_old;
  end if;

  update public.assessment_types
  set status='published',published_at=now(),archived_at=null,is_active=true,updated_at=now()
  where id=p_version_id;

  update public.assessment_families
  set current_published_version_id=p_version_id,updated_at=now()
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
set search_path = public, pg_temp
as $$
declare v_family public.assessment_families%rowtype; v_old uuid;
begin
  perform public.require_admin_capability('public.stop');
  select * into v_family from public.assessment_families where id=p_family_id for update;
  if not found then raise exception 'Assessment family not found' using errcode='P0002'; end if;
  v_old:=v_family.current_published_version_id;
  if v_old is not null then
    update public.assessment_types set status='archived',archived_at=now(),updated_at=now() where id=v_old and status='published';
    update public.assessment_families set current_published_version_id=null,updated_at=now() where id=p_family_id;
  end if;
  perform public.write_admin_audit('assessment.stop_public','assessment_families',p_family_id,p_family_id,
    jsonb_build_object('previous_public_version_id',v_old),jsonb_build_object('public_version_id',null));
  return jsonb_build_object('success',true,'previous_public_version_id',v_old);
end;
$$;

create or replace function public.restore_public_assessment_secure(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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
    update public.assessment_types set status='archived',archived_at=now(),updated_at=now() where id=old;
  end if;

  update public.assessment_types set status='published',published_at=coalesce(published_at,now()),archived_at=null,is_active=true,updated_at=now()
  where id=p_version_id;
  update public.assessment_families set current_published_version_id=p_version_id,updated_at=now() where id=f.id;

  perform public.write_admin_audit('assessment.restore_public','assessment_types',p_version_id,f.id,
    jsonb_build_object('previous_public_version_id',old),jsonb_build_object('public_version_id',p_version_id));
  return jsonb_build_object('success',true,'family_id',f.id,'version_id',p_version_id);
end;
$$;

create or replace function public.save_axis_secure(
  p_assessment_type_id uuid,p_title text,p_title_ar text,p_code varchar,p_weight numeric,p_display_order integer default 1
)
returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_id uuid; v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select status into v_status from public.assessment_types where id=p_assessment_type_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;

  insert into public.axes(assessment_type_id,title,title_ar,code,weight,display_order,status,description)
  values(p_assessment_type_id,coalesce(p_title,p_title_ar,'محور بدون اسم'),coalesce(p_title_ar,p_title,'محور بدون اسم'),
         coalesce(p_code,'AX_'||extract(epoch from now())::integer),coalesce(p_weight,10),coalesce(p_display_order,1),'active','')
  returning id into v_id;

  update public.assessment_types set axis_count=(select count(*) from public.axes where assessment_type_id=p_assessment_type_id),updated_at=now()
  where id=p_assessment_type_id;
  return v_id;
end;
$$;

create or replace function public.save_question_secure(
  p_assessment_type_id uuid,p_axis_id uuid,p_question_text text,p_question_text_ar text,
  p_code varchar,p_question_type varchar default 'select',p_display_order integer default 1,
  p_is_required boolean default true,p_trap_index integer default null
)
returns uuid
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_id uuid; v_status text; v_axis_assessment uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select status into v_status from public.assessment_types where id=p_assessment_type_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  select assessment_type_id into v_axis_assessment from public.axes where id=p_axis_id;
  if v_axis_assessment is null then raise exception 'Axis not found' using errcode='P0002'; end if;
  if v_axis_assessment<>p_assessment_type_id then raise exception 'Axis belongs to another assessment' using errcode='23514'; end if;

  insert into public.questions(assessment_type_id,axis_id,question_text,question_text_ar,code,question_type,display_order,is_required,trap_index,status)
  values(p_assessment_type_id,p_axis_id,coalesce(p_question_text,p_question_text_ar,'سؤال بدون نص'),
         coalesce(p_question_text_ar,p_question_text,'سؤال بدون نص'),coalesce(p_code,'Q_'||extract(epoch from now())::integer),
         coalesce(p_question_type,'select'),coalesce(p_display_order,1),coalesce(p_is_required,true),p_trap_index,'active')
  returning id into v_id;

  update public.assessment_types set question_count=(select count(*) from public.questions where assessment_type_id=p_assessment_type_id),updated_at=now()
  where id=p_assessment_type_id;
  return v_id;
end;
$$;

create or replace function public.add_option_secure(
 p_question_id uuid,p_label_ar text,p_label text,p_option_value integer,p_option_index integer,p_display_order integer,p_is_trap boolean default false
)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_id uuid; v_assessment uuid; v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select q.assessment_type_id,a.status into v_assessment,v_status
  from public.questions q join public.assessment_types a on a.id=q.assessment_type_id where q.id=p_question_id;
  if v_assessment is null then raise exception 'Question not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  insert into public.options(question_id,label_ar,label,option_value,option_index,display_order,is_trap)
  values(p_question_id,coalesce(p_label_ar,p_label,'خيار'),coalesce(p_label,p_label_ar,'Option'),
         coalesce(p_option_value,0),coalesce(p_option_index,0),coalesce(p_display_order,1),coalesce(p_is_trap,false))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_option_secure(
 p_option_id uuid,p_label_ar text,p_option_value integer
)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_status text;
begin
  perform public.require_admin_capability('assessment.edit');
  select a.status into v_status from public.options o join public.questions q on q.id=o.question_id
  join public.assessment_types a on a.id=q.assessment_type_id where o.id=p_option_id;
  if not found then raise exception 'Option not found' using errcode='P0002'; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  update public.options set label_ar=coalesce(p_label_ar,label_ar),option_value=coalesce(p_option_value,option_value) where id=p_option_id;
end;
$$;

create or replace function public.delete_option_secure(p_option_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_status text; v_deleted integer;
begin
  perform public.require_admin_capability('assessment.edit');
  select a.status into v_status from public.options o join public.questions q on q.id=o.question_id
  join public.assessment_types a on a.id=q.assessment_type_id where o.id=p_option_id;
  if not found then return false; end if;
  if v_status<>'draft' then raise exception 'Only working copies can be edited' using errcode='55000'; end if;
  delete from public.options where id=p_option_id;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.generate_assessment_user_secure(
 p_slug text,p_username text,p_password_hash text,p_max_uses integer,p_expiry_days integer
)
returns json language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_family uuid;
begin
  perform public.require_admin_capability('access.manage');
  select id into v_family from public.assessment_families where slug=lower(trim(p_slug));
  if v_family is null then raise exception 'Assessment family not found' using errcode='P0002'; end if;
  insert into public.assessment_users(assessment_key,username,password_hash,max_uses,used_count,active,expires_at,created_at)
  values(lower(trim(p_slug)),p_username,p_password_hash,p_max_uses,0,true,now()+(p_expiry_days||' days')::interval,now());
  perform public.write_admin_audit('access.create','assessment_users',null,v_family,null,
    jsonb_build_object('assessment_key',lower(trim(p_slug)),'username',p_username,'max_uses',p_max_uses,'expiry_days',p_expiry_days));
  return json_build_object('success',true,'username',p_username);
end;
$$;

create or replace function public.toggle_assessment_auth_secure(p_slug text,p_enabled boolean)
returns json language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_family uuid;
begin
  perform public.require_admin_capability('access.manage');
  select id into v_family from public.assessment_families where slug=lower(trim(p_slug));
  if v_family is null then raise exception 'Assessment family not found' using errcode='P0002'; end if;
  insert into public.assessment_settings(assessment_key,auth_enabled)
  values(lower(trim(p_slug)),p_enabled)
  on conflict (assessment_key) do update set auth_enabled=excluded.auth_enabled;
  perform public.write_admin_audit('access.mode_change','assessment_settings',null,v_family,
    null,jsonb_build_object('assessment_key',lower(trim(p_slug)),'auth_enabled',p_enabled));
  return json_build_object('success',true,'auth_enabled',p_enabled);
end;
$$;

-- Legacy generic status mutation is retained only for draft/archived administrative cleanup.
create or replace function public.update_assessment_status_secure(p_id uuid,p_status text,p_is_active boolean)
returns json language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_status text; v_family uuid;
begin
  perform public.require_admin_capability('assessment.edit');
  select status,family_id into v_status,v_family from public.assessment_types where id=p_id for update;
  if not found then raise exception 'Assessment version not found' using errcode='P0002'; end if;
  if v_status='published' then raise exception 'Published versions require the publication lifecycle operations' using errcode='55000'; end if;
  if v_status='archived' then raise exception 'Archived versions are immutable' using errcode='55000'; end if;
  if lower(p_status) not in ('draft','archived') then raise exception 'Invalid status transition' using errcode='22023'; end if;
  update public.assessment_types set status=lower(p_status),is_active=p_is_active,archived_at=case when lower(p_status)='archived' then now() else null end,updated_at=now() where id=p_id;
  perform public.write_admin_audit('assessment.status_change','assessment_types',p_id,v_family,
    jsonb_build_object('status',v_status),jsonb_build_object('status',lower(p_status),'is_active',p_is_active));
  return json_build_object('success',true,'status',lower(p_status));
end;
$$;

-- New tables/functions are explicit Data API surfaces: only authenticated Admin reads are exposed.
revoke all on public.admin_capabilities from anon;
revoke all on public.admin_audit_log from anon;
revoke insert,update,delete on public.admin_capabilities from authenticated;
revoke insert,update,delete on public.admin_audit_log from authenticated;

revoke execute on function public.create_assessment_secure(text,text,text,text,boolean,boolean) from public,anon,authenticated;
revoke execute on function public.update_assessment_working_copy_secure(uuid,text,text,text,boolean,boolean) from public,anon,authenticated;
revoke execute on function public.validate_assessment_version_secure(uuid) from public,anon,authenticated;
revoke execute on function public.stop_public_assessment_secure(uuid) from public,anon,authenticated;
revoke execute on function public.restore_public_assessment_secure(uuid) from public,anon,authenticated;
revoke execute on function public.require_admin_capability(text) from public,anon,authenticated;
revoke execute on function public.write_admin_audit(text,text,uuid,uuid,jsonb,jsonb,boolean,text) from public,anon,authenticated;

grant execute on function public.create_assessment_secure(text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.update_assessment_working_copy_secure(uuid,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.validate_assessment_version_secure(uuid) to authenticated;
grant execute on function public.stop_public_assessment_secure(uuid) to authenticated;
grant execute on function public.restore_public_assessment_secure(uuid) to authenticated;
grant execute on function public.publish_assessment_version_secure(uuid) to authenticated;
grant execute on function public.create_assessment_version_secure(uuid) to authenticated;
grant execute on function public.save_assessment_secure(uuid,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.save_axis_secure(uuid,text,text,varchar,numeric,integer) to authenticated;
grant execute on function public.save_question_secure(uuid,uuid,text,text,varchar,varchar,integer,boolean,integer) to authenticated;
grant execute on function public.add_option_secure(uuid,text,text,integer,integer,integer,boolean) to authenticated;
grant execute on function public.update_option_secure(uuid,text,integer) to authenticated;
grant execute on function public.delete_option_secure(uuid) to authenticated;
grant execute on function public.generate_assessment_user_secure(text,text,text,integer,integer) to authenticated;
grant execute on function public.toggle_assessment_auth_secure(text,boolean) to authenticated;
grant execute on function public.update_assessment_status_secure(uuid,text,boolean) to authenticated;

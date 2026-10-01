-- P2 — Assessment Family + Immutable Versions
-- Implementation baseline: stable public family identity, version-pinned sessions,
-- database-enforced immutability, atomic publication, complete version duplication.

begin;

create table if not exists public.assessment_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  current_published_version_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

alter table public.assessment_types
  add column if not exists family_id uuid null;

-- Backfill one family for each existing public assessment identity.
insert into public.assessment_families (slug, created_at)
select at.slug, min(coalesce(at.created_at, now()))
from public.assessment_types at
where at.parent_id is null
group by at.slug
on conflict (slug) do nothing;

update public.assessment_types at
set family_id = af.id
from public.assessment_families af
where af.slug = at.slug
  and at.family_id is null;

do $$
begin
  if exists (
    select 1 from public.assessment_types where family_id is null
  ) then
    raise exception 'P2 family backfill incomplete';
  end if;
end $$;

alter table public.assessment_types
  alter column family_id set not null;

alter table public.assessment_types
  drop constraint if exists assessment_types_family_id_fkey;

alter table public.assessment_types
  add constraint assessment_types_family_id_fkey
  foreign key (family_id) references public.assessment_families(id);

create unique index if not exists assessment_types_family_version_uidx
  on public.assessment_types (family_id, version);

create unique index if not exists assessment_types_one_published_per_family_uidx
  on public.assessment_types (family_id)
  where status = 'published';

alter table public.assessment_families
  drop constraint if exists assessment_families_current_published_version_fkey;

alter table public.assessment_families
  add constraint assessment_families_current_published_version_fkey
  foreign key (current_published_version_id)
  references public.assessment_types(id)
  on delete restrict;

update public.assessment_families af
set current_published_version_id = at.id,
    updated_at = now()
from public.assessment_types at
where at.family_id = af.id
  and at.status = 'published';

-- Existing sessions are already pinned to concrete assessment versions.
-- Backfill only missing provenance from the concrete assessment row.
update public.sessions s
set assessment_version = at.version,
    scoring_engine_version = coalesce(s.scoring_engine_version, 'v1')
from public.assessment_types at
where at.id = s.assessment_type_id
  and s.assessment_version is null;

create index if not exists assessment_families_current_published_idx
  on public.assessment_families (current_published_version_id);

create or replace function public.p2_assert_draft_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_status text;
begin
  select at.status
    into v_status
    from public.assessment_types at
   where at.id = case
     when TG_ARGV[0] = 'direct' then
       case TG_TABLE_NAME
         when 'axes' then NEW.assessment_type_id
         when 'questions' then NEW.assessment_type_id
         when 'traps' then NEW.assessment_type_id
         when 'insights_mapping' then NEW.assessment_type_id
         when 'assessment_assets' then NEW.assessment_type_id
       end
     when TG_ARGV[0] = 'option' then
       (select q.assessment_type_id from public.questions q where q.id = NEW.question_id)
   end;

  if v_status is distinct from 'draft' then
    raise exception 'Published or archived assessment versions are immutable'
      using errcode = '55000';
  end if;

  return coalesce(NEW, OLD);
end;
$function$;

drop trigger if exists p2_axes_immutable on public.axes;
create trigger p2_axes_immutable
before insert or update or delete on public.axes
for each row execute function public.p2_assert_draft_version('direct');

drop trigger if exists p2_questions_immutable on public.questions;
create trigger p2_questions_immutable
before insert or update or delete on public.questions
for each row execute function public.p2_assert_draft_version('direct');

drop trigger if exists p2_options_immutable on public.options;
create trigger p2_options_immutable
before insert or update or delete on public.options
for each row execute function public.p2_assert_draft_version('option');

drop trigger if exists p2_traps_immutable on public.traps;
create trigger p2_traps_immutable
before insert or update or delete on public.traps
for each row execute function public.p2_assert_draft_version('direct');

drop trigger if exists p2_insights_mapping_immutable on public.insights_mapping;
create trigger p2_insights_mapping_immutable
before insert or update or delete on public.insights_mapping
for each row execute function public.p2_assert_draft_version('direct');

drop trigger if exists p2_assessment_assets_immutable on public.assessment_assets;
create trigger p2_assessment_assets_immutable
before insert or update or delete on public.assessment_assets
for each row execute function public.p2_assert_draft_version('direct');

create or replace function public.p2_assessment_type_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if TG_OP = 'DELETE' then
    if OLD.status <> 'draft' then
      raise exception 'Published or archived assessment versions are immutable'
        using errcode = '55000';
    end if;
    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.status = 'archived' then
      raise exception 'Archived assessment versions are immutable'
        using errcode = '55000';
    end if;

    if OLD.status = 'published' then
      if NEW.status <> 'archived'
         or NEW.id is distinct from OLD.id
         or NEW.family_id is distinct from OLD.family_id
         or NEW.version is distinct from OLD.version
         or NEW.slug is distinct from OLD.slug
         or NEW.title_ar is distinct from OLD.title_ar
         or NEW.title_en is distinct from OLD.title_en
         or NEW.description is distinct from OLD.description
         or NEW.question_count is distinct from OLD.question_count
         or NEW.axis_count is distinct from OLD.axis_count
         or NEW.has_traps is distinct from OLD.has_traps
         or NEW.has_ev_simulator is distinct from OLD.has_ev_simulator
         or NEW.config_version is distinct from OLD.config_version
         or NEW.is_active is distinct from OLD.is_active
         or NEW.created_at is distinct from OLD.created_at
         or NEW.updated_at is distinct from OLD.updated_at
         or NEW.published_at is distinct from OLD.published_at
         or NEW.archived_at is distinct from OLD.archived_at
         or NEW.created_by is distinct from OLD.created_by
         or NEW.parent_id is distinct from OLD.parent_id
         or NEW.kpi_mappings is distinct from OLD.kpi_mappings
         or NEW.ev_mappings is distinct from OLD.ev_mappings
         or NEW.axis_roles is distinct from OLD.axis_roles
      then
        raise exception 'Published assessment versions are immutable; only publication archival is allowed'
          using errcode = '55000';
      end if;
    end if;
  end if;

  return NEW;
end;
$function$;

drop trigger if exists p2_assessment_type_immutability on public.assessment_types;
create trigger p2_assessment_type_immutability
before update or delete on public.assessment_types
for each row execute function public.p2_assessment_type_immutability();

create or replace function public.create_assessment_version_secure(
  p_source_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_source public.assessment_types%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_next_version integer;
  v_new_slug text;
begin
  perform public.require_admin();

  select *
    into v_source
    from public.assessment_types
   where id = p_source_version_id
   for update;

  if not found then
    raise exception 'Source assessment version not found' using errcode = 'P0002';
  end if;

  if v_source.status not in ('draft','published') then
    raise exception 'Only draft or published versions can be used as a source'
      using errcode = '55000';
  end if;

  select coalesce(max(version), 0) + 1
    into v_next_version
    from public.assessment_types
   where family_id = v_source.family_id;

  v_new_slug := v_source.slug || '--v' || v_next_version;

  insert into public.assessment_types (
    id, slug, title_ar, title_en, description, question_count, axis_count,
    has_traps, has_ev_simulator, config_version, is_active, created_at,
    status, version, updated_at, published_at, archived_at, created_by,
    parent_id, kpi_mappings, ev_mappings, axis_roles, family_id
  )
  values (
    v_new_id, v_new_slug, v_source.title_ar, v_source.title_en, v_source.description,
    v_source.question_count, v_source.axis_count, v_source.has_traps,
    v_source.has_ev_simulator, v_source.config_version, true, now(),
    'draft', v_next_version, now(), null, null, v_source.created_by,
    v_source.id, v_source.kpi_mappings, v_source.ev_mappings, v_source.axis_roles,
    v_source.family_id
  );

  create temp table _p2_axis_map(old_id uuid primary key, new_id uuid not null) on commit drop;
  create temp table _p2_question_map(old_id uuid primary key, new_id uuid not null) on commit drop;

  insert into _p2_axis_map(old_id,new_id)
  select a.id, gen_random_uuid()
  from public.axes a
  where a.assessment_type_id = v_source.id;

  insert into public.axes (
    id, assessment_type_id, code, title, title_ar, description,
    weight, display_order, status, created_at, updated_at
  )
  select m.new_id, v_new_id, a.code, a.title, a.title_ar, a.description,
         a.weight, a.display_order, a.status, now(), now()
  from public.axes a
  join _p2_axis_map m on m.old_id = a.id;

  insert into _p2_question_map(old_id,new_id)
  select q.id, gen_random_uuid()
  from public.questions q
  where q.assessment_type_id = v_source.id;

  insert into public.questions (
    id, axis_id, assessment_type_id, code, question_text, question_text_ar,
    question_type, display_order, is_required, trap_index, status,
    created_at, updated_at, impact, layer, trap_for
  )
  select m.new_id, am.new_id, v_new_id, q.code, q.question_text,
         q.question_text_ar, q.question_type, q.display_order, q.is_required,
         q.trap_index, q.status, now(), now(), q.impact, q.layer, q.trap_for
  from public.questions q
  join _p2_question_map m on m.old_id = q.id
  join _p2_axis_map am on am.old_id = q.axis_id;

  insert into public.options (
    id, question_id, option_index, option_value, label, label_ar,
    display_text, display_text_ar, is_trap, display_order, created_at
  )
  select gen_random_uuid(), qm.new_id, o.option_index, o.option_value,
         o.label, o.label_ar, o.display_text, o.display_text_ar,
         o.is_trap, o.display_order, now()
  from public.options o
  join _p2_question_map qm on qm.old_id = o.question_id;

  insert into public.traps (
    id, assessment_type_id, name, question_id, validates, target_axis,
    penalty_base, penalty_max, message, message_ar, created_at
  )
  select gen_random_uuid(), v_new_id, t.name,
         case
           when t.question_id ~* '^[0-9a-f-]{36}$'
             then coalesce((select qm.new_id::text from _p2_question_map qm where qm.old_id = t.question_id::uuid), t.question_id)
           else t.question_id
         end,
         t.validates, t.target_axis, t.penalty_base, t.penalty_max,
         t.message, t.message_ar, now()
  from public.traps t
  where t.assessment_type_id = v_source.id;

  insert into public.insights_mapping (
    id, assessment_type_id, insight_code, severity, title, title_ar,
    message, message_ar, recommendation, recommendation_ar, category,
    display_order, is_active, created_at, updated_at
  )
  select gen_random_uuid(), v_new_id, i.insight_code, i.severity, i.title,
         i.title_ar, i.message, i.message_ar, i.recommendation,
         i.recommendation_ar, i.category, i.display_order, i.is_active,
         now(), now()
  from public.insights_mapping i
  where i.assessment_type_id = v_source.id;

  insert into public.assessment_assets (
    id, assessment_type_id, asset_type, file_url, file_name, file_size,
    mime_type, alt_text, alt_text_ar, display_order, is_active,
    created_at, updated_at
  )
  select gen_random_uuid(), v_new_id, a.asset_type, a.file_url, a.file_name,
         a.file_size, a.mime_type, a.alt_text, a.alt_text_ar,
         a.display_order, a.is_active, now(), now()
  from public.assessment_assets a
  where a.assessment_type_id = v_source.id;

  return v_new_id;
end;
$function$;

revoke all on function public.create_assessment_version_secure(uuid) from public, anon, authenticated;
grant execute on function public.create_assessment_version_secure(uuid) to authenticated;

create or replace function public.publish_assessment_version_secure(
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_target public.assessment_types%rowtype;
  v_family public.assessment_families%rowtype;
  v_old_published uuid;
  v_question_count integer;
  v_axis_count integer;
begin
  perform public.require_admin();

  select *
    into v_target
    from public.assessment_types
   where id = p_version_id
   for update;

  if not found then
    raise exception 'Assessment version not found' using errcode = 'P0002';
  end if;

  if v_target.status <> 'draft' then
    raise exception 'Only draft versions can be published' using errcode = '55000';
  end if;

  select *
    into v_family
    from public.assessment_families
   where id = v_target.family_id
   for update;

  select count(*), count(distinct axis_id)
    into v_question_count, v_axis_count
    from public.questions
   where assessment_type_id = v_target.id;

  if v_question_count <> v_target.question_count
     or v_axis_count <> v_target.axis_count
  then
    raise exception 'Assessment version definition is incomplete';
  end if;

  v_old_published := v_family.current_published_version_id;

  if v_old_published is not null and v_old_published <> p_version_id then
    update public.assessment_types
       set status = 'archived',
           archived_at = now(),
           updated_at = now()
     where id = v_old_published;
  end if;

  update public.assessment_types
     set status = 'published',
         published_at = now(),
         archived_at = null,
         is_active = true,
         updated_at = now()
   where id = p_version_id;

  update public.assessment_families
     set current_published_version_id = p_version_id,
         updated_at = now()
   where id = v_family.id;

  return jsonb_build_object(
    'success', true,
    'family_id', v_family.id,
    'version_id', p_version_id,
    'version', v_target.version,
    'slug', v_family.slug
  );
end;
$function$;

revoke all on function public.publish_assessment_version_secure(uuid) from public, anon;
grant execute on function public.publish_assessment_version_secure(uuid) to authenticated;

alter table public.assessment_families enable row level security;
revoke all on table public.assessment_families from anon, authenticated;

commit;

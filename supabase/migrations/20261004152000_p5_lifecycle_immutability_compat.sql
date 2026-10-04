-- P5 lifecycle compatibility: published versions remain immutable in content/structure,
-- while secure lifecycle RPCs may change lifecycle metadata (status, is_active, archived_at).
-- Direct table writes remain unavailable to authenticated clients by RLS.

create or replace function public.p2_assessment_type_immutability()
returns trigger
language plpgsql
set search_path=''
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
    if NEW.id is distinct from OLD.id
       or NEW.family_id is distinct from OLD.family_id
       or NEW.version is distinct from OLD.version
       or NEW.slug is distinct from OLD.slug
       or NEW.question_count is distinct from OLD.question_count
       or NEW.axis_count is distinct from OLD.axis_count
       or NEW.has_traps is distinct from OLD.has_traps
       or NEW.has_ev_simulator is distinct from OLD.has_ev_simulator
       or NEW.config_version is distinct from OLD.config_version
       or NEW.created_at is distinct from OLD.created_at
       or NEW.published_at is distinct from OLD.published_at
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
      raise exception 'Published assessment may only change approved editorial metadata or lifecycle state' using errcode='55000';
    end if;
  end if;

  return NEW;
end;
$function$;

-- P5 lifecycle trigger correction.
-- Published versions remain immutable in structure/content except approved editorial
-- metadata (title/description) and lifecycle metadata (status/is_active/archived_at).
-- Archived versions remain read-only except the explicit secure public-restore path.

create or replace function public.p2_assessment_type_immutability()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  if TG_OP = 'DELETE' then
    if OLD.status <> 'draft' then
      raise exception 'Published or archived assessment versions are immutable'
        using errcode='55000';
    end if;
    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.status = 'archived' then
      if NEW.status = 'published'
         and NEW.is_active = true
         and NEW.archived_at is null
         and NEW.id is not distinct from OLD.id
         and NEW.family_id is not distinct from OLD.family_id
         and NEW.version is not distinct from OLD.version
         and NEW.slug is not distinct from OLD.slug
         and NEW.title_ar is not distinct from OLD.title_ar
         and NEW.title_en is not distinct from OLD.title_en
         and NEW.description is not distinct from OLD.description
         and NEW.question_count is not distinct from OLD.question_count
         and NEW.axis_count is not distinct from OLD.axis_count
         and NEW.has_traps is not distinct from OLD.has_traps
         and NEW.has_ev_simulator is not distinct from OLD.has_ev_simulator
         and NEW.config_version is not distinct from OLD.config_version
         and NEW.created_at is not distinct from OLD.created_at
         and NEW.parent_id is not distinct from OLD.parent_id
         and NEW.kpi_mappings is not distinct from OLD.kpi_mappings
         and NEW.ev_mappings is not distinct from OLD.ev_mappings
         and NEW.axis_roles is not distinct from OLD.axis_roles
      then
        return NEW;
      end if;

      raise exception 'Archived assessment versions are immutable except for approved public restoration'
        using errcode='55000';
    end if;

    if OLD.status = 'published' then
      -- A published version may remain published (including stop/resume public),
      -- or move to archived through the dedicated lifecycle RPC.
      if NEW.status not in ('published','archived') then
        raise exception 'Published assessment may only remain published or be archived'
          using errcode='55000';
      end if;

      -- Archived rows are never publicly active and published rows are never
      -- allowed to retain archival metadata.
      if NEW.status = 'archived' and NEW.is_active <> false then
        raise exception 'Archived assessment must be inactive'
          using errcode='55000';
      end if;
      if NEW.status = 'published' and NEW.archived_at is not null then
        raise exception 'Published assessment cannot retain archival metadata'
          using errcode='55000';
      end if;

      -- Structural/scoring identity is immutable. Editorial text and lifecycle
      -- metadata are the only permitted mutable fields.
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
      then
        raise exception 'Published assessment may only change approved editorial metadata or lifecycle state'
          using errcode='55000';
      end if;
    end if;
  end if;

  return NEW;
end;
$function$;

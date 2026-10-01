-- P2 follow-up: retire legacy version-management mutation paths.
begin;

create or replace function public.update_assessment_status_secure(
  p_id uuid,
  p_status text,
  p_is_active boolean
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_status text;
begin
  perform public.require_admin();

  select status into v_status
  from public.assessment_types
  where id = p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode = 'P0002';
  end if;

  if v_status = 'published' then
    raise exception 'Published versions can only be archived by publish_assessment_version_secure'
      using errcode = '55000';
  end if;

  if v_status = 'archived' then
    raise exception 'Archived versions are immutable'
      using errcode = '55000';
  end if;

  if lower(p_status) not in ('draft','archived') then
    raise exception 'Invalid draft status transition'
      using errcode = '22023';
  end if;

  update public.assessment_types
     set status = lower(p_status),
         is_active = p_is_active,
         updated_at = now(),
         archived_at = case when lower(p_status) = 'archived' then now() else null end
   where id = p_id;

  return json_build_object('success', true, 'status', lower(p_status));
end;
$function$;

revoke execute on function public.duplicate_assessment_secure(uuid,text) from authenticated;
revoke execute on function public.duplicate_assessment_secure(uuid,text) from public, anon;

commit;

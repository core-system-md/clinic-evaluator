begin;

-- P5 correction:
-- The scoring engine defines assessment_types.ev_mappings as
-- Record<Role, number>. The original editor-completeness validator incorrectly
-- required each EV entry to be a nested JSON object, which rejected the live
-- production shape and made Calculation > Save fail on valid legacy data.
create or replace function public.update_draft_calculation_config_secure(
  p_id uuid,
  p_axis_roles jsonb,
  p_kpi_mappings jsonb,
  p_ev_mappings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
  v_before jsonb;
  v_family uuid;
  v_status text;
  v_axis_codes text[];
  v_role text;
  v_key text;
  v_map jsonb;
  v_weight numeric;
begin
  perform public.require_admin_capability('assessment.edit');

  select to_jsonb(a),a.family_id,a.status
    into v_before,v_family,v_status
  from public.assessment_types a
  where a.id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v_status<>'draft' then
    raise exception 'Calculation configuration can only be changed on a draft' using errcode='55000';
  end if;

  if jsonb_typeof(coalesce(p_axis_roles,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_kpi_mappings,'{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_ev_mappings,'{}'::jsonb)) <> 'object'
  then
    raise exception 'Calculation configuration must be JSON objects' using errcode='22023';
  end if;

  select coalesce(array_agg(code),array[]::text[])
    into v_axis_codes
  from public.axes
  where assessment_type_id=p_id;

  for v_key, v_role in
    select key,value from jsonb_each_text(coalesce(p_axis_roles,'{}'::jsonb))
  loop
    if not (v_key = any(v_axis_codes)) then
      raise exception 'Axis role mapping references an unknown axis code: %',v_key using errcode='22023';
    end if;
    if nullif(trim(v_role),'') is null then
      raise exception 'Axis role cannot be empty for %',v_key using errcode='22023';
    end if;
  end loop;

  for v_key, v_map in
    select key,value from jsonb_each(coalesce(p_kpi_mappings,'{}'::jsonb))
  loop
    if jsonb_typeof(v_map) <> 'object' then
      raise exception 'KPI mapping % must be an object',v_key using errcode='22023';
    end if;
    if not exists (
      select 1 from jsonb_each(v_map) e
      where jsonb_typeof(e.value)='number'
        and (e.value::text)::numeric >= 0
    ) then
      raise exception 'KPI mapping % must contain at least one non-negative numeric weight',v_key using errcode='22023';
    end if;
    if coalesce((select sum((e.value::text)::numeric) from jsonb_each(v_map) e),0) <= 0 then
      raise exception 'KPI mapping % must have a positive total weight',v_key using errcode='22023';
    end if;
  end loop;

  -- EV is role -> numeric weight in the canonical scoring engine.
  for v_key, v_map in
    select key,value from jsonb_each(coalesce(p_ev_mappings,'{}'::jsonb))
  loop
    if jsonb_typeof(v_map) <> 'number' then
      raise exception 'EV weight for role % must be numeric',v_key using errcode='22023';
    end if;
    v_weight := (v_map::text)::numeric;
    if v_weight < 0 then
      raise exception 'EV weight for role % cannot be negative',v_key using errcode='22023';
    end if;
  end loop;

  update public.assessment_types
     set axis_roles=coalesce(p_axis_roles,'{}'::jsonb),
         kpi_mappings=coalesce(p_kpi_mappings,'{}'::jsonb),
         ev_mappings=coalesce(p_ev_mappings,'{}'::jsonb),
         updated_at=now()
   where id=p_id;

  perform public.write_admin_audit(
    'assessment.calculation_config.edit','assessment_types',p_id,v_family,v_before,
    (select to_jsonb(a) from public.assessment_types a where a.id=p_id)
  );

  return jsonb_build_object('success',true,'id',p_id);
end;
$function$;

revoke all on function public.update_draft_calculation_config_secure(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.update_draft_calculation_config_secure(uuid,jsonb,jsonb,jsonb) to authenticated;

commit;

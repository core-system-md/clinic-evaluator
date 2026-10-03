-- P5 assessment lifecycle correction:
-- drafts are editable working copies, not archival records.
-- a draft with no execution history may be permanently removed by an authorized editor.
-- versions with execution history are retained and handled by the publication/history lifecycle.

create or replace function public.delete_assessment_draft_secure(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_assessment public.assessment_types%rowtype;
  v_child_count integer;
  v_session_count integer;
  v_result_count integer;
  v_lead_count integer;
  v_before jsonb;
begin
  perform public.require_admin_capability('assessment.edit');

  select * into v_assessment
  from public.assessment_types
  where id=p_id
  for update;

  if not found then
    raise exception 'Assessment version not found' using errcode='P0002';
  end if;

  if v_assessment.status <> 'draft' then
    raise exception 'Only working-copy drafts can be deleted' using errcode='55000';
  end if;

  if exists (
    select 1 from public.assessment_families
    where current_published_version_id=p_id
  ) then
    raise exception 'The current public assessment cannot be deleted' using errcode='55000';
  end if;

  select count(*) into v_child_count
  from public.assessment_types
  where parent_id=p_id;

  select count(*) into v_session_count
  from public.sessions
  where assessment_type_id=p_id;

  select count(*) into v_result_count
  from public.assessment_results
  where assessment_type_id=p_id;

  select count(*) into v_lead_count
  from public.leads
  where assessment_type_id=p_id;

  if v_child_count > 0 then
    raise exception 'This working copy is referenced by another version and cannot be deleted' using errcode='55000';
  end if;

  if v_session_count > 0 or v_result_count > 0 or v_lead_count > 0 then
    raise exception 'A working copy with execution history cannot be deleted; preserve it as history' using errcode='55000';
  end if;

  v_before:=to_jsonb(v_assessment);

  perform public.write_admin_audit(
    'assessment.working_copy_delete','assessment_types',p_id,v_assessment.family_id,
    v_before,
    jsonb_build_object(
      'deleted',true,
      'reason','working_copy_without_execution_history',
      'session_count',v_session_count,
      'result_count',v_result_count,
      'lead_count',v_lead_count
    )
  );

  delete from public.assessment_types where id=p_id;

  return jsonb_build_object(
    'success',true,
    'deleted_version_id',p_id,
    'session_count',v_session_count,
    'result_count',v_result_count,
    'lead_count',v_lead_count
  );
end;
$$;

revoke execute on function public.delete_assessment_draft_secure(uuid) from public,anon;
grant execute on function public.delete_assessment_draft_secure(uuid) to authenticated;

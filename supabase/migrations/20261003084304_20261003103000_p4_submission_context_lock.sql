-- P4 hardening: freeze the complete submission calculation context.
alter table public.sessions
  add column if not exists submission_economic_input jsonb;

comment on column public.sessions.submission_economic_input is
  'Frozen economic-calculation inputs captured at submission preparation so retries reproduce the same final result context.';

create or replace function public.prepare_assessment_submission(
  p_session_id uuid,
  p_access_token_hash text,
  p_economic_input jsonb
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_session public.sessions%rowtype;
  v_required_count integer;
  v_answered_required_count integer;
  v_snapshot jsonb;
  v_economic_input jsonb := coalesce(p_economic_input, '{}'::jsonb);
  v_fingerprint text;
  v_fingerprint_payload jsonb;
begin
  select *
    into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and session_id = p_session_id
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired assessment access';
  end if;

  select *
    into v_session
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assessment session not found';
  end if;

  if v_access.assessment_user_id is distinct from v_session.assessment_user_id then
    raise exception using errcode = '42501', message = 'Assessment session ownership mismatch';
  end if;

  if v_session.status = 'completed' or v_session.submission_state = 'completed' then
    return jsonb_build_object(
      'success', true,
      'already_completed', true,
      'session_id', v_session.id,
      'submission_snapshot', v_session.submission_snapshot,
      'submission_fingerprint', v_session.submission_fingerprint,
      'submission_economic_input', v_session.submission_economic_input
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception using errcode = '40901', message = 'Assessment session is not completable';
  end if;

  if v_session.submission_state = 'processing' then
    return jsonb_build_object(
      'success', true,
      'already_processing', true,
      'session_id', v_session.id,
      'submission_snapshot', v_session.submission_snapshot,
      'submission_fingerprint', v_session.submission_fingerprint,
      'submission_economic_input', v_session.submission_economic_input
    );
  end if;

  select count(*)
    into v_required_count
  from public.questions
  where assessment_type_id = v_session.assessment_type_id
    and is_required is not false;

  select count(*)
    into v_answered_required_count
  from public.questions q
  join public.answers a
    on a.session_id = p_session_id
   and a.question_id = q.code
  where q.assessment_type_id = v_session.assessment_type_id
    and q.is_required is not false;

  if v_answered_required_count <> v_required_count then
    raise exception using errcode = '40902', message = 'Assessment incomplete';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'question_id', a.question_id,
        'axis_id', a.axis_id,
        'option_index', a.option_index,
        'option_value', a.option_value,
        'answer_value', a.answer_value,
        'chosen_option_label', a.chosen_option_label,
        'is_trap', a.is_trap,
        'trap_triggered', a.trap_triggered,
        'answered_at', a.answered_at
      )
      order by a.question_id
    ),
    '[]'::jsonb
  )
  into v_snapshot
  from public.answers a
  where a.session_id = p_session_id;

  v_fingerprint_payload := jsonb_build_object(
    'answers', v_snapshot,
    'economicInput', v_economic_input
  );

  v_fingerprint := encode(
    extensions.digest(
      convert_to(v_fingerprint_payload::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  update public.sessions
  set submission_state = 'processing',
      submission_snapshot = v_snapshot,
      submission_fingerprint = v_fingerprint,
      submission_economic_input = v_economic_input,
      submission_started_at = now(),
      last_activity_at = now()
  where id = p_session_id;

  update public.assessment_session_access
  set last_seen_at = now()
  where id = v_access.id;

  return jsonb_build_object(
    'success', true,
    'already_processing', false,
    'already_completed', false,
    'session_id', p_session_id,
    'submission_snapshot', v_snapshot,
    'submission_fingerprint', v_fingerprint,
    'submission_economic_input', v_economic_input
  );
end;
$function$;

revoke execute on function public.prepare_assessment_submission(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.prepare_assessment_submission(uuid,text,jsonb) to service_role;

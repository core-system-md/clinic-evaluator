-- P4 submission foundation
-- Additive state/snapshot/idempotency primitives and service-role-only atomic answer save.

alter table public.sessions
  add column if not exists submission_state text not null default 'draft',
  add column if not exists submission_snapshot jsonb,
  add column if not exists submission_fingerprint text,
  add column if not exists submission_started_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists attempt_key_hash text;

update public.sessions
set submission_state = case when status = 'completed' then 'completed' else 'draft' end
where submission_state is null
   or submission_state not in ('draft', 'processing', 'completed');

update public.sessions
set last_activity_at = coalesce(last_activity_at, completed_at, started_at, now());

alter table public.sessions
  drop constraint if exists sessions_submission_state_check;

alter table public.sessions
  add constraint sessions_submission_state_check
  check (submission_state in ('draft', 'processing', 'completed'));

create index if not exists sessions_attempt_lookup_idx
  on public.sessions (assessment_type_id, attempt_key_hash)
  where attempt_key_hash is not null;

-- Active-attempt uniqueness is intentionally limited to resumable sessions.
create unique index if not exists sessions_active_attempt_key_uidx
  on public.sessions (assessment_type_id, attempt_key_hash)
  where attempt_key_hash is not null and status = 'in_progress';

-- D12 requires more than one valid access token to reference one active session.
drop index if exists public.assessment_session_access_session_uidx;

create or replace function public.save_assessment_answer(
  p_access_token_hash text,
  p_question_id text,
  p_option_index integer,
  p_current_question integer default null
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_session public.sessions%rowtype;
  v_question public.questions%rowtype;
  v_option public.options%rowtype;
  v_saved public.answers%rowtype;
begin
  select *
    into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found or v_access.session_id is null then
    raise exception using errcode = '28000', message = 'Invalid or expired assessment access';
  end if;

  select *
    into v_session
  from public.sessions
  where id = v_access.session_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assessment session not found';
  end if;

  if v_access.assessment_user_id is distinct from v_session.assessment_user_id then
    raise exception using errcode = '42501', message = 'Assessment session ownership mismatch';
  end if;

  if v_session.status <> 'in_progress'
     or v_session.submission_state <> 'draft' then
    raise exception using errcode = '40901', message = 'Assessment session is no longer accepting answers';
  end if;

  select *
    into v_question
  from public.questions
  where code = p_question_id
    and assessment_type_id = v_session.assessment_type_id;

  if not found then
    raise exception using errcode = '22023', message = 'Question not found';
  end if;

  select *
    into v_option
  from public.options
  where question_id = v_question.id
    and option_index = p_option_index;

  if not found then
    raise exception using errcode = '22023', message = 'Option not found';
  end if;

  insert into public.answers (
    session_id,
    lead_id,
    question_id,
    axis_id,
    question_text,
    chosen_option_label,
    option_index,
    option_value,
    answer_value,
    is_trap,
    trap_triggered,
    answered_at
  )
  values (
    v_session.id,
    v_session.lead_id,
    v_question.code,
    v_question.axis_id::text,
    coalesce(v_question.question_text_ar, v_question.question_text),
    coalesce(v_option.label_ar, v_option.label),
    v_option.option_index,
    v_option.option_value,
    v_option.option_value,
    coalesce(v_option.is_trap, false),
    false,
    now()
  )
  on conflict (session_id, question_id)
  do update set
    lead_id = excluded.lead_id,
    axis_id = excluded.axis_id,
    question_text = excluded.question_text,
    chosen_option_label = excluded.chosen_option_label,
    option_index = excluded.option_index,
    option_value = excluded.option_value,
    answer_value = excluded.answer_value,
    is_trap = excluded.is_trap,
    trap_triggered = excluded.trap_triggered,
    answered_at = excluded.answered_at
  returning * into v_saved;

  update public.sessions
  set current_question = coalesce(p_current_question, current_question),
      last_activity_at = now()
  where id = v_session.id;

  update public.assessment_session_access
  set last_seen_at = now()
  where id = v_access.id;

  return jsonb_build_object(
    'id', v_saved.id,
    'question_id', v_saved.question_id,
    'option_index', v_saved.option_index,
    'chosen_option_label', v_saved.chosen_option_label,
    'answered_at', v_saved.answered_at
  );
end;
$function$;

revoke execute on function public.save_assessment_answer(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.save_assessment_answer(text, text, integer, integer) to service_role;

-- Public active-attempt start: keep the old 3-argument function for compatibility
-- until the new Edge Function is deployed. The 4-argument function below is the P4 path.
create or replace function public.start_public_assessment_session(
  p_access_token_hash text,
  p_assessment_type_id uuid,
  p_lead_id uuid,
  p_attempt_key_hash text
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_session public.sessions%rowtype;
  v_assessment_version integer;
  v_existing_session public.sessions%rowtype;
  v_expiry timestamptz;
begin
  if nullif(btrim(coalesce(p_attempt_key_hash, '')), '') is null then
    raise exception using errcode = '22023', message = 'Attempt key is required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_attempt_key_hash));

  select at.version
    into v_assessment_version
  from public.assessment_types at
  where at.id = p_assessment_type_id
    and at.status = 'published';

  if v_assessment_version is null then
    raise exception using errcode = '42501', message = 'Assessment unavailable';
  end if;

  select *
    into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and assessment_type_id = p_assessment_type_id
    and assessment_user_id is null
    and session_id is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired public assessment access';
  end if;

  update public.sessions
  set status = 'abandoned',
      last_activity_at = now()
  where assessment_type_id = p_assessment_type_id
    and attempt_key_hash = p_attempt_key_hash
    and status = 'in_progress'
    and last_activity_at < now() - interval '7 days';

  select *
    into v_existing_session
  from public.sessions
  where assessment_type_id = p_assessment_type_id
    and attempt_key_hash = p_attempt_key_hash
    and status = 'in_progress'
    and submission_state = 'draft'
    and last_activity_at >= now() - interval '7 days'
  order by last_activity_at desc
  limit 1
  for update;

  if found then
    v_expiry := least(now() + interval '24 hours', v_access.expires_at);

    update public.assessment_session_access
    set session_id = v_existing_session.id,
        last_seen_at = now(),
        expires_at = v_expiry
    where id = v_access.id;

    update public.sessions
    set last_activity_at = now()
    where id = v_existing_session.id;

    return jsonb_build_object(
      'success', true,
      'session_id', v_existing_session.id,
      'lead_id', v_existing_session.lead_id,
      'assessment_version', v_existing_session.assessment_version,
      'scoring_engine_version', v_existing_session.scoring_engine_version,
      'expires_at', v_expiry,
      'resumed', true
    );
  end if;

  insert into public.sessions (
    lead_id,
    assessment_type_id,
    assessment_user_id,
    status,
    submission_state,
    current_question,
    started_at,
    last_activity_at,
    attempt_key_hash,
    assessment_version,
    scoring_engine_version
  )
  values (
    p_lead_id,
    p_assessment_type_id,
    null,
    'in_progress',
    'draft',
    0,
    now(),
    now(),
    p_attempt_key_hash,
    v_assessment_version,
    'server-score-v1'
  )
  returning * into v_session;

  update public.assessment_session_access
  set session_id = v_session.id,
      last_seen_at = now()
  where id = v_access.id;

  return jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'lead_id', v_session.lead_id,
    'assessment_version', v_session.assessment_version,
    'scoring_engine_version', v_session.scoring_engine_version,
    'expires_at', v_access.expires_at,
    'resumed', false
  );
end;
$function$;

-- Protected start retains its public signature but now allows multiple access tokens
-- to bind to the same active session instead of replacing a previous token.
create or replace function public.start_assessment_session(
  p_access_token_hash text,
  p_assessment_user_id uuid,
  p_assessment_type_id uuid,
  p_lead_id uuid
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_user public.assessment_users%rowtype;
  v_session public.sessions%rowtype;
  v_assessment_version integer;
  v_expiry timestamptz;
begin
  select *
    into v_access
  from public.assessment_session_access
  where token_hash = p_access_token_hash
    and assessment_user_id = p_assessment_user_id
    and assessment_type_id = p_assessment_type_id
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired assessment access';
  end if;

  select at.version
    into v_assessment_version
  from public.assessment_types at
  where at.id = p_assessment_type_id
    and at.status = 'published';

  if v_assessment_version is null then
    raise exception using errcode = '42501', message = 'Assessment unavailable';
  end if;

  select *
    into v_user
  from public.assessment_users
  where id = p_assessment_user_id
  for update;

  if not found or not v_user.active then
    raise exception using errcode = '28000', message = 'Assessment access is inactive';
  end if;

  if v_user.expires_at is not null and v_user.expires_at <= now() then
    raise exception using errcode = '28000', message = 'Assessment access is expired';
  end if;

  if v_user.assessment_key is distinct from (
    select at.slug from public.assessment_types at where at.id = p_assessment_type_id
  ) then
    raise exception using errcode = '42501', message = 'Assessment mismatch';
  end if;

  select *
    into v_session
  from public.sessions
  where assessment_user_id = p_assessment_user_id
    and assessment_type_id = p_assessment_type_id
    and status = 'in_progress'
    and submission_state in ('draft', 'processing')
    and last_activity_at >= now() - interval '7 days'
  order by last_activity_at desc
  limit 1
  for update;

  if not found then
    if coalesce(v_user.used_count, 0) >= coalesce(v_user.max_uses, 1) then
      raise exception using errcode = '42501', message = 'Usage limit exceeded';
    end if;

    insert into public.sessions (
      lead_id,
      assessment_type_id,
      assessment_user_id,
      status,
      submission_state,
      current_question,
      started_at,
      last_activity_at,
      assessment_version,
      scoring_engine_version
    )
    values (
      p_lead_id,
      p_assessment_type_id,
      p_assessment_user_id,
      'in_progress',
      'draft',
      0,
      now(),
      now(),
      (select at.version from public.assessment_types at where at.id = p_assessment_type_id),
      'server-score-v1'
    )
    returning * into v_session;
  end if;

  v_expiry := least(
    now() + interval '24 hours',
    coalesce(v_user.expires_at, now() + interval '24 hours')
  );

  update public.assessment_session_access
  set session_id = v_session.id,
      last_seen_at = now(),
      expires_at = v_expiry
  where id = v_access.id;

  update public.sessions
  set last_activity_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'lead_id', v_session.lead_id,
    'assessment_version', v_session.assessment_version,
    'scoring_engine_version', v_session.scoring_engine_version,
    'expires_at', v_expiry,
    'resumed', true
  );
end;
$function$;

revoke execute on function public.start_public_assessment_session(text, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.start_assessment_session(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_public_assessment_session(text, uuid, uuid, text) to service_role;
grant execute on function public.start_assessment_session(text, uuid, uuid, uuid) to service_role;

comment on column public.sessions.submission_state is
  'P4 lifecycle: draft while answering, processing while final snapshot is being scored/finalized, completed after successful submission.';

comment on column public.sessions.submission_snapshot is
  'Immutable server-captured answer set used as the sole input to final submission calculation.';

comment on column public.sessions.submission_fingerprint is
  'SHA-256 fingerprint of the canonical submission snapshot.';

comment on column public.sessions.attempt_key_hash is
  'Hash of the browser attempt coordination key; not an authorization secret.';

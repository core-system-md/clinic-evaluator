-- Protected assessment access foundation
-- Project: core-system-md/clinic-evaluator
-- Date: 2026-10-01
--
-- Additive/corrective migration. Existing direct runtime access is retired
-- only after the new server path is verified.

begin;

alter table public.sessions
  add column if not exists assessment_user_id uuid
    references public.assessment_users(id) on delete set null,
  add column if not exists usage_consumed_at timestamptz;

create index if not exists sessions_assessment_user_id_idx
  on public.sessions (assessment_user_id);

create index if not exists sessions_assessment_user_status_idx
  on public.sessions (assessment_user_id, assessment_type_id, status, started_at desc);

create table if not exists public.assessment_session_access (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade,
  assessment_user_id uuid not null references public.assessment_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create unique index if not exists assessment_session_access_session_uidx
  on public.assessment_session_access (session_id)
  where session_id is not null;

create index if not exists assessment_session_access_user_idx
  on public.assessment_session_access (assessment_user_id, expires_at);

alter table public.assessment_session_access enable row level security;

revoke all on table public.assessment_session_access from public, anon, authenticated;
grant all on table public.assessment_session_access to service_role;

alter table public.answers
  add column if not exists option_index integer,
  add column if not exists option_value integer,
  add column if not exists chosen_option_label text;

alter table public.answers drop constraint if exists answers_answer_value_check;

alter table public.answers
  add constraint answers_answer_value_compat_check
  check (answer_value in (0, 1, 2, 3, 4, 5, 40, 100));

create unique index if not exists answers_session_question_uidx
  on public.answers (session_id, question_id)
  where session_id is not null;

create or replace function public.start_assessment_session(
  p_access_token_hash text,
  p_assessment_user_id uuid,
  p_assessment_type_id uuid,
  p_lead_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_access public.assessment_session_access%rowtype;
  v_user public.assessment_users%rowtype;
  v_session public.sessions%rowtype;
  v_existing_access public.assessment_session_access%rowtype;
  v_expiry timestamptz;
begin
  select *
    into v_access
    from public.assessment_session_access
   where token_hash = p_access_token_hash
     and assessment_user_id = p_assessment_user_id
     and revoked_at is null
     and expires_at > now()
   for update;

  if not found then
    raise exception using errcode = '28000', message = 'Invalid or expired assessment access';
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
    select at.slug
      from public.assessment_types at
     where at.id = p_assessment_type_id
  ) then
    raise exception using errcode = '42501', message = 'Assessment mismatch';
  end if;

  select *
    into v_session
    from public.sessions
   where assessment_user_id = p_assessment_user_id
     and assessment_type_id = p_assessment_type_id
     and status = 'in_progress'
   order by started_at desc
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
      current_question,
      started_at
    )
    values (
      p_lead_id,
      p_assessment_type_id,
      p_assessment_user_id,
      'in_progress',
      0,
      now()
    )
    returning * into v_session;
  else
    if v_session.lead_id is distinct from p_lead_id then
      update public.sessions
         set lead_id = p_lead_id
       where id = v_session.id
       returning * into v_session;
    end if;
  end if;

  select *
    into v_existing_access
    from public.assessment_session_access
   where session_id = v_session.id
     and revoked_at is null
     and id <> v_access.id
   for update;

  v_expiry := least(
    now() + interval '24 hours',
    coalesce(v_user.expires_at, now() + interval '24 hours')
  );

  if found then
    update public.assessment_session_access
       set token_hash = p_access_token_hash,
           assessment_user_id = p_assessment_user_id,
           last_seen_at = now(),
           expires_at = v_expiry,
           revoked_at = null
     where id = v_existing_access.id;

    delete from public.assessment_session_access
     where id = v_access.id;
  else
    update public.assessment_session_access
       set session_id = v_session.id,
           last_seen_at = now(),
           expires_at = v_expiry
     where id = v_access.id;
  end if;

  return jsonb_build_object(
    'success', true,
    'session_id', v_session.id,
    'lead_id', v_session.lead_id,
    'expires_at', v_expiry
  );
end;
$function$;

revoke all on function public.start_assessment_session(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_assessment_session(text, uuid, uuid, uuid) to service_role;

create or replace function public.complete_assessment_session(
  p_session_id uuid,
  p_assessment_user_id uuid,
  p_overall_score numeric,
  p_classification text,
  p_score_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_session public.sessions%rowtype;
  v_user public.assessment_users%rowtype;
  v_completed_at timestamptz := now();
  v_existing_score numeric;
begin
  select *
    into v_session
    from public.sessions
   where id = p_session_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Assessment session not found';
  end if;

  if v_session.assessment_user_id is distinct from p_assessment_user_id then
    raise exception using errcode = '42501', message = 'Assessment session ownership mismatch';
  end if;

  if v_session.status = 'completed' then
    if v_session.usage_consumed_at is null then
      raise exception using errcode = 'XX001', message = 'Completed session has no usage consumption';
    end if;

    select l.score_percentage
      into v_existing_score
      from public.leads l
     where l.id = v_session.lead_id;

    return jsonb_build_object(
      'success', true,
      'already_completed', true,
      'session_id', p_session_id,
      'overall_score', v_existing_score
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception using errcode = '42501', message = 'Assessment session is not completable';
  end if;

  if jsonb_typeof(p_score_rows) <> 'array' or jsonb_array_length(p_score_rows) = 0 then
    raise exception using errcode = '22023', message = 'No score rows supplied';
  end if;

  if exists (
    select 1
      from jsonb_to_recordset(p_score_rows) as s(
        axis_id text,
        axis_name_ar text,
        axis_name_en text,
        raw_score integer,
        max_possible integer,
        percentage numeric,
        weight numeric,
        weighted_score numeric,
        grade text
      )
     where s.axis_id is null or btrim(s.axis_id) = ''
  ) then
    raise exception using errcode = '22023', message = 'Invalid score rows';
  end if;

  select *
    into v_user
    from public.assessment_users
   where id = p_assessment_user_id
   for update;

  if not found or not v_user.active then
    raise exception using errcode = '42501', message = 'Assessment access is inactive';
  end if;

  if v_user.expires_at is not null and v_user.expires_at <= now() then
    raise exception using errcode = '42501', message = 'Assessment access is expired';
  end if;

  if coalesce(v_user.used_count, 0) >= coalesce(v_user.max_uses, 1) then
    raise exception using errcode = '42501', message = 'Usage limit exceeded';
  end if;

  delete from public.scores
   where session_id = p_session_id;

  insert into public.scores (
    session_id,
    lead_id,
    axis_id,
    axis_name_ar,
    axis_name_en,
    raw_score,
    max_possible,
    percentage,
    weight,
    weighted_score,
    grade
  )
  select
    p_session_id,
    v_session.lead_id,
    s.axis_id,
    s.axis_name_ar,
    s.axis_name_en,
    s.raw_score,
    s.max_possible,
    s.percentage,
    s.weight,
    s.weighted_score,
    s.grade
  from jsonb_to_recordset(p_score_rows) as s(
    axis_id text,
    axis_name_ar text,
    axis_name_en text,
    raw_score integer,
    max_possible integer,
    percentage numeric,
    weight numeric,
    weighted_score numeric,
    grade text
  );

  update public.leads
     set completed = true,
         score_total = round(coalesce(p_overall_score, 0)),
         score_percentage = coalesce(p_overall_score, 0),
         completed_at = v_completed_at
   where id = v_session.lead_id;

  update public.assessment_users
     set used_count = coalesce(used_count, 0) + 1
   where id = p_assessment_user_id;

  update public.sessions
     set status = 'completed',
         completed_at = v_completed_at,
         usage_consumed_at = v_completed_at
   where id = p_session_id;

  update public.assessment_session_access
     set last_seen_at = v_completed_at,
         revoked_at = v_completed_at
   where session_id = p_session_id
     and revoked_at is null;

  return jsonb_build_object(
    'success', true,
    'already_completed', false,
    'session_id', p_session_id,
    'overall_score', coalesce(p_overall_score, 0),
    'classification', p_classification,
    'used_count', coalesce(v_user.used_count, 0) + 1,
    'completed_at', v_completed_at
  );
end;
$function$;

revoke all on function public.complete_assessment_session(uuid, uuid, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_assessment_session(uuid, uuid, numeric, text, jsonb) to service_role;

commit;

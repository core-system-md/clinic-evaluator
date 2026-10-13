\set ON_ERROR_STOP on

-- Reuse the disposable P4 schema and the repository's actual save_assessment_answer
-- implementation, rather than replacing it with a test-only approximation.
\i tests/p4-protected-function-harness.sql

-- The minimal P4 fixture predates the axis_id field used by save_assessment_answer.
-- Add it before the function is invoked so the RPC runs against its required shape.
alter table public.questions add column axis_id uuid;

-- Match the production compatibility constraint before applying C-02.
alter table public.answers
  add constraint answers_answer_value_compat_check
  check (answer_value in (0, 1, 2, 3, 4, 5, 40, 100));

create unique index answers_session_question_c02_e2e_uidx
  on public.answers(session_id, question_id);

-- Preserve the legacy values across the forward-only constraint replacement.
insert into public.answers(answer_value, option_value)
values (0,0),(1,1),(2,2),(3,3),(4,4),(5,5),(40,40),(100,100);

\i supabase/migrations/20261013110000_c02_allow_answer_value_70.sql

-- Fixture a real session/access/question/option path consumed by the production RPC.
insert into public.assessment_types(id,slug,version,status)
values ('55555555-5555-4555-8555-555555555555','c02-answer-save-fixture',1,'published');

insert into public.assessment_users(
  id,assessment_key,username,password_hash,active,expires_at,max_uses,used_count
) values (
  '66666666-6666-4666-8666-666666666666',
  'c02-answer-save-fixture','c02-fixture','fixture-password-hash',
  true,now()+interval '1 day',1,0
);

insert into public.sessions(
  id,lead_id,assessment_type_id,assessment_user_id,status,submission_state,
  current_question,started_at,last_activity_at,assessment_version,scoring_engine_version
) values (
  '77777777-7777-4777-8777-777777777777',
  null,
  '55555555-5555-4555-8555-555555555555',
  '66666666-6666-4666-8666-666666666666',
  'in_progress','draft',0,now(),now(),1,'server-score-v1'
);

insert into public.assessment_session_access(
  id,session_id,assessment_user_id,assessment_type_id,token_hash,expires_at
) values (
  '88888888-8888-4888-8888-888888888888',
  '77777777-7777-4777-8777-777777777777',
  '66666666-6666-4666-8666-666666666666',
  '55555555-5555-4555-8555-555555555555',
  'c02-e2e-token-hash',now()+interval '1 day'
);

insert into public.questions(
  id,assessment_type_id,code,question_text,question_text_ar,axis_id,display_order
) values (
  '99999999-9999-4999-8999-999999999999',
  '55555555-5555-4555-8555-555555555555',
  'c02-q-70','Fixture question','سؤال اختبار',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1
);

insert into public.options(id,question_id,option_index,option_value,label,label_ar,is_trap,display_order)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '99999999-9999-4999-8999-999999999999',
  1,70,'Seventy','سبعون',false,1
), (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '99999999-9999-4999-8999-999999999999',
  2,99,'Unsupported','غير مدعوم',false,2
);

-- End-to-end success path: call the actual function loaded from the P4 migration.
do $e2e$
declare
  v_result jsonb;
begin
  v_result := public.save_assessment_answer(
    'c02-e2e-token-hash',
    'c02-q-70',
    1,
    2
  );

  if v_result->>'question_id' <> 'c02-q-70'
     or (v_result->>'option_index')::integer <> 1 then
    raise exception 'save_assessment_answer returned unexpected result: %', v_result;
  end if;

  if not exists (
    select 1 from public.answers
     where session_id='77777777-7777-4777-8777-777777777777'::uuid
       and question_id='c02-q-70'
       and option_index=1
       and option_value=70
       and answer_value=70
       and chosen_option_label='سبعون'
  ) then
    raise exception 'save_assessment_answer did not persist option_value=70 and answer_value=70';
  end if;

  if not exists (
    select 1 from public.sessions
     where id='77777777-7777-4777-8777-777777777777'::uuid
       and current_question=2
  ) then
    raise exception 'save_assessment_answer did not update session progress';
  end if;

  if not exists (
    select 1 from public.assessment_session_access
     where token_hash='c02-e2e-token-hash'
       and last_seen_at >= created_at
  ) then
    raise exception 'save_assessment_answer did not update access activity';
  end if;
end
$e2e$;

-- Rejected values must fail through the same production RPC and leave the saved
-- valid answer unchanged.
do $reject$
begin
  begin
    perform public.save_assessment_answer(
      'c02-e2e-token-hash',
      'c02-q-70',
      2,
      3
    );
    raise exception 'save_assessment_answer unexpectedly accepted option value 99';
  exception when check_violation then
    null;
  end;

  if not exists (
    select 1 from public.answers
     where session_id='77777777-7777-4777-8777-777777777777'::uuid
       and question_id='c02-q-70'
       and option_index=1
       and option_value=70
       and answer_value=70
  ) then
    raise exception 'Rejected save altered or removed the valid value-70 answer';
  end if;
end
$reject$;

-- Confirm the legacy accepted set still works after the migration.
do $legacy$
declare
  v integer;
begin
  foreach v in array array[0,1,2,3,4,5,40,100] loop
    if not exists (select 1 from public.answers where answer_value=v and option_value=v) then
      raise exception 'Legacy answer value % was not preserved', v;
    end if;
  end loop;
end
$legacy$;

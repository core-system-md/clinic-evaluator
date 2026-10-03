-- P4 protected completion local integration fixture.
-- Runs only against the disposable local Supabase database in CI.
\set ON_ERROR_STOP on

begin;

delete from public.assessment_session_access where id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.sessions where id = '22222222-2222-4222-8222-222222222222'::uuid;
delete from public.assessment_users where id = '33333333-3333-4333-8333-333333333333'::uuid;
delete from public.assessment_types where id = '44444444-4444-4444-8444-444444444444'::uuid;

insert into public.assessment_types (
  id, slug, title_ar, title_en, description, question_count, axis_count,
  has_traps, has_ev_simulator, config_version, is_active, created_at,
  status, version, updated_at, published_at, archived_at, created_by,
  parent_id, kpi_mappings, ev_mappings, axis_roles, family_id
) values (
  '44444444-4444-4444-8444-444444444444'::uuid,
  'p4-protected-fixture',
  'P4 Fixture', 'P4 Fixture', 'Disposable CI fixture',
  0, 0, false, false, 1, true, now(),
  'draft', 1, now(), null, null, null,
  null, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, null
);

insert into public.assessment_users (
  id, assessment_key, username, password_hash, active,
  expires_at, max_uses, used_count
) values (
  '33333333-3333-4333-8333-333333333333'::uuid,
  'p4-protected-fixture', 'p4-fixture', 'fixture-password-hash', true,
  now() + interval '1 day', 1, 0
);

insert into public.sessions (
  id, lead_id, assessment_type_id, assessment_user_id,
  status, submission_state, current_question, started_at, last_activity_at,
  assessment_version, scoring_engine_version
) values (
  '22222222-2222-4222-8222-222222222222'::uuid,
  null,
  '44444444-4444-4444-8444-444444444444'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  'in_progress', 'draft', 0, now(), now(), 1, 'server-score-v1'
);

insert into public.assessment_session_access (
  id, session_id, assessment_user_id, assessment_type_id,
  token_hash, expires_at
) values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  '22222222-2222-4222-8222-222222222222'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'p4-fixture-token-hash',
  now() + interval '1 day'
);

select public.prepare_assessment_submission(
  '22222222-2222-4222-8222-222222222222'::uuid,
  'p4-fixture-token-hash',
  '{}'::jsonb
);

do $
begin
  if not exists (
    select 1 from public.sessions
    where id = '22222222-2222-4222-8222-222222222222'::uuid
      and submission_state = 'processing'
      and submission_snapshot = '[]'::jsonb
      and submission_economic_input = '{}'::jsonb
      and submission_fingerprint is not null
  ) then
    raise exception 'prepare did not freeze the protected submission context';
  end if;
end $;

commit;

-- CI fixture intentionally disposable; no production data is referenced.

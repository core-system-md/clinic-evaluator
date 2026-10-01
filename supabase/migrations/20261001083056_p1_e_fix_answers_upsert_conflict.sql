-- Canonical historical migration name matching the production migration history.
-- The repository previously recorded this migration under 20261001083200.

alter table public.answers
  add constraint answers_session_question_unique
  unique (session_id, question_id);

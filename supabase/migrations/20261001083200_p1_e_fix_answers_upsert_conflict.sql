-- P1-E runtime verification fix
-- The assessment-access function saves answers with
-- ON CONFLICT (session_id, question_id). The live schema previously
-- had no matching unique constraint, causing the first answer request
-- to fail with HTTP 500. Existing non-null session/question pairs were
-- verified to contain no duplicates before applying this constraint.

alter table public.answers
  add constraint answers_session_question_unique
  unique (session_id, question_id);

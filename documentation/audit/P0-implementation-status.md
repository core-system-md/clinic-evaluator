# P0 — Implementation Status

**Status:** IMPLEMENTED — UNVERIFIED / BLOCKED BY ARCHITECTURAL DECISION

## Implemented in this iteration

- Added `sessions.assessment_user_id` to bind a protected session to its assessment credential.
- Added `sessions.usage_consumed_at` to record the exact completion at which a use was consumed.
- Added `assessment_session_access` for server-issued opaque access tokens; anonymous/authenticated table access is revoked and the table is service-role controlled.
- Added `answers.option_index`, `answers.option_value`, and `answers.chosen_option_label` to align the runtime write contract with the current client model.
- Replaced the conflicting legacy `answer_value` constraint with a compatibility constraint that permits both legacy 1–5 records and current 0/40/100 scoring values during transition.
- Added a partial unique index preventing duplicate answers for the same session/question while preserving legacy rows with null session ids.
- Added `start_assessment_session(...)` as a service-role-only invoker function with session binding, assessment matching, expiration checks, and resume behavior.
- Added `complete_assessment_session(...)` as a service-role-only invoker function that performs idempotent completion and atomic usage consumption with row locks.
- Added and deployed the scoped `assessment-access` Edge Function for authentication, session start/resume, answer persistence, progress updates, and session retrieval.

## Verification evidence

- Database objects were queried after deployment and confirmed present.
- Access table is not readable by `anon`/`authenticated`.
- Start/complete functions are not executable by `anon`/`authenticated`; completion is executable by `service_role`.
- A transactional database test created temporary assessment data, completed a session once, retried completion, and confirmed exactly one usage was consumed and exactly one score row remained. Test data was cleaned up.
- The deployed Edge Function is `ACTIVE` at version 1.

## Not yet verified

- Positive end-to-end protected login/runtime flow is not currently executable without creating production test credentials; the live `assessment_users` table currently has no issued protected users.
- The new endpoint has not yet been integrated into the browser flow.
- Direct public writes/reads to the legacy runtime tables have not yet been revoked because the current browser still depends on them.
- Official server-side scoring is not yet integrated.

## Current blocker

ADR-007 is open because ADR-002 requires an immediate browser calculation while ADR-005 requires the scoring methodology to remain private. The browser cannot calculate the private rules without receiving them.

Implementation of the final completion path must stop until ADR-007 is explicitly resolved. No silent reinterpretation of ADR-002 is permitted.

## Next canonical action

Resolve ADR-007. Then continue implementation without reopening ADR-006 unless new evidence directly invalidates it.
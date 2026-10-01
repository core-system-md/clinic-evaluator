# P0 — Server-authoritative scoring progress

**Decision:** Option B accepted by project owner.

## Completed

1. ADR-007 accepted and documented.
2. A service-role-only RPC `complete_assessment_with_server_scoring(uuid, uuid)` is deployed in Supabase.
3. The RPC locks the session and assessment user, rejects inactive/incomplete sessions, and consumes usage exactly once on completion.
4. A server scoring engine has been added to the repository at `supabase/functions/assessment-access/score-engine.ts`.
5. The scoring engine implements the existing engine's core axis weighting, impact multipliers, trap penalties, global score, quartile, role translation, KPI mapping, and EV calculation without exposing those rules to the browser.
6. The HTTP/session layer has a separate `scoring.ts` boundary for invoking the server scoring RPC.

## Important verification state

- Supabase confirms the scoring RPC is executable by `service_role` only; `anon` and `authenticated` cannot execute it.
- The currently deployed `assessment-access` function is still version 1 and does not yet call the scoring boundary on final submission.
- The browser still contains the legacy local `AssessmentEngine` execution path and direct completion writes. This must be removed/replaced before production closure.
- The server scoring implementation is currently a repository implementation baseline and must be compared against the full `engine/engine.js` behavior with fixture tests before it can be called equivalent.

## Next canonical action

Wire final submission to the server scoring boundary, then add parity fixtures against the existing engine and verify the full protected workflow end-to-end.

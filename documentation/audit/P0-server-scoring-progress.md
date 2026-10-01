# P0 — Server-authoritative scoring progress

**Historical stage:** P0 server-scoring architecture work.  
**Current status:** **SUPERSEDED BY THE IMPLEMENTED / VERIFIED SERVER-SCORING PATH**.

**Owner decision:** Option B accepted by project owner.

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


---

## Current-status correction — 2026-10-01

The earlier progress statements in this document predate the final scoring transition and are retained only for historical traceability. The current production state is:

- `assessment-access` is ACTIVE at production Edge Function version 10 and imports `calculateAssessment` from `supabase/functions/assessment-access/score-engine.ts`.
- The browser no longer calculates the official assessment score and no longer writes leads, sessions, answers, or scores directly.
- The `complete` action loads the concrete assessment version pinned to the session, validates stored answers against that version, executes the server scoring engine, and persists score rows through the completion RPC.
- Production does **not** contain `complete_assessment_with_server_scoring(...)`. The current completion boundary is `complete_assessment_session(...)` for protected sessions and `complete_public_assessment_session(...)` for public sessions, invoked from the privileged Edge Function.
- `calculate_session_score(uuid)` remains a legacy non-authoritative scorer and is not executable by `anon` or `authenticated`.
- `supabase/functions/assessment-access/scoring.ts` remains an unused adapter that references the nonexistent `complete_assessment_with_server_scoring(...)` RPC. Its final disposition is a P3 engineering decision item.
- A server/browser parity test exists, but its current fixture set is limited and is not sufficient by itself to establish complete methodological correctness; P3 therefore expands the verification scope.

For current scoring behavior, use the P3 investigation and architecture documents rather than the historical progress claims above.
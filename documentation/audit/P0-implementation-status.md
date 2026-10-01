# P0 Implementation Status — Protected Assessment Access + Server Scoring

**Branch:** `implementation/protected-assessment-access`  
**Status:** IMPLEMENTED — RUNTIME E2E STILL UNVERIFIED

## Architectural state

ADR-007 is accepted with **Option B — Server-authoritative scoring only**. ADR-002 has been explicitly amended; the browser-local scoring path is no longer part of the target architecture.

## Implemented

- Protected assessment access uses an opaque server-issued token.
- Login does not consume usage.
- Starting/resuming does not consume usage.
- A successful completion consumes exactly one protected use.
- Repeated completion of the same session is idempotent.
- The existing session remains the canonical session record.
- Public assessments now also use a server-issued access token for runtime writes.
- Browser assessment content is fetched through `assessment-access/get_content` and excludes scoring weights, option values, impacts, trap rules, KPI mappings, EV mappings, and scoring equations.
- Browser no longer loads `assets/data/config.json` for runtime scoring data.
- Browser no longer invokes `AssessmentEngine.evaluate()` for final results.
- Browser no longer directly inserts scores or marks sessions completed.
- Answers are saved through the assessment gateway; option values are resolved server-side.
- Final completion loads authoritative questions/options/rules from Supabase, validates stored answers, calculates the result server-side, and then persists the score atomically.
- EV simulator calculation is routed through the same server gateway.
- `assessment-access` is deployed as ACTIVE v3 with custom token authentication.
- The database completion functions are callable by `service_role` only.
- Database transaction tests passed for protected/public start, resume, completion, and idempotency, with test data cleaned afterward.

## Verification

### Verified in database

- Session resume does not overwrite the original lead binding.
- Protected usage count remains exactly 1 after repeated completion.
- A repeated completion does not replace the original stored score.
- Public completion does not use protected usage accounting.
- `anon` and `authenticated` cannot execute the protected completion function.
- No test data remains after verification.

### Not yet verified

A real browser-to-Edge-Function positive E2E test has not been executed from an external runtime in this environment. The Supabase tooling available here can deploy and inspect the Edge Function but does not expose a direct function-invocation action.

Therefore the following are **implemented but not runtime-verified**:

1. Protected login from the real browser.
2. Public token issuance from the real browser.
3. Save-answer flow through the live Edge Function.
4. Final server scoring response rendered by the real browser.
5. Actual completion latency.

The Edge Function deployment itself succeeded as v3, which establishes deployment acceptance but not end-user E2E behavior.

## Residual P0/P1 work

- Legacy broad RLS/grants on public tables are still present and must be tightened before security closure.
- Legacy admin authentication (`admin-auth` / localStorage model) is still not replaced by ADR-004's Supabase Auth + `admin_users` authorization model.
- The old `calculate_session_score(uuid)` function remains legacy/untrusted and should be removed or made inaccessible after dependency verification.
- The runtime still contains legacy helper code that is no longer on the final completion path; cleanup can follow successful E2E verification.
## Additional security progress — 2026-10-01

- Added `admin_users` authorization foundation per ADR-004.
- RLS is enabled and a unique owner constraint exists.
- Current state: 5 Supabase Auth users exist, but `admin_users` has 0 rows.
- The final admin-auth replacement is therefore blocked only on the explicit project-owner choice of which existing Auth user is the primary owner; this is documented in ADR-008.
- The public assessment catalog now uses the assessment gateway instead of direct `assessment_types` reads.
- The legacy public `assets/data/config.json` scoring bundle and client-deliverable `engine/engine.js` were removed; the legacy engine is retained only as a test reference under `tests/reference/`.
- `assessment-access` is deployed ACTIVE v7 after version pinning and server-side eligibility/baseline migration.
# P4 — Implementation & Runtime Verification
## 2026-10-03

**Repository:** `core-system-md/clinic-evaluator`  
**Branch:** `p4/investigation-2026-10-02`  
**Current branch head:** `977ad3151563c5f9fd4a6144e415858c052524d2`  
**Production Edge Function:** `assessment-access` v18  
**Supabase project:** `oaqpzaarppccbnepffxx`

## Verified implementation

Owner-approved P4 behavior has been implemented:

- incremental answer persistence with session-row serialization;
- final server-side completeness check;
- immutable answer snapshot and fingerprint;
- frozen economic calculation context;
- idempotent completion and retry;
- concurrent completion collapse;
- multi-tab active-attempt reuse;
- concurrent active-attempt creation collapse;
- completed-session immutability and stored-result restoration;
- keyboard answer persistence before navigation;
- seven-day stale draft abandonment classification;
- P3 scoring methodology preserved.

## Runtime evidence

CI on the final implementation/test head passed:

- P3 kernel verification: SUCCESS;
- Full Node test suite: SUCCESS;
- P2 external E2E: SUCCESS;
- five live production E2E assessment jobs: SUCCESS;
- Cloudflare Pages preview deployment check: SUCCESS.

Each live assessment job verified:

`live published content`  
`public access issuance`  
`concurrent active-attempt creation collapse`  
`start_session`  
`multi-tab active-attempt resume`  
`all required answers saved`  
`production completion + Structured Result`  
`idempotent completion retry`  
`completed result survives session reopen`  
`completed session rejects late answer`  
`invalid token rejected`

The retry test deliberately supplied different `economic_input` values after the first submission context was frozen and still received the same Structured Result.

## Live database verification

P4 migrations are present in Supabase:

- `20261003090000_p4_submission_foundation`
- `20261003093000_p4_submission_prepare_finalize`
- `20261003103000_p4_submission_context_lock`

P4 submission RPCs are security-invoker, not SECURITY DEFINER, and executable only by `service_role`.

Synthetic E2E data was removed after each run. Final live counts returned to:

- 39 sessions total;
- 17 in progress;
- 22 completed;
- 5 assessment results;
- 157 answers;
- 215 score rows;
- 75 leads.

No recent synthetic Leads remain. Two orphan access rows produced by failed/partial test setup were explicitly removed; the final `assessment_session_access` count is 13, with no remaining null-session test access rows.

## Remaining unverified item

**Protected usage increment has NOT been runtime-tested with a newly created synthetic protected assessment user.**

The P4 protected finalizer was inspected and verified structurally:

1. locks the session;
2. returns the stored result when the session is already completed;
3. locks the protected assessment user before usage check/increment;
4. increments `used_count` inside the same transaction that completes the session;
5. sets `usage_consumed_at` as part of session completion.

The available production SQL safety boundary blocked creation of a synthetic security-sensitive test fixture, so no claim of runtime proof is made for this item.

## Closure status

P4 is **implementation-complete and broadly runtime-verified, but NOT CLOSED**.

The remaining closure condition is one controlled runtime test of protected usage idempotency/concurrency, followed by final Owner/engineering closure review.

No production merge to `main` is claimed by this record. The PR remains draft while that final evidence is outstanding.

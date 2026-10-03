# P4 — Implementation & Runtime Verification
## 2026-10-03

**Repository:** `core-system-md/clinic-evaluator`  
**Branch:** `p4/investigation-2026-10-02`  
**Current branch head:** `b9a81e70808849aba8e7ec1d218e7d6a98ee8395`  
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

## Protected completion runtime verification

The protected completion boundary is now runtime-tested on a disposable PostgreSQL service in GitHub Actions using the exact P4 migration SQL and a synthetic fixture isolated from production.

Verified in CI:

1. `prepare_assessment_submission` freezes the protected submission snapshot, fingerprint, and economic input;
2. two concurrent `complete_p4_assessment_session` calls serialize on the same session;
3. exactly one completion consumes the protected usage (`used_count = 1`);
4. exactly one `assessment_results` row is persisted;
5. `usage_consumed_at` is set on the completed session;
6. a later completion retry returns the stored result as `already_completed` and does not increment usage again.

This is a database/runtime transaction test of the protected completion boundary, not a hosted production protected-browser authentication test. Production protected-user data remains empty and was not modified.

## Closure status

P4 implementation and required runtime verification are now **complete**.

The PR remains draft and has **not** been merged to `main`. Merge/owner closure remains a separate repository action; no production merge is claimed by this record.

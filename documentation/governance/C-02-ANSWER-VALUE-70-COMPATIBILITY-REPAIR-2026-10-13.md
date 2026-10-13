# C-02 — Answer value 70 compatibility repair

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Status:** Implementation and disposable PostgreSQL verification passed in CI; production-state confirmation and deployed answer-save RPC E2E remain unverified. PR #86 is open and unmerged.  
**Production mutation:** Not performed and not authorized.

## Finding

The current compatibility constraint allows `0,1,2,3,4,5,40,100`, while current reconstructed assessment content includes 57 options with value 70. The answer-save contract writes the selected option value to `answers.answer_value`; therefore 70 must be accepted without dropping existing supported values.

## Change prepared

- New forward-only migration: `supabase/migrations/20261013110000_c02_allow_answer_value_70.sql`.
- It checks that the expected constraint exists and aborts if any existing non-null answer value is outside the intended compatibility set.
- It replaces only `answers_answer_value_compat_check` with `0,1,2,3,4,5,40,70,100`.
- Existing applied migrations are unchanged.
- A disposable PostgreSQL harness seeds legacy values, applies the new migration, verifies all supported values including 70, confirms the option/answer value pair persists, and verifies unsupported value 99 is rejected.
- A Node source-contract test and dedicated PostgreSQL GitHub Actions workflow are included.

## Verification state

- Production constraint re-confirmation and row inspection: **NOT VERIFIED in this C-02 run**; the prior D-14 read-only inventory recorded the old constraint and zero answer rows. No production query/write was used to execute this migration.
- Dedicated Node source-contract test: **PASS**, 2 tests, 0 failures in [C-02 CI run #5](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363328799).
- Disposable PostgreSQL harness: **PASS** in the same [C-02 CI run #5](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363328799). It applied the forward-only migration against a fresh disposable PostgreSQL 17 instance, inserted all allowed values including 70, verified matching option/answer value persistence, confirmed legacy values remained accepted, and confirmed unsupported 99 was rejected.
- Full Node test suite: **PASS** in [P3 verification run #417](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363328225).
- P3 isolated kernel and P4 disposable PostgreSQL protected-completion checks: **PASS** in [P3 verification run #417](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363328225).
- The first dedicated PostgreSQL attempt failed because the harness contained a doubled backslash in the psql include directive. The harness was corrected in commit `b441e2fb1dff68c605a6acfe3f6203a2bdb20436`; the subsequent C-02 CI run passed.
- Local PostgreSQL execution: **NOT RUN**; verification was performed by the disposable PostgreSQL GitHub Actions service.
- Production read-only re-check (2026-10-13): **CONFIRMED** — `public.answers.answers_answer_value_compat_check` still allows `0,1,2,3,4,5,40,100`; `public.answers` currently contains 0 rows. This was metadata/count-only SQL. No Production DDL or data mutation was executed.
- Actual deployed answer-save RPC E2E: **NOT VERIFIED**; the disposable harness tests the constraint-facing insert contract, not the complete deployed RPC dependency graph.

## Safety and closure

No Supabase Production DDL/data write, migration application, migration-history change, Edge Function deployment, or Cloudflare Pages action was performed. Do not apply this migration to Production without separate explicit owner approval. C-02's repository implementation and disposable tests are passing, but do not claim the whole operational gate closed until PR review/merge authorization is separately resolved and the owner decides whether additional Production read-only confirmation or RPC-level testing is required. C-03 must not start automatically.

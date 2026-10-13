# C-02 — Answer value 70 compatibility repair

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Status:** C-02 implementation and repository `save_assessment_answer` RPC end-to-end verification passed on disposable PostgreSQL in CI. Production constraint state was re-confirmed read-only. PR #86 remains open and unmerged; no Production migration was applied.  
**Production mutation:** Not performed and not authorized.

## Finding

The current compatibility constraint allows `0,1,2,3,4,5,40,100`, while current reconstructed assessment content includes 57 options with value 70. The answer-save contract writes the selected option value to `answers.answer_value`; therefore 70 must be accepted without dropping existing supported values.

## Change prepared

- New forward-only migration: `supabase/migrations/20261013110000_c02_allow_answer_value_70.sql`.
- It checks that the expected constraint exists and aborts if any existing non-null answer value is outside the intended compatibility set.
- It replaces only `answers_answer_value_compat_check` with `0,1,2,3,4,5,40,70,100`.
- Existing applied migrations are unchanged.
- The disposable PostgreSQL harness loads the repository's actual `save_assessment_answer` implementation from the P4 migration, creates synthetic session/access/question/option fixtures, applies the new migration, and calls the RPC end-to-end.
- It verifies that option value 70 is persisted to both `option_value` and `answer_value`, the returned RPC payload is correct, session progress/access activity are updated, unsupported option value 99 is rejected without replacing the valid answer, and legacy values remain accepted.
- A Node source-contract test, dedicated C-02 workflow, and an independent disposable-PostgreSQL job in the existing P3 workflow cover the harness.

## Verification state

- Production constraint and row-count re-check (2026-10-13): **PASS, read-only** — the live constraint still allows `0,1,2,3,4,5,40,100`, and `public.answers` contains 0 rows. No production DDL/data mutation was performed.
- Dedicated Node migration/RPC harness contract: **PASS**, 2 tests, 0 failures in [C-02 CI run #14](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363993137).
- Repository RPC end-to-end on disposable PostgreSQL 17: **PASS** in [C-02 CI run #14](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363993137). The workflow applied the forward-only migration and executed the real `public.save_assessment_answer` function definition from the P4 repository migration against synthetic fixtures. It verified value-70 persistence, RPC return fields, session progress/access activity updates, rejection of option value 99 without damaging the valid answer, and preservation of all legacy values.
- Full Node suite, P3 isolated kernel, and P4 protected-completion disposable PostgreSQL gate: **PASS** in [P3 verification run #426](https://github.com/core-system-md/clinic-evaluator/actions/runs/38363993200). The added C-02 RPC E2E job also passed in that run.
- The first dedicated PostgreSQL attempt failed because the harness contained a doubled backslash in the psql include directive. The harness was corrected in commit `b441e2fb1dff68c605a6acfe3f6203a2bdb20436`; the subsequent C-02 CI run passed.
- Local PostgreSQL execution: **NOT RUN**; verification was performed by the disposable PostgreSQL GitHub Actions service.
- Production read-only re-check (2026-10-13): **CONFIRMED** — `public.answers.answers_answer_value_compat_check` still allows `0,1,2,3,4,5,40,100`; `public.answers` currently contains 0 rows. This was metadata/count-only SQL. No Production DDL or data mutation was executed.
- Repository `save_assessment_answer` RPC E2E on disposable PostgreSQL: **PASS**. This executes the repository function definition end-to-end, not the deployed Production database/function. Production runtime execution remains **NOT VERIFIED** and was intentionally not attempted.

## Safety and closure

No Supabase Production DDL/data write, migration application, migration-history change, Edge Function deployment, or Cloudflare Pages action was performed. The C-02 implementation and disposable RPC-level verification gate is complete on the PR branch. PR #86 remains open and unmerged pending review/explicit merge authorization; applying the migration to Production requires separate explicit owner approval. Production runtime execution is not claimed. C-03 has not started and must not start automatically.

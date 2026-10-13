# C-02 — Answer value 70 compatibility repair

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Status (updated 2026-10-13):** C-02 implementation and repository `save_assessment_answer` RPC end-to-end verification passed on disposable PostgreSQL in CI. PR #86 was squash-merged into `main` as `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`. The Production constraint was re-confirmed read-only before merge; no Production migration was applied. Production runtime remains NOT VERIFIED.  
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
- Dedicated Node migration/RPC harness contract: **PASS**, 2 tests, 0 failures in [C-02 CI run #16](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130139).
- Repository RPC end-to-end on disposable PostgreSQL 17: **PASS** in [C-02 CI run #16](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130139). The workflow applied the forward-only migration and executed the real `public.save_assessment_answer` function definition from the P4 repository migration against synthetic fixtures. It verified value-70 persistence, RPC return fields, session progress/access activity updates, rejection of option value 99 without damaging the valid answer, and preservation of all legacy values.
- Full Node suite, P3 isolated kernel, and P4 protected-completion disposable PostgreSQL gate: **PASS** in [P3 verification run #428](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130147). The added C-02 RPC E2E job also passed in that run.
- The first dedicated PostgreSQL attempt failed because the harness contained a doubled backslash in the psql include directive. The harness was corrected in commit `b441e2fb1dff68c605a6acfe3f6203a2bdb20436`; the subsequent C-02 CI run passed.
- Local PostgreSQL execution: **NOT RUN**; verification was performed by the disposable PostgreSQL GitHub Actions service.
- Production read-only re-check (2026-10-13): **CONFIRMED** — `public.answers.answers_answer_value_compat_check` still allows `0,1,2,3,4,5,40,100`; `public.answers` currently contains 0 rows. This was metadata/count-only SQL. No Production DDL or data mutation was executed.
- Repository `save_assessment_answer` RPC E2E on disposable PostgreSQL: **PASS**. This executes the repository function definition end-to-end, not the deployed Production database/function. Production runtime execution remains **NOT VERIFIED** and was intentionally not attempted.

## Safety and closure

No Supabase Production DDL/data write, migration application, migration-history change, or Edge Function deployment was performed for C-02. PR #86 was merged into `main` by squash on 2026-10-13; merge commit: `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`. The merge may trigger the configured Cloudflare Pages automatic deployment; the deployment result and deployed artifact have not been verified as part of this record. The migration remains unapplied to Supabase Production and requires separate explicit owner approval. Production runtime execution remains NOT VERIFIED. C-02 repository implementation and disposable PostgreSQL RPC E2E are merged and tested, but do not by themselves establish Production verification or satisfy the full assessment-family E2E closure gate. C-03 has not started and must not start automatically.


## Post-merge reconciliation — 2026-10-13

- **PR #86:** merged by squash into `main`; merge commit `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`.
- **Dedicated C-02 CI run #16:** PASS — [run 38364130139](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130139); Node source-contract tests (2/2) and disposable PostgreSQL 17 RPC E2E passed.
- **Integrated P3 verification run #428:** PASS — [run 38364130147](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130147); full Node suite, P3 isolated kernel, P4 disposable PostgreSQL protected-completion gate, and C-02 RPC E2E passed.
- **Production boundary:** the previously recorded read-only check found the live constraint still excludes 70 and `public.answers` had 0 rows. No Production migration, DDL/data write, RPC execution, or Edge deployment was performed. Do not treat this pre-merge read-only observation as a post-merge Production verification.
- **Cloudflare Pages:** push/merge to `main` is configured to trigger automatic deployment. Deployment status and deployed commit/artifact have not been independently verified in this update.
- **Status by contract:** IMPLEMENTATION STATUS = IMPLEMENTED; TEST STATUS = TESTED; RUNTIME STATUS = NOT VERIFIED; PRODUCTION STATUS = NOT VERIFIED; DOCUMENTATION STATUS = UPDATED IN THIS COMMIT; OPEN RISKS = Production constraint still requires the approved migration, deployed runtime is unverified, Pages deployment status unverified; OPEN DECISIONS = explicit approval for any Production migration/application and any Production runtime test; CLOSURE EVIDENCE = CI runs #16 and #428 plus merge commit above; FINAL STATUS = VERIFIED (repository implementation and disposable PostgreSQL gate only), not CLOSED as a full production-facing release.
- **Next step:** stop after this handoff reconciliation. Do not apply the migration and do not start C-03.

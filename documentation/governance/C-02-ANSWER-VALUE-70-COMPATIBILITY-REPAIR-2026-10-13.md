# C-02 — Answer value 70 compatibility repair

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Status (updated 2026-10-13):** the value-70 persistence repair is merged, and the scoring-path correction is implemented in commit [`41037bee`](https://github.com/core-system-md/clinic-evaluator/commit/41037bee21708f661671dbff484f0df031d81fcb). P3 verification run [#430](https://github.com/core-system-md/clinic-evaluator/actions/runs/38377217349) passed, and Supabase Edge Function `assessment-access` version 36 is deployed. The migration ledger and constraint currently show value 70 is allowed. Live-session scoring E2E remains NOT VERIFIED; migration-application provenance remains unknown.  
**Production mutation:** This continuation deployed Edge Function version 36 as the requested scoring activation. It did not apply a migration, execute a Production RPC, or create/modify Production answer/session data.

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

At the original C-02 persistence-repair stage, no Supabase Production DDL/data write, migration application, migration-history change, or Edge Function deployment was performed. The later scoring activation deployment is recorded in the post-deployment reconciliation below. PR #86 was merged into `main` by squash on 2026-10-13; merge commit: `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`. The merge may trigger the configured Cloudflare Pages automatic deployment; the deployment result and deployed artifact have not been verified as part of this record. At the time of the original C-02 implementation, the migration had not been applied to Supabase Production. A later read-only check now observes it in the Production migration ledger; the actor/time of application is unknown. Production runtime execution remains NOT VERIFIED. C-02 repository implementation and disposable PostgreSQL RPC E2E are merged and tested, but do not by themselves establish Production verification or satisfy the full assessment-family E2E closure gate. C-03 has not started and must not start automatically.


## Post-merge reconciliation — 2026-10-13

- **PR #86:** merged by squash into `main`; merge commit `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`.
- **Dedicated C-02 CI run #16:** PASS — [run 38364130139](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130139); Node source-contract tests (2/2) and disposable PostgreSQL 17 RPC E2E passed.
- **Integrated P3 verification run #428:** PASS — [run 38364130147](https://github.com/core-system-md/clinic-evaluator/actions/runs/38364130147); full Node suite, P3 isolated kernel, P4 disposable PostgreSQL protected-completion gate, and C-02 RPC E2E passed.
- **Production pre-merge evidence:** the read-only check before merge found the constraint excluded 70 and `public.answers` had 0 rows. This is historical evidence, not the current state.
- **Production post-merge read-only evidence (2026-10-13):** Supabase migration ledger lists version `20261013110000` / `c02_allow_answer_value_70` as applied; the live constraint now allows `0,1,2,3,4,5,40,70,100`; `public.answers` still contains 0 rows. These checks do not identify who applied the migration or when. No migration, DDL/data write, RPC execution, or Edge deployment was performed by this continuation.
- **Cloudflare Pages:** Production deployment `815c64a2-ab9b-4d46-b3b9-c63c175bdc1f` succeeded for C-02 merge commit `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`; the follow-up documentation commit `375737c29cb038070842eefd4d46b854fff253ad` also deployed successfully as `d7d28cde-d990-45ae-a832-62b9bad67cc5`.
- **Status by contract:** IMPLEMENTATION STATUS = IMPLEMENTED; TEST STATUS = TESTED; RUNTIME STATUS = NOT VERIFIED; PRODUCTION STATUS = migration/constraint state OBSERVED via read-only checks; DOCUMENTATION STATUS = being reconciled; OPEN RISKS = deployed Production RPC behavior and full assessment-family E2E remain unverified; application provenance is unknown; OPEN DECISIONS = explicit owner approval for any Production runtime test; CLOSURE EVIDENCE = CI runs #16/#428, merge commit, read-only migration ledger/constraint query, and Pages deployment records; FINAL STATUS = VERIFIED for repository/disposable PostgreSQL plus bounded read-only Production state, not CLOSED for full production-facing release.


## Post-deployment scoring activation reconciliation — 2026-10-13

This section supersedes earlier statements that value-70 work was limited to persistence or that the current Edge deployment was unverified.

- **Root cause:** current published Comprehensive Clinic final V1 has 36 options with value 70 and Patient Journey final V1 has 21. The live `assessment-access` scoring path bound both final V1 identities to interpretation registry V1, which contains no 70 source/anchor values. Registry V2 contained the Comprehensive Clinic 70 anchor but was not bound to the corrected final V1 product identity; Patient Journey required explicit V2 70 entries as well.
- **Code commit:** [`41037bee21708f661671dbff484f0df031d81fcb`](https://github.com/core-system-md/clinic-evaluator/commit/41037bee21708f661671dbff484f0df031d81fcb). It adds 21 Patient Journey value-70 anchors, binds both corrected final V1 families to interpretation V2, and resolves the selected option using pinned question identity, option index and the stored source value, avoiding dependence on environment-generated option UUIDs. The save path still validates the stored value against the live option row.
- **CI:** [P3 verification run #430](https://github.com/core-system-md/clinic-evaluator/actions/runs/38377217349) **PASS** — P3 isolated kernel, full Node test suite, P4 protected-completion disposable PostgreSQL, and C-02 RPC disposable PostgreSQL.
- **Production deployment:** Supabase Edge Function `assessment-access` is ACTIVE at version **36**, bundle SHA `82a26223caa92516016f17a70afeafc859c06766a53773bc6e895f6026145916`. Its `engine.ts`, `response-scorer.mts`, and interpretation V2 registry were verified read-only after deployment.
- **Cloudflare Pages:** commit `41037bee21708f661671dbff484f0df031d81fcb` deployed successfully as `48aa91c5-3295-47b3-9c97-7dca758cc3d9`: https://48aa91c5.clinicevaluat.pages.dev.
- **Supabase state:** read-only checks show migration `20261013110000 / c02_allow_answer_value_70` listed as applied, the live compatibility constraint allows `0,1,2,3,4,5,40,70,100`, and `public.answers` currently has 0 rows. The migration application actor/time is unknown. No Production RPC was executed and no answer/session data was created or changed during this activation.
- **Status:** IMPLEMENTATION = IMPLEMENTED; TESTS = PASS; EDGE = DEPLOYED v36; PRODUCTION CONSTRAINT = OBSERVED COMPATIBLE; LIVE SCORING E2E = NOT VERIFIED; FINAL = scoring correction deployed, but full Production runtime closure remains open.
- **Next boundary:** any controlled Production E2E requires explicit authorization to create/use a test session and answer data. Do not start C-03 automatically; PR #85 remains outside this work.


## Owner authority clarification and continuation attempt — 2026-10-13

The owner clarified that engineering execution within the approved work contract does not require repeated step-by-step authorization. This supersedes earlier wording in this report that demanded a separate owner approval solely to execute the bounded C-02 runtime verification. The engineering lead is responsible for carrying out that verification, using synthetic/tagged data, limiting the test to the value-70 path, and verifying cleanup. This does not authorize architecture/scope changes, destructive migrations, or unrelated Production mutations; C-03 remains gated on C-02 closure and recorded handoff.

**Continuation evidence:**
- Read-only Supabase metadata confirms assessment-access is ACTIVE at version 36 with deployed bundle SHA 82a26223caa92516016f17a70afeafc859c06766a53773bc6e895f6026145916.
- Read-only published-version query confirms Comprehensive Clinic final V1 has 36 options with option_value=70; Patient Journey final V1 has 21 options with option_value=70.
- Read-only count query returned 0 rows in sessions, answers, scores, assessment_results, leads, and assessment_session_access at the time of this check.
- CI run #430 was rechecked: all four jobs completed successfully, including the P3 isolated kernel, full Node suite, P4 disposable PostgreSQL gate, and C-02 answer-save RPC on disposable PostgreSQL.
- An external POST attempt to the deployed Edge endpoint could not reach the Supabase hostname from the available execution container (EAI_AGAIN DNS resolution failure). This is an execution-environment connectivity failure, not evidence of a Production function failure. No Production session, answer, or access row was created by this attempt.

**Current status remains:** scoring correction implemented, CI verified, Edge v36 deployed, live Production scoring E2E NOT VERIFIED. The next engineering action is to run the bounded runtime test from an execution environment that can reach the deployed endpoint, then verify the resulting score and confirm cleanup. Do not restart the implementation or begin C-03.


## Runtime-runner audit — 2026-10-13 (supersedes generic runner suggestion)

The repository does contain a network-capable GitHub Actions route, but inspection shows the existing manual workflows are **not valid C-02 value-70 closure evidence and must not be dispatched as-is**:

- `.github/workflows/p2-external-e2e.yml` is `workflow_dispatch` only and uses `tests/external-assessment-access.mjs`. That script checks reachability/content/access and saves only the first option; it does not select a value-70 option, call `complete`, inspect the resulting mathematical score, or clean up the synthetic session/answer/access/lead records.
- The same workflow's P3 matrix uses `tests/p3-production-external-e2e.mjs`. The script answers every question with option index 0, expects interpretation version `1`, does not assert the value-70 anchor or 70 score, and contains no cleanup path. Running it would create production test data without satisfying this C-02 gate.
- The current GitHub connector exposes read and workflow-job/log operations but no workflow-dispatch operation. No run was triggered.
- Therefore no claim of live runtime verification is made. The earlier suggestion to simply run a generic external E2E on a network-capable runner is too broad and is superseded by this audit.

**Next bounded engineering action:** implement and validate a dedicated C-02 production E2E harness/workflow that (1) targets a published Comprehensive Clinic or Patient Journey question whose published option value is exactly 70, (2) uses unique tagged synthetic identities and records all created IDs, (3) checks saved answer value, V2 interpretation anchor and component/axis/overall scoring in the persisted result, and (4) runs deterministic cleanup in a `finally` path and verifies the exact tagged test records are gone. Before any production run, inspect the existing API/data model to establish that cleanup is supported and complete; if the public Edge API cannot delete test artifacts safely, use a controlled database cleanup mechanism scoped only to IDs created by the test. Never use the existing generic workflows as a substitute. C-02 remains **NOT CLOSED**; C-03 must not start.


## Dedicated live E2E harness — PR #87 (2026-10-13)

- PR: https://github.com/core-system-md/clinic-evaluator/pull/87 (merged to main as `550e90b1c7375309bb565ec1fab0eb7eec035ef9`).
- Added `.github/scripts/c02-value70-live-e2e.mjs`, stored under the hidden `.github/scripts` path rather than the Pages-visible `tests/` directory to avoid exposing an operational runner through the Pages root output. It is a C-02-only live runner for published `comprehensive-clinic-assessment`. It reads the public published question graph, joins its question codes to exact DB question IDs, and resolves the stored value-70 option for each published question.
- Interpretation verification intentionally uses registry V2 independently of the published product version: the published assessment remains product V1 while its scoring semantics are bound to interpretation V2. The runner compares persisted response lineage against the V2 registry's `semanticStateKey`, source value 70, anchor score 70, and eligibility.
- The runner verifies saved answer values, completion provenance V2, persisted `P3_STRUCTURED_RESULT_V1`, component/layer and axis score evidence, and numeric overall score.
- Cleanup runs from `finally`, deletes access rows by SHA-256 hashes of this run's own issued tokens, and removes only the tagged synthetic lead/session/result/score/answer rows. It then verifies zero remaining rows for those run-specific identifiers; cleanup failure fails the run.
- Workflow `.github/workflows/c02-value70-live-e2e.yml` is `workflow_dispatch` only, requires confirmation string `RUN-C02-VALUE70`, uses the `production-e2e` environment and `SUPABASE_SERVICE_ROLE_KEY`, and does not trigger on push or pull request. No production run has been dispatched.
- CI run #431 passed all four jobs at the earlier PR snapshot: P3 isolated kernel, full Node suite, P4 disposable PostgreSQL, and C-02 answer-save RPC on disposable PostgreSQL. The final runner revision resolves product V1 through interpretation registry V2 and verifies persisted response lineage against that registry. CI run #440 passed all four jobs on source head `29b13cf206095a83b83702bf6eecd8f4942e7688`: P3 isolated kernel, full Node suite (including the live-runner source contract and syntax check), P4 disposable PostgreSQL, and C-02 answer-save RPC disposable PostgreSQL. Run: https://github.com/core-system-md/clinic-evaluator/actions/runs/38382703154. These checks do not constitute live Production E2E evidence.
- **Production runtime remains NOT VERIFIED; C-02 remains NOT CLOSED.** No production test session/answer was created by this PR. Do not begin C-03.

# Current Handoff Index — 2026-10-12

> **Latest reconciliation: 2026-10-13.** This file name is retained as the canonical existing handoff index; the latest state is recorded in the C-02 section below and supersedes older contradictory C-02 status text.

**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Cloudflare Pages:** `clinicevaluat`  
**Production branch:** `main`

Use this index as the current work handoff. The 2026-10-10 Production Structured Result handoff remains historical context, not the current queue. For C-02, the dated post-merge reconciliation below supersedes any older C-02 branch-only/open-PR status in this file.

## Verified current state

- **D-09:** PR #81 merged with commit `6b9de8affde4737e4d15f069bcbe9dee3c0d7e33`. Cloudflare Pages deployment `df10f1e1-01ca-4c61-8d51-d84597c50e8f` completed successfully. Post-deployment checks: `/assets/data/comprehensive_assesstment.json` returned `Not Found`; `/assets/data/report_texts.json` remains available at version `2.2.0`. The three legacy assessment assets and tested internal registry paths passed on preview. Additional Production probes were rate-limited, so those paths are not claimed as independently re-verified on Production. D-09 follow-up documentation is in PR #82 and is not yet in `main`.
- **D-13:** PR #80 merged to `main` as `4d6d9bb11f06732e1563f2829ed78930a4411121`. Cloudflare Pages Production deployment `b192ada8-48d1-496a-b760-d2b7e69b264b` completed successfully for that commit at `2026-10-12T11:38:25Z` ([deployment](https://b192ada8.clinicevaluat.pages.dev)). This was a documentation-only commit; no new D-09 asset smoke tests were run because no application code changed. The historical deletion record preserves the reported counts and does not claim a new live-database verification of them.
- **PR #82:** documentation-only D-09 production verification update, open and unmerged. It does not change production resources.
- **PR #79:** C-01 interpretation identity repair, open, Draft, unmerged; head `7114737af8d11ae1b2a3b7f6f100765320c3169b`.
- **CI for PR #81:** run [38223253283](https://github.com/core-system-md/clinic-evaluator/actions/runs/38223253283) passed P3 isolated kernel, full Node test suite, and P4 disposable PostgreSQL.
- Cloudflare Pages project configuration was read-only checked as production branch `main`, root directory `/`, destination directory `/`, `path_includes=["*"]`, and `path_excludes=[]`.

## D-14 — read-only migration impact inventory

The Supabase migration ledger confirms these three migrations are applied in Production:
- `20261009164918_canonical_axis_weights`
- `20261009164951_structured_result_authority`
- `20261009170228_reconstruct_final_assessment_versions`

Historical pre-scoring-fix read-only checks found current published V1 content counts and 0–100 axis weight totals consistent with the reconstruction contract. The two `*_from_result` RPCs exist and are service-role-only. `assessment-access` has since been deployed as version 36 with the value-70 scoring correction. At the last read-only count, leads, sessions, answers, scores, assessment_results, assessment_session_access, and historical_snapshots were all zero.

Historical pre-merge C-02 defect: `answers_answer_value_compat_check` excluded 70 while the reconstructed assessments contained 57 options valued 70. The forward-only repair is merged. A separate scoring-path defect was then found and corrected: final published V1 assessments were still bound to interpretation registry V1, which has no 70 anchors. The current Edge version 36 now uses explicit 70 anchors for the corrected final V1 mappings. Production end-to-end scoring on a real session remains unverified.

D-14 report path: `documentation/governance/D-14-PRODUCTION-MIGRATION-IMPACT-INVENTORY-2026-10-12.md` on branch `d14-production-migration-impact-inventory-2026-10-12`. The report and updated handoff are branch-only until reviewed/merged.

## Owner decisions and safety boundaries

1. Historical-record deletion was decided and executed before D-13; preserve the reported counts and historical autovacuum timestamp. Do not repeat deletion or restoration.
2. The three Production migrations listed under D-14 were not owner-approved. Their effects are inventoried; no rollback, restore, migration-history rewrite, or Production repair has been performed.
3. EV Simulator must be repaired, not hidden.
4. Internal repository assets must not be exposed through Pages. Client-required assets such as `assets/data/report_texts.json` must remain available.
5. The owner explicitly approved merge/publication of PR #81 and separately authorized the documentation-only merge of PR #80. This does not authorize merging PR #79 or PR #82, executing D-14/C-02 against Production, or any unrelated production change.

## Exact next work

### D-14 — inventory/design result
Read-only inventory is complete for the three specified migrations and relevant live contracts. The documented C-02 constraint repair is a design only. No production mutation was performed. This work package should close only after the D-14 documentation PR is reviewed and merged; do not infer that branch-only documentation is already on `main`.

### C-02 — value-70 persistence and mathematical scoring path implemented; Edge v36 deployed

**Repository implementation commit:** [`41037bee`](https://github.com/core-system-md/clinic-evaluator/commit/41037bee21708f661671dbff484f0df031d81fcb)  
**Production Edge deployment:** `assessment-access` version **36**, ACTIVE; deployment bundle SHA `82a26223caa92516016f17a70afeafc859c06766a53773bc6e895f6026145916`.

- PR #86 remains the merged persistence-constraint repair: [PR #86](https://github.com/core-system-md/clinic-evaluator/pull/86), merge commit `dfaa79ce54cc4a385b5b0975e2e61d91f310c9cb`.
- The current read-only Supabase migration ledger lists `20261013110000 / c02_allow_answer_value_70` as applied. The actor/time of application is unknown; this continuation did not apply a migration or modify Production data/schema.
- The live constraint permits `0,1,2,3,4,5,40,70,100`; the `public.answers` table currently has 0 rows.
- Production data contains 36 options with value 70 in the Comprehensive Clinic final V1 and 21 in Patient Journey final V1.
- Root cause: the active scoring path bound both corrected final V1 assessments to interpretation registry V1, which has no source/anchor value 70. The Comprehensive Clinic interpretation V2 already had 70 anchors but was not bound to the final published V1 identity. Patient Journey's corrected final V1 also needed explicit 70 anchors. Registry option UUIDs were not stable across environments.
- The fix adds 21 explicit Patient Journey V2 interpretation entries for value 70, binds both corrected final V1 families to interpretation registry V2, and resolves runtime options by the pinned question + option index + stored option value rather than requiring environment-specific UUID equality. The stored answer is still validated against the live option record before scoring.
- Regression tests prove 70 resolves to numeric anchor 70, contributes to the component/layer aggregation, and produces 70 at the axis and overall level in a controlled integrated fixture.
- P3 kernel verification run [#430](https://github.com/core-system-md/clinic-evaluator/actions/runs/38377217349): **PASS** — P3 isolated kernel, full Node suite, P4 disposable PostgreSQL protected-completion gate, and C-02 disposable RPC E2E.
- Cloudflare Pages Production deployment for scoring commit `41037bee21708f661671dbff484f0df031d81fcb` succeeded as deployment `48aa91c5-3295-47b3-9c97-7dca758cc3d9`: https://48aa91c5.clinicevaluat.pages.dev.
- **Runtime boundary:** Edge version 36 is deployed, but no real Production assessment session/RPC was executed as part of this verification. End-to-end mathematical behavior on a live session remains **NOT VERIFIED**. No Production answer/session data was created or modified.
- **Contract status:** IMPLEMENTATION STATUS = IMPLEMENTED; TEST STATUS = PASS; EDGE DEPLOYMENT STATUS = DEPLOYED (v36); RUNTIME E2E STATUS = NOT VERIFIED; PRODUCTION CONSTRAINT STATUS = OBSERVED COMPATIBLE; DOCUMENTATION STATUS = UPDATED; OPEN RISKS = live-session scoring E2E and migration-application provenance; FINAL STATUS = scoring fix deployed and repository/isolated tests verified, but full Production E2E closure is still open.
- PR #85 remains a separate item and was not reviewed or merged by this task.
- **Boundary:** do not start C-03 automatically. The next required evidence is an owner-authorized, controlled Production scoring E2E; no session/answer test data may be created without that authorization.

### Remaining sequence
- C-03: explicit interpretation-binding and complete option-identity coverage gate.
- D-06: repair EV Simulator calculation inputs/defaults and publish a new version rather than editing a published version.
- D-04/D-12: make Structured Result authoritative and remove dead code.
- D-05: live baseline schema and retired Edge Function documentation.
- D-08/D-15/D-17: authorization and identity discovery.
- D-07: legacy functions/schema review before removal.
- D-18: result accuracy.
- D-16: naming.
- D-19: document the leaked-password decision only; no security change without a new decision.

## Mandatory operating contract

- One bounded work package at a time: inspect → implement only its scope → dedicated tests → update docs/Handoff → report evidence and status → stop.
- Each package has a maximum budget of three hours; stop and report if exceeded. Do not invent time accounting.
- Do not automatically advance to the next package.
- Mark absent runtime evidence **NOT VERIFIED**, not PASS.
- No Production writes, migrations, Edge deployment, shared Cloudflare setting change, or Pages publication without explicit owner approval.
- Do not repeat previously verified work unless new evidence shows a regression.


## C-02 continuation — owner authority clarification and exact next action (2026-10-13)

The owner clarified that routine engineering execution within the approved contract does not require separate approval for each step. For this bounded C-02 verification, earlier wording requiring separate authorization just to create/use synthetic runtime-test data is superseded. The engineering lead must perform the test with clearly tagged synthetic data, verify the 70 value through save → completion → persisted Structured Result, and verify cleanup. This is not permission for architectural changes, destructive migrations, or unrelated Production mutations.

Current recheck: assessment-access is ACTIVE at version 36 (bundle SHA 82a26223caa92516016f17a70afeafc859c06766a53773bc6e895f6026145916). The current published Comprehensive Clinic final V1 has 36 options valued 70; Patient Journey final V1 has 21. Read-only counts for sessions, answers, scores, assessment_results, leads, and assessment_session_access are all zero. CI run #430 was rechecked and all four jobs passed.

A direct external POST attempt failed before reaching Supabase because the current execution container could not resolve the project hostname (EAI_AGAIN). No Production writes occurred. This does not prove the deployed function is failing; it means the live endpoint could not be exercised from this environment. C-02 remains NOT CLOSED until the bounded live runtime test is run from a network-capable execution environment and its output plus cleanup are verified. Do not begin C-03 automatically.


## Runtime-runner audit — 2026-10-13 (supersedes generic runner suggestion)

The repository does contain a network-capable GitHub Actions route, but inspection shows the existing manual workflows are **not valid C-02 value-70 closure evidence and must not be dispatched as-is**:

- `.github/workflows/p2-external-e2e.yml` is `workflow_dispatch` only and uses `tests/external-assessment-access.mjs`. That script checks reachability/content/access and saves only the first option; it does not select a value-70 option, call `complete`, inspect the resulting mathematical score, or clean up the synthetic session/answer/access/lead records.
- The same workflow's P3 matrix uses `tests/p3-production-external-e2e.mjs`. The script answers every question with option index 0, expects interpretation version `1`, does not assert the value-70 anchor or 70 score, and contains no cleanup path. Running it would create production test data without satisfying this C-02 gate.
- The current GitHub connector exposes read and workflow-job/log operations but no workflow-dispatch operation. No run was triggered.
- Therefore no claim of live runtime verification is made. The earlier suggestion to simply run a generic external E2E on a network-capable runner is too broad and is superseded by this audit.

**Next bounded engineering action:** implement and validate a dedicated C-02 production E2E harness/workflow that (1) targets a published Comprehensive Clinic or Patient Journey question whose published option value is exactly 70, (2) uses unique tagged synthetic identities and records all created IDs, (3) checks saved answer value, V2 interpretation anchor and component/axis/overall scoring in the persisted result, and (4) runs deterministic cleanup in a `finally` path and verifies the exact tagged test records are gone. Before any production run, inspect the existing API/data model to establish that cleanup is supported and complete; if the public Edge API cannot delete test artifacts safely, use a controlled database cleanup mechanism scoped only to IDs created by the test. Never use the existing generic workflows as a substitute. C-02 remains **NOT CLOSED**; C-03 must not start.


## Dedicated live E2E harness — PR #87 (2026-10-13)

- PR: https://github.com/core-system-md/clinic-evaluator/pull/87 (Draft; not merged).
- Added `tests/c02-value70-live-e2e.mjs`, a C-02-only live runner for published `comprehensive-clinic-assessment`. It reads the public published question graph, joins its question codes to exact DB question IDs, and resolves the stored value-70 option for each published question.
- Interpretation verification intentionally uses registry V2 independently of the published product version: the published assessment remains product V1 while its scoring semantics are bound to interpretation V2. The runner compares persisted response lineage against the V2 registry's `semanticStateKey`, source value 70, anchor score 70, and eligibility.
- The runner verifies saved answer values, completion provenance V2, persisted `P3_STRUCTURED_RESULT_V1`, component/layer and axis score evidence, and numeric overall score.
- Cleanup runs from `finally`, deletes access rows by SHA-256 hashes of this run's own issued tokens, and removes only the tagged synthetic lead/session/result/score/answer rows. It then verifies zero remaining rows for those run-specific identifiers; cleanup failure fails the run.
- Workflow `.github/workflows/c02-value70-live-e2e.yml` is `workflow_dispatch` only, requires confirmation string `RUN-C02-VALUE70`, uses the `production-e2e` environment and `SUPABASE_SERVICE_ROLE_KEY`, and does not trigger on push or pull request. No production run has been dispatched.
- CI run #431 passed all four jobs at the earlier PR snapshot: P3 isolated kernel, full Node suite, P4 disposable PostgreSQL, and C-02 answer-save RPC on disposable PostgreSQL. Subsequent runner revisions correct persisted-lineage verification to use registry V2; their CI run is pending at this documentation snapshot and must be checked against the latest PR head before approval.
- **Production runtime remains NOT VERIFIED; C-02 remains NOT CLOSED.** No production test session/answer was created by this PR. Do not begin C-03.

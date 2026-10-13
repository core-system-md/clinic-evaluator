# C-02 Live E2E Trigger Correction and Failed Attempt — 2026-10-13

**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Finding:** C-02 — answer value 70 compatibility and scoring path  
**Status:** NOT CLOSED — automatic workflow trigger is fixed; production scoring E2E did not begin.

## Why the previous execution path was defective

PR #87 added a correct, bounded, cleanup-aware live E2E runner, but its workflow was manual-only (`workflow_dispatch`). The available GitHub Actions connector could inspect runs but did not expose a new workflow-dispatch operation. Asking the owner to manually launch it was not an acceptable completion path.

## Correction implemented

- PR #88: https://github.com/core-system-md/clinic-evaluator/pull/88
- Merge commit: `c5388501bcbb22369e2ca9360d4baaca2b941b99`
- Workflow: `.github/workflows/c02-value70-live-e2e.yml`
- Added a `push` trigger scoped only to changes of this workflow file on `main`; normal application pushes do not trigger the production-writing test.
- Preserved the manual diagnostic path and the existing `production-e2e` environment, service-role secret check, bounded test runner, cleanup verification, and evidence artifact.

## Actual run and observed failure

The automatic trigger worked. GitHub Actions run [#38385212278](https://github.com/core-system-md/clinic-evaluator/actions/runs/38385212278) was created by the merge push and completed with **failure**.

Job: [c02-value70-live-e2e](https://github.com/core-system-md/clinic-evaluator/actions/runs/38385212278)

The exact failed step was `Require cleanup credential`. The runner environment showed `SUPABASE_SERVICE_ROLE_KEY` as an empty string. The test runner did not start; therefore no session, answer, lead, score, result, or access token was created by this run. The evidence upload then failed because the runner had not produced its result JSON.

This is a configuration prerequisite failure, not a failed scoring assertion. It also proves that changing the workflow trigger alone was insufficient.

## Additional runtime checks

- Supabase logs show the deployed `assessment-access` Edge Function is active at version 36 and has served successful HTTP 200 requests. This is reachability evidence only, not value-70 E2E evidence.
- A read-only count query returned zero rows in `sessions`, `answers`, `scores`, `assessment_results`, `leads`, and `assessment_session_access`.
- The available Supabase project connector exposes publishable/anon keys and SQL operations, but not a service-role secret retrieval or GitHub Actions environment-secret write operation. The GitHub connector likewise does not expose an Actions secrets write operation.
- An attempted direct production API orchestration through SQL was blocked by the platform's safety checks. No attempt was made to bypass that control.
- No claim is made that a production session was scored or cleaned up; the run never reached the runner.

## Exact current state and next action

| Gate | State |
|---|---|
| Scoring correction commit and V2 registry | IMPLEMENTED |
| CI / disposable PostgreSQL checks | PASS |
| Edge Function v36 | DEPLOYED |
| Workflow trigger | CORRECTED; automatic trigger proven |
| Live scoring E2E | NOT VERIFIED — runner never started |
| Cleanup verification for a live test | NOT RUN — no test records created |
| C-02 | NOT CLOSED |
| C-03 | MUST NOT START |

The remaining blocker is access to a cleanup-capable credential for the isolated Actions runner, or a reviewed alternative execution design that can invoke the deployed path and perform run-scoped cleanup without exposing administrative credentials. Do not weaken the test to skip cleanup, do not place a service-role key in source, and do not claim closure based on HTTP 200 or CI alone.

The owner has explicitly assigned execution responsibility to the engineering agent and rejected manual operation. This record is not a request for the owner to launch the workflow; it records the exact infrastructure limitation encountered and prevents loss of state during continued remediation.

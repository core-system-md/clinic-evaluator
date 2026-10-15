# C-03 AUTHORIZATION REQUIREMENT CORRECTION — OWNER DIRECTIVE — 2026-10-15

**Authoritative correction:** `C03_OWNER_JWT` is not required by the current GitHub Actions OIDC CI release path. In `supabase/functions/assessment-config-release/index.ts`, `ci_*` actions validate the signed GitHub OIDC workload token and bind it to the deployed runtime SHA; `requireOwner` applies only to non-CI human/admin actions. Previous statements below that the OIDC production release is blocked by an empty owner JWT are superseded and must not trigger JWT setup requests or credential-preflight loops.

- The OIDC migration/RPC work replaces owner-JWT authentication in CI; it was not added to force the owner to provide a JWT.
- Existing owner/admin authorization remains on human-facing API actions; do not weaken those unrelated product authorization checks.
- The guarded release still enforces the allowlisted GitHub workload identity, exact repository/ref/workflow/environment/event/SHA/run identity, exact current-main commit, release-state preconditions, automated tests, and post-release read-back/E2E/cleanup evidence. No owner JWT or owner-authentication conversation is required for the CI path.
- Live state remains gate `enabled=false`, zero release rows, zero active release pointers, and five current published families. This correction does not claim release activation or live E2E has completed.
- The available GitHub connector has no workflow-dispatch action. No release workflow was dispatched by this documentation update. Production completion must be claimed only after a real run supplies successful evidence.

---

# C-03 OIDC PRODUCTION RELEASE PREFLIGHT — LIVE STATUS — 2026-10-15

**This section supersedes earlier deferred-rollout statements below.** The owner authorized the OIDC replacement and Production completion.

- PR #113 and PR #114 are merged.
- The new migration `20261015120000_c03_github_oidc_release_authorization` is recorded as applied in Production; the helper, register, activate, and gate CI RPCs exist.
- `assessment-access` is ACTIVE with `verify_jwt=false`; `assessment-config-release` is ACTIVE with `verify_jwt=true`. Read live version numbers from Supabase at release time.
- Both Edge functions embed the same source digest `sha256:0257e577e67f157aabc8b512dc76a6b252229263597156ceef4853b2e496763f`. Read the attested Git SHA from both deployed files after the latest main commit; documentation-only commits require refreshing the attested SHA before release.
- Live read-only state: gate disabled; release rows 0; active release pointers 0; five published families; all five currently lack a release record.
- No release writes, gate activation, live E2E, or cleanup have occurred. **Production closure is still pending.**

## Remaining execution gate
Start **C-03 guarded Production release and bounded E2E** manually from GitHub Actions on `main`, with `confirm_production_release=ENABLE-C03-PRODUCTION` and `preflight_only=false`. The workflow first validates the signed GitHub OIDC identity and then verifies the new migration/RPCs and exact deployed source attestation before any release writes. Do not call privileged RPCs directly or disclose any JWT/secret. Close C-03 only after five-family activation, gate audit read-back, live E2E, exact-run cleanup, and final read-only verification.

---

# OWNER-DIRECTED AUTHORIZATION REDESIGN — 2026-10-15

**This section supersedes the earlier deferred-rollout disposition because the owner has explicitly authorized a reviewed alternative and continuation. It does not claim Production release completion.**

- Implementation is in draft PR #113: https://github.com/core-system-md/clinic-evaluator/pull/113.
- The literal `C03_OWNER_JWT` dependency is being removed from the guarded CI path; human-owner API actions keep their existing identity and admin-capability checks.
- The proposed replacement is GitHub Actions OIDC, validated at the Edge handler against signed issuer/audience plus exact repository, ref, workflow, protected environment subject, dispatch event, full SHA, and run identity. CI writes use separate narrow service-role-only database routines, explicit confirmation, SHA-bound attestation, and audit metadata.
- The new migration `20261015120000_c03_github_oidc_release_authorization.sql` is a proposal on the PR branch only. It has **not** been applied to Production.
- The guarded release workflow has been changed to manual dispatch only. A push must never trigger a Production release.
- **Production remains blocked** pending exact-head CI and review, verification of actual GitHub Environment required-reviewer protection, validation of real OIDC claim shape in a protected test run, merge, new migration application, exact-source Edge deployment/attestation, five-family activation, gate read-back, live E2E, and exact-run cleanup.
- Last confirmed Production state remains gate disabled, release rows zero, active release pointers zero, `assessment-access` ACTIVE v38, and `assessment-config-release` not deployed.

---

# AUTHORITATIVE C-03 DISPOSITION — 2026-10-15

**Status: C-03 PHASE CLOSED; GUARDED PRODUCTION ROLLOUT DEFERRED BY OWNER DIRECTION.**

This decision supersedes older sections in this document that require `C03_OWNER_JWT` setup as the next action for closing C-03.

- The canonical implementation is merged in PR #109, the C-03 migration is applied, and recorded isolated CI plus the disposable PostgreSQL release harness passed.
- Last verified Production state: `assessment_config_release_settings.enabled=false`; release records = 0; active release pointers = 0; five current published families; `assessment-access` ACTIVE v38; `assessment-config-release` not deployed.
- The credential diagnostic proved only that `C03_OWNER_JWT` was empty in the protected job. Its non-empty check does not validate token authenticity, and the diagnostic did not prove that the token is intrinsically necessary to close the merged implementation work.
- The owner has directed closure rather than further secret configuration. Therefore `C03_OWNER_JWT` is no longer a C-03 phase-closure task. No secret should be requested from the owner or pasted into chat.
- No Production Edge deployment, release registration/activation, gate enablement, or live E2E is claimed by this document update. The gate remains disabled and the guarded rollout is deferred.
- If the rollout is explicitly re-scoped later, first reassess the product/API authorization contract and the necessity of owner JWT for the exact operations. Do not assume the prior workflow design is itself a product requirement.

**Final disposition:** `C-03 CLOSED — CODE MERGED / ISOLATED CI PASS / MIGRATION APPLIED / PRODUCTION ROLLOUT DEFERRED / GATE DISABLED`.

---

# C-03 Production Release Preflight — 2026-10-15

**Project:** `oaqpzaarppccbnepffxx`  
**Access:** Read-only Supabase connector checks.  
**Outcome:** The migration is applied; this session performed read-only state checks only and did not deploy Edge functions, write release records, activate the gate, or run live E2E.

## Current Production state

| Check | Observed value |
|---|---|
| Project health | `ACTIVE_HEALTHY` |
| Latest applied migration | `20261015100000` — `c03_hybrid_config_release_gate` |
| C-03 migration | `20261015100000_c03_hybrid_config_release_gate` — applied (live migration ledger verified 2026-10-15) |
| `assessment_config_releases` | present; 0 release rows |
| `assessment_config_release_settings` | present; singleton gate `enabled=false` |
| Current published families | 5 |
| Active published versions | 5 |
| `assessment-access` | ACTIVE, version 38 |
| Deployed `assessment-access` SHA-256 | `fca794e29fd4193348fcada6de9cb2e2165536accef056ca808faa9f5bce1c8b` |
| `assessment-config-release` | not deployed |

The existing authorization routines are present in Production: `require_admin_capability(text)`, `has_admin_capability(text)`, `publish_assessment_version_secure(uuid)`, `restore_public_assessment_secure(uuid)`, and `write_admin_audit(...)`. The inspected SECURITY DEFINER routines have a pinned `search_path=public, pg_temp`.

## Exact current published version IDs

| Family slug | Current published version ID | Version |
|---|---|---:|
| `admin-reception-assessment` | `6395ed4b-de13-4621-8577-4c0596ff0e61` | 1 |
| `clinic-performance` | `61034435-ee97-4086-9341-ce0ddc95b4e6` | 1 |
| `comprehensive-clinic-assessment` | `8a28f8e2-d041-4040-bab4-f98b3a76a02e` | 1 |
| `medical-team-assessment` | `8b7f9a77-6df9-4fe8-90de-f6a789297dc5` | 1 |
| `patient-journey` | `50a1cdba-f7ab-4166-b6e4-a63751e1627a` | 1 |

## Release sequence required

1. Integrate the exact reviewed PRs on `main`; do not merge PR #96 or PR #105.
2. Apply only the reviewed C-03 migration after verifying no unrelated pending migration will be applied.
3. On the exact resulting `main` SHA, run `node .github/scripts/c03-release-attestation.mjs prepare`.
4. Deploy `assessment-access` and `assessment-config-release` from that same prepared checkout.
5. Run `node .github/scripts/c03-release-attestation.mjs verify` in an authorized runner with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `C03_OWNER_JWT`, and `C03_ASSESSMENT_TYPE_ID` supplied as protected secrets/environment values. It performs read-only export/attestation calls to both Edge endpoints and rejects any mismatch.
6. For each of the five IDs above, register the release from the live canonical export, verify it through the owner-authenticated verifier, then activate it against the expected current published version ID.
7. Enable the gate only after all five release records are VERIFIED and active. Run post-activation read-only checks and the separately authorized protected-handler runtime replay. Capture cleanup evidence.
8. Update this preflight and `CURRENT-SESSION-HANDOFF.md` with the exact migration, Edge versions, deployed attestation values, per-version release IDs, and CI/runtime evidence. Only then assess C-03 closure.

## Current blocker

The available Supabase connector does not expose an authenticated HTTP invocation tool for the live Edge endpoints. The repository script is prepared for execution in a protected release runner. The owner JWT must remain a secret and must not be pasted into chat or replaced by privileged SQL that bypasses the owner-authenticated API path.

**C-03 status: ENGINEERING CI PASS / PRODUCTION RELEASE GATES NOT EXECUTED / NOT CLOSED.**

## Added protected release orchestrator (latest PR #107 head `56e9ad20748dde428af970be6009e1198e36a03e`)

After the C-03 migration is applied and both functions are deployed from the exact prepared commit, use the repository script in an authorized secure shell. Do not paste credentials into chat or commit them:

```bash
node .github/scripts/c03-release-attestation.mjs prepare
node .github/scripts/c03-release-attestation.mjs verify
C03_PRODUCTION_RELEASE_CONFIRMATION=ENABLE-C03-PRODUCTION node .github/scripts/c03-production-release.mjs
```

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `C03_OWNER_JWT` in the secure environment; for the standalone `verify` command, also set `C03_ASSESSMENT_TYPE_ID` to one current published version ID. The production orchestrator repeats the read-only dual-bundle attestation check internally before writing. It fails closed if the release settings table/singleton is absent, the gate is already enabled, the five-family inventory drifts, either deployed bundle's identity mismatches, or any version fails verification. It verifies all five versions before activating any of them.

This script does **not** apply the migration or deploy functions. Those remain explicit preceding release steps and must use the exact same prepared `main` SHA. No Production operation was run from this session because the available connector cannot invoke the authenticated live Edge HTTP endpoints required by the script.



## Canonical integration checkpoint (2026-10-15)

- PR #109 merged to `main` as `0e03b8311ebf8a48cde96d2450b01a2d7b19fca2`; exact-head CI for its final candidate passed the C-03 PostgreSQL release-state-machine harness, source-derived authorization checks, runtime digest/attestation and release orchestration tests, protected handler tests, actual Edge handler regression, P3 kernel and WP-02/WP-03/WP-04/WP-05/WP-09.
- Superseded C-03 PRs #96, #101, #102, #103, #104, #106, #107, #108, #110, #111 and #112 are closed without merge. PR #105 was already closed without merge. The alternative #96/#111 migration paths must not be applied.
- This is not Production closure. The latest live inventory remains at migration `20261013110000`, `assessment-access` v38, and no C-03 release table or `assessment-config-release` deployment.
- Production rollout remains pending: apply only the reviewed `20261015100000_c03_hybrid_config_release_gate` migration, prepare attestation on the exact final `main` SHA, deploy both functions from that checkout, verify both deployed identities read-only, register/verify/activate the five current versions, enable/read back the gate, and run bounded live E2E with exact-ID cleanup.
- The available Supabase connector cannot invoke the required owner-authenticated Edge HTTP endpoints. Do not bypass the API path with privileged SQL. The owner JWT and service-role key must remain in a secure release runner.

**Status: CODE MERGED / CI PASS / PRODUCTION GATES OPEN / C-03 NOT CLOSED.**



## Post-schema / pre-Edge release checkpoint — 2026-10-15

- Live migration ledger includes `20261015100000_c03_hybrid_config_release_gate`. Read-only checks confirmed both release tables exist, gate is disabled, release rows are zero, current release pointers are null, and all five current published version pointers remain unchanged.
- The C-03 migration is applied; this is not release closure. `assessment-access` remains ACTIVE v38 and `assessment-config-release` is not yet deployed.
- PR #109 is merged; all superseded C-03 PRs (#96, #101–#104, #106–#108, #110–#112) are closed without merge; #105 was already closed. No repository PRs remain open.
- A guarded GitHub Actions workflow now runs the isolated test suites and actual authorization harness before any deployment, prepares attestation on the exact trigger SHA, waits for both Edge functions to be deployed through the connected Supabase deployment tool from that same source/attestation, verifies identities, registers/verifies/activates all five versions, enables/read-backs the gate, and runs bounded public E2E with exact-ID cleanup. It requires `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a current `C03_OWNER_JWT` secret. Edge deployment uses the connected Supabase deployment tool. Missing credentials fail preflight before deployment.
- The workflow's successful release artifact is the source of truth for exact deployed versions, attestation, five release IDs, gate readback, and cleanup. Do not change `main` after successful deployment because the attestation binds the exact commit SHA.

**Status at this checkpoint: SCHEMA APPLIED / EDGE DEPLOYMENT AND RELEASE ACTIVATION NOT YET VERIFIED.**


## Latest guarded release attempts — credential injection unresolved (2026-10-15)

- Run [#38736488525](https://github.com/core-system-md/clinic-evaluator/actions/runs/38736488525) passed code and disposable database tests, then failed preflight because `SUPABASE_SERVICE_ROLE_KEY` expanded to an empty value. This is evidence of an empty runtime value, not proof that the key is absent from GitHub settings.
- Corrective commit `50b2e9c9b766c3103074f1d58e558294fab01943` changed both C-03 jobs to the documented `production-e2e` environment and triggered [run #38746879746](https://github.com/core-system-md/clinic-evaluator/actions/runs/38746879746). It failed at the same preflight check, so environment selection alone did not fix injection.
- Neither run prepared runtime attestation, deployed an Edge function, registered/activated releases, enabled the gate, or ran live E2E.
- GitHub connector access available to this session cannot inspect secret configuration or enumerate secret names. Next step is to inspect the exact secret name and scope in GitHub Actions settings (repository vs `production-e2e` environment), including any same-name environment entry that may shadow another value. Do not recreate credentials blindly, paste them into chat, use plain Actions variables for privileged keys, or weaken fail-closed checks.
- Live state remains: migration applied; gate disabled; zero release rows; zero active pointers; `assessment-access` v38; `assessment-config-release` undeployed. No PRs remain open.

**Status: RELEASE PREFLIGHT BLOCKED BY EMPTY RUNNER CREDENTIAL / ROOT CAUSE NOT YET VERIFIED / C-03 NOT CLOSED.**


## Latest credential diagnosis — 2026-10-15 (supersedes earlier unresolved-root-cause wording)

Read-only live checks reconfirmed migration `20261015100000_c03_hybrid_config_release_gate` applied, gate disabled, release rows 0, active release pointers 0, five current published families, `assessment-access` ACTIVE v38, and `assessment-config-release` not deployed.

Corrected diagnostic workflow run [#38756301379](https://github.com/core-system-md/clinic-evaluator/actions/runs/38756301379) on commit `17a5105aaf5d5a8e69864fb44958f8961560d1fe`:
- Repository-scope job **SUCCESS**: `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were injected; the service-role authenticated read-only API calls succeeded; the singleton gate was read as disabled and the exact five-family inventory matched.
- Protected `production-e2e` job **FAILURE**: `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were injected, but `C03_OWNER_JWT` was empty; the job stopped before API requests.
- Earlier diagnostic [#38754907434](https://github.com/core-system-md/clinic-evaluator/actions/runs/38754907434) had checked `C03_OWNER_JWT` in both scopes and found it empty in both. The diagnostic was corrected so the repository scope checks only the two repository-level credentials and the owner JWT is checked only in the protected environment job.
- No Production state was changed by either diagnostic run.

**Current directly observed blocker:** runtime injection of `C03_OWNER_JWT` is empty in the protected `production-e2e` job. This credential is required for owner-authenticated read-only attestation and release actions. The repository-scope read-only credential and state checks now pass. Do not substitute the service-role key, impersonate an owner, bypass the Edge API with privileged SQL, or expose the JWT. The precise GitHub setting responsible for the empty environment value remains unverified.

**Current status:** MIGRATION APPLIED / ISOLATED CI PASS / REPOSITORY READ-ONLY PREFLIGHT PASS / PROTECTED ENVIRONMENT OWNER-JWT INJECTION BLOCKED / EDGE RELEASE NOT DEPLOYED / GATE DISABLED / C-03 NOT CLOSED.


## Session-closeout execution reconciliation — 2026-10-15

This addendum supersedes earlier statements in this file that the C-03 migration was absent or that the service-role injection remained the directly observed blocker. Historical snapshots above are retained as historical evidence.

### Live read-only snapshot at closeout
- GitHub main immediately before this documentation closeout: 6e5858fe5779a06de5c98e983060c83b8ddc52bf; commit docs(C-03): reconcile engineering review with merged and live release state.
- Supabase migration ledger contains 53 entries. Latest: 20261015100000 / c03_hybrid_config_release_gate.
- assessment-access: ACTIVE v38, SHA-256 fca794e29fd4193348fcada6de9cb2e2165536accef056ca808faa9f5bce1c8b.
- assessment-config-release: not deployed.
- Release gate enabled=false; release records = 0; active release pointers = 0; current published families = 5.
- Counts: leads=0, sessions=0, assessment_results=0, answers=0, scores=0, assessment_session_access=0.
- All queries in this closeout were read-only. No migration, deployment, release write, gate mutation, live E2E, or cleanup was run.

### Latest guarded release workflow result
Run #38746879746, path .github/workflows/c03-production-release.yml, actual UI name C-03 guarded Production release and bounded E2E:
- node --test tests/c03-config-digest-coverage.test.js tests/c03-release-verifier-contract.test.js tests/c03-runtime-attestation.test.mjs tests/c03-production-release.test.mjs — PASS.
- deno test --no-check --allow-env --allow-net tests/c03-release-verifier-handler.test.ts tests/c03-protected-edge-completion.test.ts tests/c03-edge-handler-regression.test.ts — PASS.
- psql "postgresql://postgres:postgres@127.0.0.1:5432/postgres" -v ON_ERROR_STOP=1 -f tests/c03-hybrid-config-release-harness.sql — PASS.
- Step Validate credentials and Production release preconditions before deployment — FAILURE. Attestation preparation, deployed-bundle wait, release registration/activation, gate enablement/readback and bounded live E2E were SKIPPED. No release artifact indicates a completed production release.

### Latest credential diagnostic
Run #38756301379, actual UI name C-03 Credential Preflight — Read-only:
- Repository-scope job: SUCCESS; SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY injected; read-only API authentication and expected disabled gate/five-family inventory verified.
- production-e2e job: FAILURE at C03_OWNER_JWT injection; the value was empty. SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY were injected in that environment.
- The run stopped before its environment-scope API read. No Production mutation occurred.
- Proven root cause boundary: the owner JWT is unavailable to the protected job. The exact GitHub settings entry causing this is not observable through the connector; a same-name environment secret may override a repository secret, but that mechanism is not yet proven.

### Exact next action / stop boundary
1. Securely configure a valid owner JWT as a non-empty secret in GitHub → Settings → Environments → production-e2e → Environment secrets. Never send its value to chat or expose it in logs.
2. Run C-03 Credential Preflight — Read-only and verify both jobs, especially the protected environment's credential injection and read-only state query.
3. Keep Production release blocked until this diagnostic passes and separate release authorization is present. Do not use the service-role key as a substitute for owner authentication, bypass the Edge API, or perform any Production write as a workaround.

### Time accounting / contract deviation
- The owner stated that C-03 has consumed three days against an intended 7–10 hours of work. Start time and cumulative active execution time are not available as reliable machine evidence; total actual hours vs budget remains UNVERIFIED.
- Process deviation: workflow display name was misstated to the owner; environment-only patches were attempted without root-cause proof; the diagnostic workflow was added before all credential requirements were reconciled. These are recorded as engineering-process errors under the binding truth-first, no-guess, root-cause, bounded-work and anti-spiral contract.
- This is documentation-only closeout. No source/workflow/test/migration changes are intended in this documentation commit.

# C-03 Engineering Review — PR #106 and PR #107

**Date:** 2026-10-15  
**Repository:** `core-system-md/clinic-evaluator`  
**Status:** Review checkpoint only; C-03 is not closed.  
**Safety:** Read-only review of GitHub metadata, source and test files. No Production migration, write, deployment, or live E2E was performed.

## 1. Exact-head and CI verification

| PR | Head SHA | State | CI observed at exact head | Review outcome |
|---|---|---|---|---|
| [#106](https://github.com/core-system-md/clinic-evaluator/pull/106) | `bf57c44a97a90ec389f61e5366434ac5c831a517` | Open, Draft, not merged | Protected Edge handler regression; P3 kernel; WP-02, WP-03, WP-04, WP-05, WP-09 — all SUCCESS | Tests pass, but target-runtime crash replay remains unverified |
| [#107](https://github.com/core-system-md/clinic-evaluator/pull/107) | `abec5e31268bd9d1c6339e95d4a6bd1d5a3d68e9` | Open, Draft, not merged | C-03 hybrid config release gate: release state machine (disposable PostgreSQL), digest contract, owner-authenticated verifier handler — all SUCCESS; P3 kernel; WP-02, WP-04, WP-09 — all SUCCESS | Isolated tests pass; real integration and release gates remain unverified |

Scope exclusions verified from PR metadata: PR #96 remains open/draft/not merged; PR #105 is closed/not merged. Neither was changed, merged, or cherry-picked in this package.

## 2. PR #106 — persisted-result report projection

### What is covered
- The actual protected Edge request dispatcher is tested for a completed retry where persisted Structured Result lacks `provenance.assessmentSlug`.
- The test asserts the user-facing report is projected, family identity is retained, and the stored fixture is not mutated.
- First-completion routing asserts `prepare_assessment_submission` followed by `complete_p4_assessment_from_result`, protected user identity, token hash, frozen fingerprint, and exclusion of calculation-only fields from the persisted result.
- The first-completion test stubs the scoring calculation and uses a fake Supabase client; it is not a live database integration test.

### Remaining gate
The historical Production HTTP 500 has not been replayed against a Production session and no deployed Edge runtime was changed. This is intentionally not attempted without explicit release authorization. The code path is isolated-CI verified only.

## 3. PR #107 — hybrid configuration release gate

### What is covered
- Canonical configuration projection includes assessment, axis, question, option, trap, interpretation and consistency configuration.
- Digest tests cover canonical determinism, selected runtime-field sensitivity, and exclusion of audit timestamps.
- The verifier handler tests owner authentication, canonical export, metadata fail-closed behavior and service-role verification calls.
- A disposable PostgreSQL harness exercises registration, verification, session release pinning, publication, stale-pointer CAS rejection, rollback, drift rejection, and release identity immutability.
- The gate defaults disabled; no Production activation was performed.

### Review limitations / outstanding checks
1. **Existing routine integration is not proven by the harness.** The harness replaces `require_admin_capability`, `publish_assessment_version_secure`, and `restore_public_assessment_secure` with test stubs. It therefore does not establish that the new release functions compose correctly with the repository's real authorization and publication routines. Add an integration test using the actual function definitions in a disposable database, or document and independently verify an equivalent existing integration gate.
2. **Runtime attestation depends on deployment metadata.** `C03_GIT_COMMIT_SHA`, `C03_EDGE_RELEASE_REF`, `C03_FIXTURE_SET_VERSION`, and `C03_MIGRATION_CONTRACT_VERSION` are read from environment configuration. The isolated tests prove fail-closed behavior when values are absent, but do not prove that those values are bound to the actual deployed Edge bundle. The release process must establish this binding before enabling the gate.
3. **Production release gate remains unverified.** Current published assessment versions would need exact inventory, registration and runtime verification before activation; the migration, Edge deployment, metadata configuration and gate activation all require separate explicit release authorization. No such operation occurred here.

## 4. Production and release safety

- No migration was applied to Production.
- No Production database write or cleanup was performed.
- No Edge Function was deployed.
- No live Production E2E was run.
- No PR was merged.
- No claim is made that the new runtime code is active in Production.
- C-03 remains OPEN pending actionable review findings and all required authorized gates.

## 5. Next actions

1. Add or verify a disposable-database integration test that uses the real authorization/publication routine definitions rather than stubs.
2. Establish an auditable deployment contract binding the runtime metadata to the actual Edge bundle and immutable source commit.
3. Continue regression review of PR #106, especially fallback family identity resolution and response behavior for malformed/missing family identity.
4. Re-run exact-head CI after any changes.
5. Update this report and `documentation/handoff/CURRENT-SESSION-HANDOFF.md` after each work package.
6. Keep all Production-targeted actions blocked until the owner explicitly authorizes a release.


## 6. Review comments recorded on the implementation PRs
- PR #106 review comment [5532077039](https://github.com/core-system-md/clinic-evaluator/pull/106#pullrequestreview-5532077039): requests fallback-family identity and fail-closed regression tests. No Production replay was requested or performed.
- PR #107 review comment [5532077420](https://github.com/core-system-md/clinic-evaluator/pull/107#pullrequestreview-5532077420): requests real-routine integration coverage and auditable deployment metadata binding. The gate must remain disabled until its release requirements are met.
- Both are COMMENT reviews, not approvals; neither implementation PR was merged.


## 7. Follow-up test package (2026-10-15)

- PR #106 adds tests for recovery via `assessment_types.family_id` when both persisted slug and family ID are missing, and a fail-closed 409 when the family cannot be resolved. The first test revision failed because it incorrectly expected the report projection to invent the missing persisted family ID; that assertion was corrected to verify approved model selection and preserved null identity. Protected handler run [#38730312717](https://github.com/core-system-md/clinic-evaluator/actions/runs/38730312717) and related WP/P3 runs passed for head `48194a7611b6040271ad874b7ff08aa565d2106b`.
- PR #107 now loads the real repository lifecycle publication/restoration SQL definitions in the disposable PostgreSQL harness rather than replacing those two target routines with stubs. Exact-head release-gate run [#38730407260](https://github.com/core-system-md/clinic-evaluator/actions/runs/38730407260) was still running when this report update was made; its outcome must be checked before claiming success.
- This improves integration evidence but does not constitute a Production release or prove that deployment environment metadata is bound to the running Edge bundle. C-03 remains open.

- The first integration-harness run failed at harness setup because the new helper functions used malformed dollar-quote delimiters; the production migration was not applied to any external database. The harness was corrected to named `$c03$` delimiters in commit `b21b5fb8f393bdf57d75048bb64c7de1b1c426c9`. Verify the new exact-head CI result before proceeding.


## 8. Exact-head CI after follow-up

- PR #106 head `48194a7611b6040271ad874b7ff08aa565d2106b`: all listed runs SUCCESS — protected Edge handler, WP-02, WP-03, WP-04, WP-05, WP-09, P3. Handler run [#38730312717](https://github.com/core-system-md/clinic-evaluator/actions/runs/38730312717).
- PR #107 head `b21b5fb8f393bdf57d75048bb64c7de1b1c426c9`: all listed runs SUCCESS — C-03 release state machine/digest/verifier, WP-02, WP-04, WP-09, P3. Release workflow [#38730540804](https://github.com/core-system-md/clinic-evaluator/actions/runs/38730540804).
- The disposable harness now uses the actual repository lifecycle SQL definitions for publication and restoration. However, it still uses a test implementation of `require_admin_capability` and test fixtures for validation/audit dependencies. Exact integration with the production authorization function remains open.
- **Release blocker:** the environment-based runtime metadata has not been independently proven to identify the deployed Edge bundle. No production migration, data write, Edge deployment, or live E2E was performed. C-03 remains NOT CLOSED.

## 9. Follow-up — authorization integration and runtime attestation (2026-10-15)

### Exact-head implementation and CI

- Latest PR #107 head at this checkpoint: `d42be73122fde63dd3b97854f0769d79bc1a1e20`.
- Full C-03 workflow: [#38731852239](https://github.com/core-system-md/clinic-evaluator/actions/runs/38731852239) — PASS. The PostgreSQL harness extracted the canonical authorization definitions from `20261003170912_p5_admin_architecture.sql`; the log recorded source SHA-256 `000bab15cbc643483166fff0e400ad76ae70531feeebfda526560478e811366f`. It proves unauthorized publish is denied without mutating the draft/current pointer; authorized publish reaches the real lifecycle routine, updates the pointer and audit record, and test state is then stopped/cleared before the C-03 release-state tests.
- The same head passed P3 kernel and WP-02/WP-03/WP-04/WP-05/WP-09. PR #106's protected-handler head remains `48194a7611b6040271ad874b7ff08aa565d2106b`, with its previously verified CI passing.
- Validation and audit functions in the disposable harness remain fixture implementations; only the authorization functions and lifecycle publication/restoration routines are sourced from repository migrations. This limitation is explicit.

### Immutable Edge identity contract

- Added `.github/scripts/c03-release-attestation.mjs`, `supabase/functions/assessment-config-release/release-contract.json`, and a fail-closed `runtime-attestation.ts` placeholder.
- The build script requires the generated attestation commit to equal the checked-out Git HEAD; fixture and migration-contract versions come from the versioned contract file. The Edge source manifest digest is deterministic and excludes the generated attestation module to avoid a self-referential digest.
- Both the scorer and verifier read the same baked-in metadata. The scorer exposes a read-only `c03_runtime_attestation` action; verifier export exposes its own metadata. Script `verify` compares both live endpoints to the expected commit and source digest. Runtime environment variables can no longer impersonate another build.
- Node tests cover deterministic digest, immutable commit format, versioned contract values, fail-closed defaults, and read-only comparison of both endpoints. These tests passed in workflow #38731852239.

### Production reality and stop condition

- Production was inspected read-only: latest migration `20261013110000`; C-03 tables absent; `assessment-access` v38 active; `assessment-config-release` absent; exactly five families have current published versions.
- Current published version IDs: admin-reception-assessment `6395ed4b-de13-4621-8577-4c0596ff0e61`; clinic-performance `61034435-ee97-4086-9341-ce0ddc95b4e6`; comprehensive-clinic-assessment `8a28f8e2-d041-4040-bab4-f98b3a76a02e`; medical-team-assessment `8b7f9a77-6df9-4fe8-90de-f6a789297dc5`; patient-journey `50a1cdba-f7ab-4166-b6e4-a63751e1627a`.
- No Production mutation occurred. The authenticated owner registration/verification/activation workflow has not run. The available Supabase connector supports deploy/read/SQL operations but does not provide an authenticated HTTP invocation tool for the live Edge endpoints; the checked-in `verify` script requires `C03_OWNER_JWT` supplied only through a protected release runner/secret. Do not bypass owner authorization with direct privileged SQL.
- C-03 remains OPEN until both Edge bundles attest the exact deployed commit/source digest, all five current versions are registered/verified/activated, the release gate is enabled only after all preflights pass, and the protected-handler target-runtime replay passes with run-scoped cleanup evidence.


## 10. Final engineering checkpoint — protected production orchestrator (2026-10-15)

- Final PR #107 head: `56e9ad20748dde428af970be6009e1198e36a03e`.
- Final exact-head workflow [#38732936474](https://github.com/core-system-md/clinic-evaluator/actions/runs/38732936474) is green across C-03, P3 kernel, WP-02, WP-03, WP-04, WP-05 and WP-09.
- Added `.github/scripts/c03-production-release.mjs`. It requires exact confirmation `ENABLE-C03-PRODUCTION`, requires the C-03 settings singleton to exist and be disabled, checks that Production has exactly the five reviewed family slugs, validates both deployed Edge attestations before writes, registers all five current published versions, verifies all five before activating any, activates against compare-and-swap version IDs, then enables the gate and verifies persisted state.
- Added mocked orchestration tests proving: missing confirmation causes no network calls; an attestation mismatch causes no writes; a failed version verification prevents all activations and gate enablement; all five must verify before activation.
- Expanded source manifest inputs to include `.mts`, `.mjs`, `.ts`, JSON registries, and other supported function-source inputs. `edgeReleaseRef` is explicitly a SHA-256 source-manifest digest, not a claim about Supabase's internal compiled-byte hash.
- Production state is unchanged. The migration remains unapplied, `assessment-access` remains v38, and `assessment-config-release` remains undeployed. PR #107 is still Draft/unmerged. The session's Supabase connector cannot invoke live Edge HTTP endpoints with the owner JWT; therefore the protected orchestrator was tested with mocks but not executed against Production. C-03 remains OPEN.



## Post-schema / pre-Edge release checkpoint — 2026-10-15

- Live migration ledger includes `20261015100000_c03_hybrid_config_release_gate`. Read-only checks confirmed both release tables exist, gate is disabled, release rows are zero, current release pointers are null, and all five current published version pointers remain unchanged.
- The C-03 migration is applied; this is not release closure. `assessment-access` remains ACTIVE v38 and `assessment-config-release` is not yet deployed.
- PR #109 is merged; all superseded C-03 PRs (#96, #101–#104, #106–#108, #110–#112) are closed without merge; #105 was already closed. No repository PRs remain open.
- A guarded GitHub Actions workflow now runs the isolated test suites and actual authorization harness before any deployment, prepares attestation on the exact trigger SHA, waits for both Edge functions to be deployed through the connected Supabase deployment tool from that same source/attestation, verifies identities, registers/verifies/activates all five versions, enables/read-backs the gate, and runs bounded public E2E with exact-ID cleanup. It requires `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a current `C03_OWNER_JWT` secret. Edge deployment uses the connected Supabase deployment tool. Missing credentials fail preflight before deployment.
- The workflow's successful release artifact is the source of truth for exact deployed versions, attestation, five release IDs, gate readback, and cleanup. Do not change `main` after successful deployment because the attestation binds the exact commit SHA.

**Status at this checkpoint: SCHEMA APPLIED / EDGE DEPLOYMENT AND RELEASE ACTIVATION NOT YET VERIFIED.**


## Latest Production runner result — blocked before any deployment (2026-10-15)

- [Workflow #38736488525](https://github.com/core-system-md/clinic-evaluator/actions/runs/38736488525) passed Node, Deno, protected/public Edge handler and real authorization SQL tests.
- Credential preflight failed because the repository Actions secret `SUPABASE_SERVICE_ROLE_KEY` is absent. No attestation preparation, Edge deployment, release registration, activation, or gate write occurred.
- The live C-03 migration remains applied with the gate disabled, no release rows, no active release pointers, and only the existing `assessment-access` v38 deployed.
- The required secret must be added in GitHub repository Actions settings; the owner JWT must also be present and current. Do not place either value in chat.
- No PRs remain open. The guarded workflow's manual input is `ENABLE-C03-PRODUCTION`; it waits for both Edge bundles to match the exact current `main` SHA before proceeding.

**Status: CODE AND TEST GATES PASS / PRODUCTION RELEASE BLOCKED BY SECRET CONFIGURATION.**

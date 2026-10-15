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

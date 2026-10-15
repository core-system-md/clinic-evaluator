# C-03 GitHub OIDC Release Authorization — Design and Security Review

**Status:** DESIGN REVIEW PASSED FOR IMPLEMENTATION IN AN ISOLATED BRANCH; NOT DEPLOYED; NOT MERGED.
**Owner decision:** Replace the manual owner JWT dependency in the guarded release workflow with a reviewed alternative authorization design, then continue the authorized Production rollout.
**Scope:** C-03 release automation only. Existing human-owner API authorization remains unchanged.

## 1. Problem statement

The current release workflow requires `C03_OWNER_JWT` for read-only runtime attestation and for the release actions. The handler validates a real Supabase user and `is_owner()`; database functions additionally enforce `require_admin_capability(...)`. The literal secret name is an implementation detail, but the existing human-owner identity checks are real controls. Removing them or sending the Supabase service-role key as a bearer token to the owner endpoint is not acceptable.

The protected workflow already has a separate, explicit production confirmation, a protected `production-e2e` GitHub Environment, a service-role secret for bounded privileged operations, exact-main-SHA checks, immutable Edge source attestation, five-family inventory checks, verify-before-activate sequencing, gate read-back, and run-scoped E2E cleanup. The alternative should authenticate the *workload* that runs this one guarded release, not impersonate a human owner.

## 2. Proposed authorization architecture

Use GitHub Actions OpenID Connect (OIDC) as a short-lived workload identity for the guarded C-03 release:

1. The release job declares only the `id-token: write` permission required to request an OIDC token; other workflow permissions remain read-only.
2. The job obtains a fresh GitHub-issued OIDC JWT with the dedicated audience `clinic-evaluator-c03-release`. No long-lived owner JWT is stored in GitHub.
3. The C-03 Edge release handler verifies the JWT signature against GitHub's published JWKS and validates issuer, audience, expiration/not-before, repository, immutable repository owner identity where available, `ref=refs/heads/main`, exact workflow identity, `event_name=workflow_dispatch`, expected protected environment, full commit SHA, and non-empty run ID/attempt. The endpoint rejects missing, malformed, expired, wrong-repository, wrong-ref, wrong-workflow, wrong-audience, and replay-context tokens. It must not accept a caller-provided unsigned JSON claim set.
4. The workflow's exact confirmation `ENABLE-C03-PRODUCTION` remains mandatory. GitHub environment protection remains in force. The OIDC token proves which protected workload is calling; it does not itself replace the production confirmation or release preflights.
5. Human-owner actions remain on the existing user-token path with `auth.getUser`, `is_owner()`, and existing admin-capability checks. The new CI path is a separate, explicitly named action set and is never selected merely because a request lacks an owner token.
6. CI-only database routines are narrowly scoped to C-03 release registration, activation of an already-published version after successful attestation, and gate enablement only after every currently published family has a matching verified release. They require the PostgREST `service_role` claim and must not be executable by `anon` or `authenticated`. They must preserve manifest validation, immutability, compare-and-swap against current published IDs, and all-five-family preconditions. Verification continues to use the existing service-role-only attestation RPC.
7. CI actions are accepted only after Edge OIDC verification. The service-role key remains server-side in the Edge runtime/runner and is never returned to the client or used as the HTTP bearer token for the owner API. The workflow's preflight use of the service-role key remains limited to read-only inventory checks.
8. Runtime source attestation must be checked before any release write. All five releases must be registered and verified before any activation; gate enablement is last. If a precondition or verification fails, no gate enablement occurs. Existing release records are not deleted on failure; recovery is by idempotent retry and explicit reconciliation.

## 3. Why this is preferable to deleting the check

- No human JWT has to be copied, rotated, or kept alive in a repository secret.
- The identity is short-lived and cryptographically signed by GitHub; authorization is bound to the exact repository/workflow/ref/environment context.
- The public owner API and its established authorization boundary are not weakened.
- CI-specific privileged behavior is explicit and testable rather than hidden behind a fake owner identity.
- The workflow still has a separate production confirmation and retains immutable runtime attestation and staged release gates.

## 4. Security risks and mitigations

| Risk | Required mitigation |
|---|---|
| Token from another repository/workflow is accepted | Exact issuer, audience, repository, ref, workflow and protected environment claims; negative tests for each claim |
| OIDC JWT is accepted without signature verification | Verify JWT signature using GitHub JWKS; cache keys safely and handle key rotation; fail closed on network/key errors |
| Workflow runs on an untrusted branch or pull request | Require exact `refs/heads/main`, the designated workflow identity, `workflow_dispatch`, and the protected `production-e2e` environment |
| Service-role capability becomes a generic release bypass | Separate CI RPCs, service-role-only grants, narrowly defined C-03 operations, no arbitrary SQL/action dispatch, and exact inventory/attestation/state checks |
| Wrong Edge bundle receives release writes | Compare immutable source-manifest digest and full commit SHA from both deployed Edge endpoints before any write |
| Partial activation leaves the gate enabled | Verify all five first; enable gate last; final state read-back; bounded E2E and exact-run cleanup evidence |
| OIDC token replay | Very short token lifetime, exact workflow/run/ref claims, HTTPS-only invocation, no token logging; use a run-scoped nonce/one-time DB record if supported without introducing a race or unbounded state |
| Accidental release triggered by ordinary push | Production job must run only for explicit manual dispatch with exact confirmation; remove the push-message trigger from the release job |
| Workflow has more permissions than necessary | `contents: read` plus `id-token: write` only; no write token unless a separately reviewed step needs it |

## 5. Required implementation and verification

### Source and workflow
- Add a small OIDC verification module with pinned dependency/version and explicit claim schema.
- Add explicit `ci_*` actions to the C-03 Edge handler, keeping owner actions unchanged.
- Add narrowly scoped CI database functions in a **new migration**; do not edit the already-applied migration.
- Update the release orchestrator and attestation script to request/use the OIDC token only inside the protected GitHub runner.
- Remove `C03_OWNER_JWT` from C-03 release/preflight requirements only after the new path is implemented and all tests prove the old owner path still requires a real owner.
- Restrict the production release trigger to `workflow_dispatch` with exact confirmation; a code push alone must never initiate a Production release.
- Do not deploy until all required checks pass on the exact immutable commit and the migration diff has been reviewed against the live schema.

### Mandatory tests
- Positive verification for a correctly signed token with the exact approved claims.
- Negative verification for invalid signature, unknown key, wrong issuer/audience/repository/ref/workflow/environment/event/SHA, expired token, missing claims, and malformed token.
- Prove missing/invalid OIDC causes zero release RPC calls and zero database writes.
- Prove owner-facing actions still reject missing/invalid owner JWT and non-owners.
- Prove CI RPCs reject `anon` and `authenticated`, reject malformed manifests, reject stale published pointers, reject incomplete/mismatched runtime attestations, and cannot enable the gate unless all five currently published families have matching verified active releases.
- Prove failure of any one verification prevents all activations and gate enablement.
- Run the actual migration and canonical authorization functions in disposable PostgreSQL; no stub for the functions under review.
- Exact-head CI, read-only live preflight, deploy exact attested Edge source, read-only deployed attestation, guarded five-release rollout, gate read-back, bounded live E2E, and exact-run cleanup.

## 6. Design review

**Review outcome: APPROVED TO IMPLEMENT IN A NON-PRODUCTION BRANCH, WITH CONDITIONS.**

- **Authentication model:** GitHub OIDC is a workload identity, not a replacement human identity. This directly addresses the manual owner JWT dependency without pretending CI is the owner.
- **Authorization model:** Separate CI actions and narrow service-role-only RPCs preserve the human-owner endpoint's authorization checks. The implementation must not add a blanket `service_role` bypass to existing owner RPCs.
- **Least privilege:** `id-token: write` is scoped to the release job. The release job must not trigger on ordinary pushes.
- **Integrity:** Exact commit and source-manifest attestation remain mandatory before writes.
- **Failure safety:** Fail-closed behavior, all-five verification before activation, gate-last ordering, and post-run cleanup remain exit criteria.
- **Residual concern:** GitHub OIDC claims and environment protection must be verified against a real token in CI without logging it. If the available token does not include a reliably enforceable environment/workflow claim, stop and revise the design rather than weakening validation.

## 7. Non-goals and boundaries

- Do not disable or bypass `require_admin_capability` for authenticated human calls.
- Do not change product scoring/configuration behavior.
- Do not change published assessment versions or migrate assessment data.
- Do not edit the applied C-03 migration; use a new migration with a safe, reviewed upgrade path.
- Do not merge, deploy, register releases, activate pointers, enable the gate, or run live E2E until implementation, tests, and exact-head review pass.
- This design document does not claim any Production release has occurred.

## 8. Acceptance / closure criteria

C-03 can be declared Production-closed only when the exact deployed Edge source is attested; all five currently published families have verified and active release records; the gate is read back as enabled; bounded live E2E passes for both established public V1 families; cleanup for the exact run is verified; and repository handoff/governance documents contain the actual evidence and identifiers.

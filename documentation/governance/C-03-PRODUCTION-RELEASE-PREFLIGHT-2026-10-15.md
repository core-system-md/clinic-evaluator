# C-03 Production Release Preflight — 2026-10-15

**Project:** `oaqpzaarppccbnepffxx`  
**Access:** Read-only Supabase connector checks.  
**Outcome:** Preflight inventory captured; no migration, write, deployment, release activation, or live E2E performed.

## Current Production state

| Check | Observed value |
|---|---|
| Project health | `ACTIVE_HEALTHY` |
| Latest applied migration | `20261013110000` — `c02_allow_answer_value_70` |
| C-03 migration | `20261015100000_c03_hybrid_config_release_gate` — not applied |
| `assessment_config_releases` | absent |
| `assessment_config_release_settings` | absent |
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

The available Supabase connector does not expose an authenticated HTTP invocation tool for the live Edge endpoints. The repository script is prepared for execution in a protected release runner, but its owner JWT must remain a secret and must not be pasted into chat or replaced by privileged SQL that bypasses the owner-authenticated API path.

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


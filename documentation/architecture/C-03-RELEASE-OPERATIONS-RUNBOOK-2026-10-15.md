# C-03 Release Operations Runbook — 2026-10-15

## Purpose and safety boundary

This runbook describes the controlled release path for the hybrid Git/Supabase assessment configuration model. It does not apply migrations, create releases, deploy Edge code, change the current published version, or enable the strict gate by itself.

**Production activation requires an explicit owner-authorized release window.** First run the migration and all tests in an isolated database. Do not merge/deploy this draft or execute Production writes merely because CI passes.

## Runtime binding matrix

Use the family slug from `assessment_families.slug` and the interpretation registry/version fixed in `supabase/functions/assessment-access/engine.ts`:

| Family slug | Interpretation version | Registry file |
|---|---:|---|
| `admin-reception-assessment` | 1 | `response-interpretation-registry-v1.json` |
| `clinic-performance` | 1 | `response-interpretation-registry-v1.json` |
| `comprehensive-clinic-assessment` | 2 | `response-interpretation-registry-v2.json` |
| `medical-team-assessment` | 1 | `response-interpretation-registry-v1.json` |
| `patient-journey` | 2 | `patient-journey-interpretation-registry-v2.json` |

The current five published product versions are version 1; their interpretation version is not necessarily 1.

## 1. Read-only snapshot export

After the migration exists in the target database, export one assessment version at a time. The SQL script only reads rows and invokes the digest function.

```bash
psql "$DATABASE_URL" -X -qAt \
  -v assessment_type_id="<assessment-type-uuid>" \
  -v interpretation_version=1 \
  -f .github/scripts/c03-export-assessment-release-snapshot.sql \
  > /tmp/c03-release-snapshot.json
```

Use `interpretation_version=2` for Comprehensive Clinic and Patient Journey according to the binding matrix. Check that the file is valid JSON and contains:
- the exact assessment version and family identity;
- the database-computed `configDigest` from `assessment_configuration_digest()`;
- the full question/option identity snapshot;
- `releaseHistoryCount` and the explicit `bootstrapPublished` marker.

The SQL output is a point-in-time export. Do not edit its digest manually. If configuration changes after export, registration must reject the stale digest.

## 2. Generate the release RPC payload

Use the registry matching the family in the matrix, and the exact lowercase Git commit SHA whose Edge code will be deployed:

```bash
node .github/scripts/c03-generate-release-payload.cjs \
  --snapshot /tmp/c03-release-snapshot.json \
  --registry supabase/functions/assessment-access/response-interpretation-registry-v1.json \
  --source-commit-sha "<40-character-edge-source-commit-sha>" \
  > /tmp/c03-release-rpc-args.json
```

For Comprehensive Clinic, use `response-interpretation-registry-v2.json`; for Patient Journey, use `patient-journey-interpretation-registry-v2.json`.

For an existing published version, the generator only permits a one-time bootstrap when the exported snapshot explicitly says `bootstrapPublished=true` and `releaseHistoryCount=0`. The database RPC independently enforces this rule; the JSON marker is not an authorization bypass.

## 3. Register and attest

The owner-authenticated `assessment-access` action `register_interpretation_release` accepts the generated JSON as `data.rpc_args`. Example request body:

```json
{
  "action": "register_interpretation_release",
  "data": {
    "rpc_args": {
      "...": "paste the complete /tmp/c03-release-rpc-args.json object here"
    }
  }
}
```

Call it with a valid owner JWT. The Edge handler verifies the user and `is_owner()`, then invokes the fixed registration RPC using the caller's authenticated client. Do not call the RPC as an anonymous user or replace any digest/identity field.

Then call the owner-authenticated action:

```json
{
  "action": "verify_interpretation_release",
  "data": {
    "assessment_type_id": "<assessment-type-uuid>"
  }
}
```

Runtime attestation succeeds only if the deployed Edge source SHA, fixed Edge release reference, selected interpretation registry digest, exact live option identity manifest, and full current database configuration digest match the registered release. For a published version, successful attestation moves the release to `PUBLISHED`; for a draft/archived version it moves to `VERIFIED`.

## 4. Read-only readiness verification

Before enabling strict enforcement, verify all five currently published version IDs have a current release in `PUBLISHED` state, with:
- `runtime_verified_at IS NOT NULL`;
- registry digest matching runtime attestation;
- runtime configuration digest matching `config_digest`;
- current `assessment_configuration_digest(id)` matching the registered digest;
- runtime Edge ref and source SHA matching the registered values.

Also verify each family’s `current_published_version_id` points to the expected published version. Do not enable strict mode if any current version is missing or degraded.

## 5. Strict enforcement and rollback

`C03_RELEASE_GATE_ENFORCED` is an explicit rollout switch. When set to `true`, the Edge handler:
- hides unready assessments from the catalog/content response;
- rejects public access-token issuance and protected access-token issuance for unready versions;
- rejects new session creation before lead/session writes;
- rejects completion if a release is absent or its registry/config provenance mismatches.

Keep strict mode disabled only during the controlled backfill window. Enable it only after all five current published versions are registered and attested, then run the approved post-deploy smoke test and verify no unintended rows remain. A successful repository CI run is not a substitute for this Production verification.

For rollback to a previously verified release of an archived assessment version:
1. call `restore_assessment_interpretation_release_secure(p_release_id)` as owner;
2. call `verify_interpretation_release` to re-attest the selected release against the current Edge build;
3. call the existing owner-protected `restore_public_assessment_secure` to switch the family’s published version pointer;
4. verify the release state is `PUBLISHED`, the pointer is correct, and strict-mode access/session gates pass.

Rollback selection clears the old runtime attestation and intentionally blocks publication until re-attestation succeeds. It cannot restore a release if the persisted assessment configuration has drifted from that release’s digest.

## Failure behavior

- A stale export is rejected during registration.
- Missing release, wrong registry digest, mismatched source SHA/ref, invalid option manifest, configuration drift, or stale runtime attestation prevents publication validation and, when strict mode is enabled, blocks new access/session issuance.
- Never repair a failed release by editing a digest by hand. Re-export the exact version, review the diff, regenerate the payload, and register a new release (or explicitly select a historical verified release for rollback).

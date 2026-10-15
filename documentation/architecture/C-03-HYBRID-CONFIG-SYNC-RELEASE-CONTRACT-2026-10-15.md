# C-03 — Hybrid Assessment Configuration Synchronization and Release Contract

**Status:** implementation contract; candidate implementation in PR #109; not deployed  
**Date:** 2026-10-15  
**Decision context:** owner-directed hybrid Git/Supabase model with explicit synchronization/release (architecture decision D17). In P3 architecture, D11 means classification/grade semantics; it is not the synchronization decision.

## 1. Objective and invariants

The product uses two complementary authorities rather than treating Git and Supabase as interchangeable copies:

- **Git is authoritative for code-owned behavior:** scoring/interpretation registries, report models, engine and contract versions, migration/RPC definitions, deterministic test fixtures, and the release manifest.
- **Supabase is authoritative for persisted assessment content and runtime identity:** assessment family/version rows, axes, questions, options, traps, and the configuration fields attached to a specific assessment version.
- **A release is valid only when the Git release manifest explicitly binds the intended Supabase version to a deterministic digest of its complete runtime configuration and the matching code-owned registries.** Neither “published” in the database nor “merged” in Git alone constitutes a verified release.

These rules must hold:

1. Published content is immutable. Changes are made in a draft/working copy and released as a new version.
2. No automatic two-way overwrite, silent repair, or “last writer wins.”
3. Every publish/restore is gated by exact digest equality and compatibility checks.
4. Every session pins the exact assessment version and release identity used to start it. Completion uses that pinned identity, not the current family pointer.
5. Drift or missing release evidence fails closed before a new session is issued. Existing sessions may complete only against their pinned, verified version; if required pinned content is unavailable or inconsistent, return a typed conflict and preserve the session for recovery rather than throwing an unhandled error.
6. Rollback changes the family’s active pointer to a previously verified release; it does not rewrite historical results or mutate the failed release.

## 2. Complete configuration digest

The digest must cover all fields that can affect presentation, eligibility, scoring, interpretation, reporting, or economic outputs—not only option identities.

### Supabase-owned version projection

Include a versioned, normalized projection of:

- assessment family ID/slug and assessment type ID/version/config version;
- title/description and user-visible metadata expected to remain stable for the released version;
- assessment flags and runtime policies, including login requirement, traps and EV simulator enablement;
- axes: stable ID, code, title/localized titles, weight, display order, and any axis-level scoring/role configuration;
- questions: stable ID/code, axis identity, localized text, type, required flag, impact, layer/trap linkage, and display order;
- options: stable ID, parent question identity, option index/value, localized labels, trap flags, and display order;
- trap definitions: stable ID/identity, question/validation/target axis, penalties, and user-facing messages;
- axis-role, KPI, EV and other scoring/report mappings;
- any other persisted field consumed by the runtime, scorer, interpreter, or report renderer.

Exclude volatile audit timestamps and unrelated operational/session rows. Every exclusion must be explicit and reviewed when the runtime begins consuming a new field.

### Git-owned release projection

Bind the assessment digest to:

- Git commit SHA (and signed/tagged release identifier if used);
- scoring engine identity/version and scoring contract version;
- interpretation registry schema/version and the digest of entries selected by the explicit family/version binding;
- consistency rules/pair registry versions and selected family/version entries;
- report model version and family key;
- migration/RPC contract version;
- deterministic fixture-set version.

The canonicalizer must normalize object-key order, Unicode normalization, number representation, null/default treatment, and array order by stable identity. It must not sort semantically ordered arrays by a display label. Hash the canonical UTF-8 bytes using SHA-256; record both canonicalizer version and digest algorithm.

## 3. Release record and state machine

A release record should minimally identify:

- release_id;
- assessment_family_id, assessment_type_id, product assessment_version;
- git_commit_sha;
- config_digest, config_canonicalizer_version;
- interpretation_version and interpretation_registry_digest;
- scoring_engine_version, scoring_contract_version;
- report_model_version, fixture_set_version;
- state, verification timestamps, verifier/build identity, and failure reason.

Recommended state transitions:

DRAFT → PREPARED → VERIFIED → PUBLISHED

Failure before publish transitions to REJECTED; post-publish problems transition to DEGRADED while preserving evidence. Re-publishing a release is idempotent. State changes and the active-family-pointer update must occur in one database transaction after external Git artifacts are immutable and available.

## 4. Explicit synchronization/release sequence

1. Create/edit a Supabase working copy; do not edit a published version in place.
2. Export its full canonical configuration projection as a review artifact. The export is data, not executable SQL.
3. In Git, review the export alongside code-owned registry/model changes and update the release manifest with the exact family/version and expected digests.
4. CI validates schema, uniqueness, references, required questions/options, complete option identity, interpretation binding, report-model axis coverage, mapping compatibility, and deterministic fixtures.
5. Register a PREPARED release in Supabase with the expected Git SHA and digests. This does not make it public.
6. The release verifier reads the persisted version back from Supabase, recomputes the full digest from live rows, resolves exact code-owned registry bindings, and compares every manifest field. Any mismatch rejects the release and emits a structured drift report.
7. Mark the release VERIFIED only after all checks pass. In a transaction, publish the immutable version and update the family’s current-published pointer with an expected-old-pointer check.
8. Runtime startup reads the active release record and verifies pointer/version/digest agreement before issuing new access. The Edge runtime reports the release ID and digests in health/diagnostic metadata; it must not silently accept a mismatched manifest.
9. After publish, run a disposable end-to-end completion test against the release in an isolated environment. Production-writing E2E and runtime deployment remain separate explicit release gates.

## 5. Drift detection and recovery

Detect and classify at least:

- Git commit/registry mismatch;
- missing or duplicate release record;
- current family pointer not matching the recorded published version;
- persisted configuration digest mismatch;
- unsupported family/product-version/interpretation binding;
- runtime/report model axis mismatch;
- migration or RPC contract not present in the target environment.

For a mismatch, block new release/publish and new session issuance; expose the exact mismatched component and expected/actual digest to authorized operators. Do not auto-rewrite either source. For an already-started session, use its pinned release only if that release remains verifiable. Otherwise preserve its snapshot and return a typed recoverable error, not a generic unhandled exception.

Rollback uses a previously verified release record and an expected-current-pointer condition. Re-run compatibility checks before switching the pointer. Keep the failed release, audit record, and historical results intact. Never roll back by mutating a published version or deleting its release evidence.

## 6. Required tests before implementation closure

- Canonical digest is deterministic across row ordering and JSON key ordering.
- Changing each scoring-/report-relevant field changes the digest.
- Changing only excluded audit timestamps does not change the digest.
- Missing/duplicate axes, questions, options, trap references, mappings, or interpretation entries reject verification.
- Git SHA, registry digest, report-model version, and migration/RPC compatibility must all match.
- Pointer compare-and-swap prevents concurrent stale publishers from replacing a newer release.
- Drift blocks publication and new session issuance without writes to the active version.
- Rollback selects a prior verified release and leaves existing results immutable.
- Completion succeeds for a valid pinned release and returns a typed recoverable error for unavailable/mismatched pinned configuration.
- Protected and public completion paths both have isolated PostgreSQL tests; the protected path additionally proves user identity and exactly-once usage consumption.
- Production release gate verifies the exact deployed Edge bundle and performs only explicitly authorized E2E writes with exact-ID cleanup.

## 7. Current evidence and limits

As of the read-only C-03 investigation on 2026-10-15:

- Production has five active published assessment versions.
- The proposed interpretation-release table and RPCs from PR #96 are absent in Production.
- PR #96 is open/draft and diverged from current main; it must not be merged directly. Its interpretation-only release gate does not cover the complete configuration projection above.
- Current CI proves the existing protected SQL completion harness succeeds, and the new C-03 source-contract test passes. It does not reproduce the reported admin/protected completion crash.
- Recent Edge logs without 500 responses do not establish that the reported crash cannot occur.
- No production DDL/DML, migration, deployment, or production-writing E2E is authorized by this design document.

## 8. Implementation exit criteria

C-03 is not closed until both owner-directed tracks are evidenced:

1. **Completion crash:** reproduce the reported failure in an isolated fixture or obtain a specific stack/error trace; add a regression test that fails before the fix and passes after it; prove protected and public paths remain correct; identify the root cause from evidence.
2. **Hybrid synchronization/release:** implement the full configuration digest and release state machine on a fresh branch based on current main; test drift, concurrent publication, pinned-session behavior, and rollback in disposable PostgreSQL; update operational documentation.
3. **Release gates:** verify target-environment migration/RPC compatibility and deployed Edge source/bundle. Any Production migration, Edge deployment, or production-writing E2E requires its own explicit gate and exact cleanup plan.

Until all three criteria pass, status remains **IN PROGRESS / NOT CLOSED**.


## 9. Implementation mapping — PR #109 (2026-10-15)

The current implementation candidate is [PR #109](https://github.com/core-system-md/clinic-evaluator/pull/109), which selectively integrates the persisted-result projection fix from PR #106 with the complete release gate from PR #107. It supersedes the narrower duplicate implementation in PR #108.

- Canonical projection/digest: `supabase/functions/assessment-access/assessment-config-digest.mjs` and `supabase/functions/assessment-access/engine.ts`.
- Release verifier: `supabase/functions/assessment-config-release/index.ts`; registration and verification are owner-authenticated.
- Release schema/state machine: `supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql`.
- The gate is disabled by default. It pins release identity to newly created sessions, checks the pinned digest at calculation, uses compare-and-swap for publication, rejects drift, and supports rollback only to a verified release.
- Runtime metadata must be explicitly configured: `C03_GIT_COMMIT_SHA`, `C03_EDGE_RELEASE_REF`, `C03_FIXTURE_SET_VERSION`, and `C03_MIGRATION_CONTRACT_VERSION`.

### Verification evidence

On integrated head `a158f5b56dab1c2f214f2048b2a7e5168f330862`, the following passed:
- C-03 actual Edge handler regression: [#38712681240](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681240) — actual scoring engine and protected/public completion routes across all five assessment families.
- C-03 persisted-result/protected handler regression: [#38712681233](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681233) — missing persisted `assessmentSlug` recovery and protected retry/first-completion paths.
- C-03 hybrid release gate: [#38712681225](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681225) — canonical digest coverage, owner-authenticated verifier, and disposable PostgreSQL release state machine.
- P3/WP-02/WP-03/WP-04/WP-05/WP-09: [P3 #38712681206](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681206), [WP-02 #38712681222](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681222), [WP-03 #38712681219](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681219), [WP-04 #38712681272](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681272), [WP-05 #38712681360](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681360), [WP-09 #38712681340](https://github.com/core-system-md/clinic-evaluator/actions/runs/38712681340).

### Deployment boundary

These results are isolated CI evidence only. The migration is not applied to Production, the runtime metadata is not configured in Production, no release has been registered or activated, the gate remains absent from Production, and no Edge/Pages deployment or Production-writing E2E has occurred. C-03 remains open until the controlled rollout and protected completion verification pass.

# WP-08 — V1 Assessment Reconstruction
## 2026-10-08

**Work package:** WP-08 — Assessment V1 reconstruction  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Base:** `main` at `f793957e6a9ff42c3b7f60202f89786ababd3042`  
**Branch:** `wp-08-v1-assessment-reconstruction-2026-10-08`  
**Dedicated PASS run:** GitHub Actions `37748440553`  
**Merged PR:** #62  
**Merge commit:** `aa3f44e7a0268753ae12caa75ab3fb643f50ad2c`  
**Status:** PASS — STAGE CLOSED  
**Production mutation:** NO

## Scope

Reconstruct the final public V1 content for Comprehensive Clinic and Patient Journey from verified approved content, preserving the stable family slug while resetting final version identity to V1.

## Safety boundary

Published V1/V2 rows are not mutated in place. Final V1 rows are created, validated and routed first. Superseded versions are removed only after explicit dependency checks.

## Acceptance verified

- Comprehensive Clinic final V1 is an exact content snapshot of the verified current corrected V2, with final identity reset to V1.
- Patient Journey final V1 uses the frozen corrected-content artifact corresponding to the historical V2 contract; that artifact is 25 questions / 96 options.
- Comprehensive Clinic is 36 questions / 152 options / 6 axes.
- Patient Journey is 25 questions / 96 options / 5 axes.
- Canonical axis weights are preserved.
- Patient Journey's semantic-only question is marked non-scoreable at the content layer.
- Stable family slugs remain the routing surface.
- Final V1 rows are created rather than mutating published rows in place.
- Superseded versions are deleted only after dependency checks.
- The migration rejects deletion when runtime/history dependencies exist.
- No published V2 product identity remains in the final reconstruction.
- Dedicated Node tests passed.
- Dedicated disposable PostgreSQL harness executed the migration successfully.

## Verification

Dedicated workflow `37748440553` completed **SUCCESS**.

The workflow validated the content artifacts and executed the migration against an isolated PostgreSQL 17 service. Earlier harness failures were corrected during the stage:
1. service-port exposure for the disposable PostgreSQL service;
2. alignment of the harness with the production family timestamp column;
3. case-sensitive JSON field mapping for the approved Patient Journey artifact;
4. correction of the Patient Journey acceptance count from the old V1 inventory (25/75) to the verified corrected V2 artifact (25/96).

These were contract-test corrections only; no production mutation occurred.

## Production boundary

No production database migration was executed.  
No production Edge Function deployment was executed.

## Stage decision

**WP-08 = PASS**  
**WP-08 = STAGE CLOSED**  
**Published to `main` via PR #62.**

Next canonical stage:

**WP-09 — Obsolete engine references**

## Post-closure reconciliation correction — 2026-10-08

A forensic reconciliation performed after the original WP-08 closure identified two contract-boundary defects that were not covered by the original WP-08 verification boundary:

1. Final V1 Consistency configuration was not installed in the runtime pair registry:
   - Comprehensive Clinic V1: 52 approved relationships were present in the approved content relationship declarations but were scoped only to the existing V2 registry.
   - Patient Journey V1: 4 approved Consistency pairs were not present in the runtime registry.
   Because the canonical engine scopes Consistency configuration by assessment family and version, this would have removed approved V1 Consistency behavior.

2. Patient Journey V1 axis weights were written as fractions (20/100, 15/100, etc.) in the reconstruction migration instead of the canonical percentage-point representation required by the Final Implementation Contract.

The corrective reconciliation was implemented in PR #65 on branch `reconciliation-corrections-2026-10-08`:

- V1 runtime Consistency registry now contains the exact approved 52 Comprehensive V1 relationships plus the 4 approved Patient Journey V1 relationships.
- Existing Comprehensive Clinic V2 relationships remain unchanged.
- Patient Journey V1 migration now persists canonical 0–100 weights.
- Migration assertions prove both final V1 families total 100%.
- Dedicated tests prove exact approved-relationship parity and canonical weight semantics.
- Disposable PostgreSQL harness validates the corrected migration.

Dedicated corrected verification:

- GitHub Actions workflow **37776556545 — SUCCESS**
- Node contract tests — SUCCESS
- PostgreSQL migration harness — SUCCESS

No Production database migration, routing change, content mutation, or Edge Function deployment was performed.

### Corrected stage decision

**WP-08 reconciliation correction = PASS**  
**WP-08 = STAGE CLOSED after correction**  
**Correction merged through PR #65, with canonical/test reconciliation merged through PR #67**

The prior WP-08 PASS record remains historical evidence of the original stage execution; PR #65 is the authoritative corrective closure for the two subsequently discovered deviations.


## Canonical/test follow-up — PR #67

The V1 Consistency runtime expansion exposed stale cross-stage assumptions in the canonical architecture artifact and P3/WP-03 contract tests. PR #67 reconciled them without changing scoring behavior:

- canonical P3-CONSISTENCY-PAIR-REGISTRY-V1.json now matches the runtime registry;
- registry scope is versioned: Comprehensive V2 = 52, Comprehensive V1 = 52, Patient Journey V1 = 4;
- P3 production-contract and WP-03 configuration tests validate those version-scoped counts;
- dedicated WP-08 workflow 37777401435 = SUCCESS;
- P3 isolated kernel job 113312306760 = SUCCESS;
- WP-03 configuration semantics job 113312305582 = SUCCESS;
- WP-03 disposable PostgreSQL contract job 113312305836 = SUCCESS;
- the full Node baseline remains red only on existing P5 editor assertions unrelated to this reconciliation.

PR #67 merged to main as be6214e4f8fb9382ccdf8150d34491a061887b97.

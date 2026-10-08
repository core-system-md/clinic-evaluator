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

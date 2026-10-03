# Clinic Evaluator — Work Roadmap

**Date:** 2026-09-30  
**Repository:** `core-system-md/clinic-evaluator`  
**Canonical roadmap branch:** `main`

## Governance rule

The project owner retains approval authority over all **architectural decisions**.

The working method is:

1. Investigate the existing system and understand why the current design exists.
2. Document evidence, requirements, dependencies, and legitimate constraints.
3. Present architectural alternatives, trade-offs, risks, and consequences to the owner.
4. Wait for architectural approval.
5. Implement the approved architecture through engineering/programming work.
6. Verify the implementation and document the result.

A roadmap phase or task is **not** itself approval to redesign a subsystem.

## Overall roadmap

The project owner has given provisional approval to use the following execution roadmap as the working plan:

- **P0 — Security and architecture investigation/hardening**
- **P1 — Establish the real source of truth and reproducible database deployment**
- **P2 — Assessment versioning and historical-result integrity**
- **P3 — Assessment/Scoring Engine consolidation and verification**
- **P4 — Atomic assessment submission and persistence architecture**
- **P5 — Admin architecture consolidation**

The roadmap may be refined when investigation reveals requirements or constraints that were not visible in the initial audit. Architectural changes require explicit owner approval.

## P0 — Security / Architecture Investigation

P0 currently contains 14 investigation topics. They are treated as subjects for measurement and understanding first, not as a predefined list of fixes.

1. Admin authentication and the current client-side/local-storage authentication path.
2. Public/anonymous read access to sensitive application data.
3. Anonymous update/write access and its intended use cases.
4. `SECURITY DEFINER` functions and their grants/exposure.
5. Function `search_path` security configuration.
6. Assessment-user credentials and browser exposure.
7. Privileged Edge Function design and authorization boundaries.
8. CORS and request-origin assumptions.
9. Password/security controls, including leaked-password protection.
10. RLS policy structure, duplication, and tenant/resource boundaries.
11. Data-access paths used by the public assessment flow and whether they reveal more data than required.
12. Existing authentication/authorization legacy paths and backward-compatibility requirements.
13. Database functions/triggers/Edge Functions that are legacy, unused, or only partially connected to the current architecture.
14. Required audit logging, monitoring, and incident/security observability for administrative operations.

### P0 decision process

For each topic, record:

- Current behavior
- Intended purpose / historical reason, where discoverable
- Evidence in Git history, code, database, or runtime behavior
- Threat/failure scenario
- Legitimate product requirements
- Options
- Architectural trade-offs
- Recommendation for consideration (not an imposed decision)
- Owner decision
- Implementation plan after approval
- Verification results

## P1 — Source of truth / reproducibility

After P0 decisions that affect database governance are approved:

- establish version-controlled Supabase migrations;
- document schema and runtime configuration;
- define authoritative ownership of assessment definitions;
- establish a reproducible development/staging database state;
- define deployment and rollback procedures.

The architectural choice between Git-authored definitions, Supabase-authored runtime data, or a controlled hybrid must be explicitly approved.

## P2 — Assessment versioning

Investigate and then design, subject to approval:

- immutable published assessment versions;
- question/option/axis/KPI/trap/scoring-rule version relationships;
- session-to-version binding;
- historical result snapshots;
- migration strategy for existing sessions/results;
- draft/publish/retire lifecycle.

### P2 approved architecture

The owner has approved:

- **Option B — explicit assessment-family/version model.**
- **Stable public slug/URL across all versions.**
- **Version changes are internal and need not be disclosed to assessment users.**

Design record:

`documentation/audit/P2-architecture-design-2026-10-01.md`

### P2 implementation gate

The architecture is approved, but implementation must still follow the contract:

`APPROVED INTENT → CURRENT REALITY → RECONCILIATION → ENGINEERING DECISION → DESIGN → IMPLEMENTATION → VERIFICATION → DOCUMENTATION → CLOSURE`

Before production schema changes, complete implementation-readiness verification, including:

- full `assessment_types.slug` dependency inventory;
- live assessment/family data reconciliation;
- migration-history/provenance reconciliation sufficient for safe deployment;
- dependency graph review for all assessment-version-owned tables;
- exact existing-data migration plan;
- runtime/admin transition plan;
- test plan for old sessions, new sessions, draft editing, publishing, and stable public access.

## P3 — Scoring Engine

Investigate and then consolidate, subject to approval:

- scoring semantics;
- missing-role behavior;
- normalization and weighting;
- impact levels;
- trap behavior;
- KPI calculation;
- EV model definition;
- deterministic test fixtures;
- engine versioning and reproducibility.

No scoring change should be made solely to make implementation cleaner; the measurement intent must be established first.

## P4 — Submission / persistence

Investigate and then design, subject to approval:

- atomic submission;
- idempotency;
- retries;
- partial-failure recovery;
- answer/score/session consistency;
- lead association;
- duplicate-submission rules;
- server-side calculation boundaries.

## P4 — Submission / persistence — CLOSED

**Status:** CLOSED / IMPLEMENTED / RUNTIME VERIFIED (2026-10-03)

Canonical records:
- `documentation/architecture/P4-CLOSURE-2026-10-03.md`
- `documentation/architecture/P4-OWNER-APPROVAL-2026-10-03.md`
- `documentation/architecture/P4-IMPLEMENTATION-DESIGN-2026-10-03.md`
- `documentation/architecture/P4-IMPLEMENTATION-VERIFICATION-2026-10-03.md`

P4 implementation and required runtime verification are complete. Protected usage idempotency/concurrency was verified against the exact P4 SQL on a disposable PostgreSQL CI database; production protected entitlement data was not modified.

## P5 — Admin architecture

Investigate and then design, subject to approval:

- admin authentication;
- authorization/roles;
- assessment CRUD;
- version management;
- question/option management;
- trap/KPI management;
- import/duplicate workflows;
- audit log;
- reporting/operations;
- module boundaries and maintainability.

## P3 — Canonical continuation (2026-10-02)

The canonical P3 state is now maintained in:

`documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`

**Canonical branch:** `main`

The branch `documentation/audit-and-decisions` is a historical baseline and is not an active P3 source of truth. It remains preserved for traceability.

### P3 status

**DESIGN / NOT IMPLEMENTATION-READY**

P3 methodology and supporting modules have progressed substantially, but production implementation is not authorized until the remaining methodology, data-lineage, integration, and verification gates are closed and the Implementation-Ready record is issued.

### P3 sequence to Implementation-Ready

1. Documentation/contract reconciliation — **completed**
2. Close methodology decisions — **completed**
3. Historical/current-data lineage reconciliation — **completed at evidence/disposition boundary**
4. Integrate the P3 design into one coherent scoring/result pipeline — **completed at design boundary**
5. Complete deterministic verification/acceptance package — **active**
6. Issue **P3 — IMPLEMENTATION-READY**
7. Stop and await explicit owner approval before implementation

This roadmap does not authorize implementation by itself.

## Explicit non-goals at this stage

Until the corresponding architecture is approved, do not assume that the project will:

- migrate to a specific frontend framework;
- remove multiple assessment HTML entry points;
- replace Supabase;
- replace the current assessment methodology;
- change KPI formulas;
- change EV formulas;
- remove legacy components merely because they appear unused;
- expose or restructure existing data solely for convenience.

These are architectural/product decisions and remain subject to investigation and owner approval.

## Current checkpoint

**Current phase:** P3 — Assessment / Scoring Engine consolidation and verification.

**P0:** CLOSED with documented platform constraint(s).

**P1:** CLOSED / VERIFIED. The final assessment runtime is server-authoritative and the browser no longer acts as the official scoring/persistence authority.

**P2:** CLOSED / IMPLEMENTED / EXTERNALLY VERIFIED.

P2 production implementation is now complete. The approved explicit assessment-family/version model is deployed; published/archived versions are immutable; sessions are pinned to concrete assessment versions; public resolution is family → current published version; and the production flow was verified through GitHub-hosted external HTTP E2E.

**P2 evidence:**
- migrations: `20261001100633_p2_assessment_family_versions.sql`, `20261001100833_p2_admin_status_guard.sql`, `20261001101014_p2_immutability_trigger_fix.sql`, `20261001104100_p2_score_weight_precision.sql` plus the reconciled P0/P1/protected-access migration history;
- external verification: GitHub Actions run #6 (`36850588686`) for the production `assessment-access` flow;
- verified final sequence: catalog → content → public access → session → answer persistence → completion → idempotent completion → invalid-token rejection.

**P2 records:**
- `documentation/audit/P2-reality-audit-2026-10-01.md` — historical baseline, superseded by implementation/closure evidence;
- `documentation/audit/P2-architecture-design-2026-10-01.md` — approved architecture and final implementation status;
- `documentation/audit/P2-closure-2026-10-01.md` — closure evidence and acceptance record.

**P3 status:** DESIGN / NOT IMPLEMENTATION-READY.

Gate A, Gate B, Gate C, and Gate D are complete at their defined boundaries. Gate E verification is active. No production scoring-semantic change, schema migration, historical rewrite, or cutover is authorized before the Implementation-Ready gate and explicit owner approval.

**P3 primary records:**
- `documentation/audit/P3-reality-audit-2026-10-01.md`
- `documentation/architecture/P3-scoring-engine-architecture-2026-10-01.md`

**P3 rule:** no change to scoring semantics, KPI behavior, trap behavior, normalization, weighting, or EV formulas may be introduced solely as code cleanup. Such changes require an explicit product/architecture decision first.

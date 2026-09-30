# Clinic Evaluator — Work Roadmap

**Date:** 2026-09-30  
**Repository:** `core-system-md/clinic-evaluator`  
**Roadmap branch:** `documentation/audit-and-decisions`

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

**Current phase:** P0 investigation.  
**Current objective:** understand the existing security architecture and the reasons behind it before selecting remediation architecture.

# D-05 Owner Decision — Missing Historical Schema Provenance Is Non-Blocking

**Decision date:** 2026-10-24  
**Project:** `core-system-md/clinic-evaluator`  
**Scope:** WP-11 §41 / D-05 schema-provenance and baseline-replay limitation  
**Authority:** Owner instruction in the 2026-10-24 continuation: select the fastest durable solution and ensure missing original schema/backup artifacts do not repeatedly block current or future work.

## Decision

The absence of an original authoritative schema file or backup is an accepted, permanent historical-provenance limitation unless new evidence becomes available. It is **not by itself a blocker** for current work, future work packages, or future stage planning.

Do not ask the owner again to locate the same unavailable artifacts. Do not make closure or continuation depend on finding them. Do not generate a purported historical baseline from Production, infer missing historical DDL, delete/recreate tables, or rewrite applied migration history.

## Required durable treatment

1. Keep the existing live-schema worksheet as an **observational record of the schema at the recorded extraction time**, not as an authoritative original baseline.
2. For the 18 tables without an initial tracked `CREATE TABLE` statement, record: **historical origin unproven; current live definition observed; no original DDL/backup available**. Do not repeat the search unless a concrete new source is identified.
3. For new work, validate only the schema objects and behavior relevant to that work against current catalog evidence, tracked migrations, code callers, and isolated tests. Do not require full historical empty-database replay unless a future, explicitly scoped deliverable genuinely requires it; if so, define a separate recovery/replay plan without blocking unrelated work.
4. Maintain the gap as a non-blocking provenance risk. Revisit it only if an authoritative artifact appears, a concrete migration defect/regression is found, or a separately approved requirement explicitly needs reproducible empty-database reconstruction.
5. This decision does **not** assert that a full empty-database replay is proven, nor does it waive independent technical acceptance criteria for grants, RLS policies, function authorization, migration source/ledger parity, CI, or runtime behavior.
6. This decision does not authorize Production writes, schema/grant/policy changes, migration application/history rewrites, deployment, PR merge, deletion/recreation, or starting WP-12.

## Acceptance boundary

The missing historical source is removed from the list of blocking prerequisites. D-05/WP-11 may be closed only when the remaining in-scope, evidence-backed technical and migration-reconciliation criteria are satisfied, or when a distinct technical limitation is explicitly dispositioned under the governing contract. No closure claim may rely on the provenance gap being silently treated as resolved.

## Current evidence boundary (2026-10-24)

- The tracked repository scan found no initial persistent `CREATE TABLE` statement for 18 of the 25 live public tables across the 56 tracked migration files examined.
- The live catalog is useful to document current observed definitions, but cannot prove historical intent or reconstruct the original migration path.
- The previously recorded live migration ledger/source mismatch and PR #120 review/merge state are separate from this provenance decision and must be checked independently before D-05 is declared closed.
- No production mutation or migration-history rewrite is authorized by this decision.


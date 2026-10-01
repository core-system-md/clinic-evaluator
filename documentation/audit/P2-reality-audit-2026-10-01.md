# P2 Reality Audit — Assessment Versioning & Historical-Result Integrity

**Date:** 2026-10-01  
**Project:** `core-system-md/clinic-evaluator`  
**Stage:** P2-A — Reality Audit → P2-B — Architecture Design  
**Status:** **DECISION RESOLVED / DESIGN ESTABLISHED**  
**Implementation status:** **NOT IMPLEMENTED**  
**Architecture status:** **APPROVED — OPTION B**

## 1. Purpose

This audit follows the binding engineering contract:

`TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE`

P2 was treated as an investigation first. The owner has now approved Option B with a stable public slug/URL across versions. The detailed design is documented in `documentation/audit/P2-architecture-design-2026-10-01.md`. Production implementation has not yet started.

## 2. Authoritative scope

The project roadmap defines P2 as:

- immutable published assessment versions;
- question/option/axis/KPI/trap/scoring-rule version relationships;
- session-to-version binding;
- historical result snapshots;
- migration strategy for existing sessions/results;
- draft/publish/retire lifecycle.

The initial audit explicitly stated that the existing model had version-related fields but did not establish immutable, fully versioned published definitions tied to completed sessions.

## 3. Current live database — PROVEN

### Assessment identity/version fields

`public.assessment_types` currently contains:

- `id` UUID primary key
- `slug` UNIQUE
- `status` = draft/published/archived
- `version` integer
- `config_version` integer
- `published_at`
- `archived_at`
- `parent_id` self-reference

Production currently contains five published assessment rows, all at version 1, with `published_at = NULL` and `parent_id = NULL`.

There is currently no separate assessment-family/version entity.

### Session binding

`public.sessions` contains:

- `assessment_type_id`
- `assessment_version`
- `scoring_engine_version`

Current production data:

- 21 completed sessions: version 1 / `server-score-v1`
- 11 in-progress sessions: version 1 / `server-score-v1`
- 0 sessions with a NULL `assessment_version`

This means **session version metadata is already present and populated**.

### Historical snapshots

`public.historical_snapshots` exists with:

- `session_id`
- `assessment_type_id`
- `snapshot_data`
- `created_at`

However production currently contains:

- 0 snapshots
- 0 sessions with snapshots

Therefore the table exists, but **historical snapshot behavior is not active**.

## 4. Current runtime behavior — PROVEN

The live `assessment-access` implementation loads assessment runtime content by `assessment_type_id`.

It reads the current rows from:

- `assessment_types`
- `axes`
- `questions`
- `options`
- `traps`

The content query filters these tables by the assessment's current `id`; it does **not** select definitions by `sessions.assessment_version`.

Therefore:

> A session can record `assessment_version = 1`, while the runtime definition represented by that session can still be changed through the same `assessment_type_id`.

The stored numeric version is therefore **metadata about the session, not currently an immutable content boundary**.

## 5. Current admin mutation behavior — PROVEN

The live administrative functions are not version-aware.

`save_assessment_secure` updates an existing `assessment_types` row directly, including its status and descriptive/configuration fields.

Administrative functions for axes, questions, and options insert/update/delete their current rows and do not enforce an immutable published-version boundary.

`update_assessment_status_secure` can change a published assessment's status without creating a new version.

The admin UI also exposes ordinary structural editing against the existing assessment row.

No verified database trigger currently prevents mutation of a published assessment or its dependent definition rows.

## 6. Current version lineage behavior — PROVEN

`parent_id` exists and the secure duplication function sets the cloned assessment's `parent_id` to the source assessment.

The secure duplication function also copies axes, questions, and options into the new assessment row.

However:

- `parent_id` is not currently enforced as a complete version lineage model;
- no unique/version-family invariant was found;
- no publication transition automatically creates a new version;
- no published-row immutability rule was found;
- the unique `slug` constraint prevents multiple assessment rows from sharing the same slug;
- runtime public lookup is slug-based.

Thus the current duplication mechanism is **not yet a complete published-version lifecycle**.

## 7. Historical-result integrity — PROVEN GAP

A completed session currently retains:

- answers;
- score rows;
- overall lead score;
- `assessment_type_id`;
- `assessment_version`;
- `scoring_engine_version`.

But there is no populated historical definition snapshot.

Consequently, if the definition behind the same `assessment_type_id` is changed, the existing result retains the old numeric version but does not retain a complete authoritative copy of the question/option/axis/trap/KPI/EV configuration that produced it.

This is the central P2 integrity gap.

## 8. Existing architecture that should be reused

The current system already has useful foundations:

1. `assessment_types.id` identifies a concrete assessment definition.
2. `sessions.assessment_type_id` points to that concrete definition.
3. `sessions.assessment_version` records the version observed at session start.
4. `sessions.scoring_engine_version` records the scoring engine version.
5. `parent_id` provides a starting point for lineage.
6. `historical_snapshots` provides an existing location for historical definition data.
7. Duplication already performs relational copying of core assessment structures.
8. Public/protected access already requires the assessment to be published.

Therefore P2 should **not** begin by creating an entirely separate versioning system without first evaluating these existing capabilities.

## 9. Migration/history reconciliation finding — PROVEN

The live Supabase migration history and the current repository migration directory are not identical.

Examples:

- live history contains earlier versioning/security migrations that are not present as files in the current repository migration directory;
- live history contains `20261001083056` named `p1_e_fix_answers_upsert_conflict`, while the repository contains `20261001083200_p1_e_fix_answers_upsert_conflict.sql`;
- repository contains later P0/protected-access migration files whose exact timestamps are not represented in the live migration list returned from Supabase.

This is a **migration provenance/reconciliation issue**, not something to repair opportunistically during P2 versioning.

No migration-history repair was performed during this audit.

Supabase's current migration guidance confirms that Git migration files and the remote `supabase_migrations.schema_migrations` history are separate state that must be reconciled before relying on them as a reproducible deployment baseline.

## 10. Architectural decision boundary

The investigation establishes a real architectural decision. It is not merely an implementation detail.

The project needs an authoritative answer to this question:

> **What is the canonical identity and lifecycle of an assessment version, and what makes a published definition immutable for all sessions/results that reference it?**

At least the following materially different approaches exist.

### Option A — Reuse the existing concrete assessment row as the version

- A published `assessment_types` row becomes immutable.
- A new version is created as a new concrete assessment row.
- `parent_id` becomes explicit lineage.
- Existing `sessions.assessment_type_id` remains the concrete version reference.
- Session version metadata remains as verification metadata.
- Historical results can resolve the exact immutable definition through the session's assessment row.
- Requires resolving stable public slug/URL identity versus concrete version identity.

### Option B — Introduce an explicit assessment-family/version model

- Stable assessment identity becomes a family/entity.
- Version rows become immutable children.
- Questions/options/axes/etc. belong to a specific version.
- Public slug belongs to the stable family identity.
- Sessions point to an immutable version.
- Publishing creates/selects a version explicitly.
- This is more explicit but introduces a new domain layer and migration.

### Option C — Preserve the current model and snapshot the definition at session/completion boundaries

- Keep current assessment rows and session version fields.
- Capture a complete immutable definition snapshot for each relevant session/result.
- Historical results become independent of future live definition changes.
- This reduces structural change but creates a snapshot contract that must be defined and maintained.
- It does not by itself answer the desired published-version lifecycle unless combined with publication rules.

These are architectural alternatives because they affect domain ownership, data semantics, public identity, session behavior, historical interpretation, and migration strategy.

## 11. Engineering recommendation — NOT AN APPROVED DECISION

Before creating any new versioning subsystem, the preferred engineering direction is to first test whether **Option A can satisfy the product requirements** while reusing the existing concrete assessment row, session foreign key, parent lineage, and duplication capability.

However, this recommendation is **not an owner decision**.

The unresolved product/architecture requirement is especially the relationship between:

- stable assessment URL/slug;
- concrete immutable version;
- published version;
- draft version;
- archived version;
- existing sessions/results;
- new sessions after publishing a new version.

That relationship cannot safely be assumed.

## 12. Current acceptance state

| P2 requirement | Current state | Evidence |
|---|---|---|
| Published assessment versions exist | **PARTIAL** | version/status fields exist; all current rows are v1 |
| Published versions are immutable | **NOT PROVEN / GAP** | admin mutation paths allow updates |
| Component definitions are version-bound | **NOT PROVEN / GAP** | child rows use assessment_type_id only |
| Session-to-version binding | **IMPLEMENTED / VERIFIED** | all current sessions have assessment_version |
| Runtime uses pinned version | **NOT IMPLEMENTED** | runtime loads current assessment_type_id content |
| Historical snapshots | **NOT ACTIVE** | table exists; 0 snapshots |
| Historical result definition integrity | **NOT SATISFIED** | no complete immutable definition boundary |
| Draft/publish/retire lifecycle | **PARTIAL** | status exists, but transitions are not version-safe |
| Existing-data migration strategy | **NOT DESIGNED** | requires architectural decision |
| Version lineage | **PARTIAL** | parent_id + duplication exist, but no complete invariant |
| Migration provenance | **REQUIRES RECONCILIATION** | live and Git histories differ |

## 13. P2 decision and status

**P2-A Reality Audit: COMPLETE.**

**Owner decision: RESOLVED.**

Approved decision:

- **Option B — explicit assessment-family/version model.**
- **Public slug/URL remains stable across versions.**
- **Version changes are internal; assessment users do not need to know that a new version exists.**

The approved design is documented in `documentation/audit/P2-architecture-design-2026-10-01.md`.

**P2 architecture: APPROVED.**

**Implementation: NOT STARTED.**

The next engineering step is implementation-readiness verification and migration design against the live dependency graph. No production schema change has been made as a result of this decision.

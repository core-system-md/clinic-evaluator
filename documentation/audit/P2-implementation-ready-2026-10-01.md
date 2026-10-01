# P2 Implementation-Ready Baseline — 2026-10-01

**Project:** `core-system-md/clinic-evaluator`  
**Architecture:** Option B — explicit assessment family/version model  
**Public identity:** stable slug/URL  
**Status:** **ARCHIVED IMPLEMENTATION-READINESS BASELINE — SUPERSEDED BY P2 CLOSURE**

## 1. Owner-approved behavior

- Each public assessment has one stable assessment family.
- The family's public slug/URL never changes between versions.
- A published version is immutable.
- A new version is created as a new draft version inside the same family.
- Publishing a new version changes only which version is current for new sessions.
- Users do not need to see or understand versioning.
- Existing/in-progress sessions remain bound to their concrete version.
- Completed results remain bound to the exact immutable version that produced them.

## 2. Canonical schema

### New table: `public.assessment_families`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `slug text not null unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The family is the public identity. It does not contain the assessment question set.

### Existing table: `public.assessment_types`

Add:

- `family_id uuid not null references public.assessment_families(id)`
- retain `version integer not null`
- enforce `unique(family_id, version)`

The existing `assessment_types.id` remains the immutable concrete-version identifier.

The existing unique constraint on `assessment_types.slug` must be removed because slug ownership moves to the family.

The legacy `assessment_types.slug` column must not remain a second source of public identity. During implementation it should be retained only if required for compatibility, populated consistently from the family, and removed from public/runtime lookup paths. Its final compatibility treatment is an implementation detail, not a product decision.

## 3. Existing production migration

Current production contains five published assessment definitions, all version 1, with existing IDs and slugs:

- `admin-reception-assessment`
- `clinic-performance`
- `comprehensive-clinic-assessment`
- `medical-team-assessment`
- `patient-journey`

Migration must:

1. create exactly one family per existing assessment;
2. preserve each current slug as the family's slug;
3. attach the existing `assessment_types.id` to its family;
4. preserve version 1;
5. preserve all existing child rows and IDs;
6. preserve all existing sessions, answers, scores, leads and access rows;
7. make each existing published assessment the current published version for its family;
8. not fabricate historical versions.

No existing session/result should be rewritten to a new assessment ID.

## 4. Definition graph that belongs to a version

The complete version graph is:

- `assessment_types`
- `axes`
- `questions`
- `options`
- `traps`
- `assessment_assets`
- `insights_mapping`

Verified live foreign keys show these tables depend on `assessment_types.id` directly or through the question/axis graph.

The existing `duplicate_assessment_secure` is **not sufficient as the final version-creation operation**: its current implementation copies assessment, axes, questions and options, but does not copy the complete version graph such as traps, assets and insights mappings.

The P2 version-creation operation must copy the complete graph in one transaction and preserve all intra-version relationships.

## 5. Version creation

New version operation:

1. authenticate administrator with existing `require_admin()`;
2. resolve source version;
3. resolve its family;
4. lock the family/version rows for the transaction;
5. determine next family-local version number;
6. create new `assessment_types` row with the same family and next version, status `draft`;
7. copy axes;
8. copy questions with old-axis → new-axis mapping;
9. copy options with old-question → new-question mapping;
10. copy traps;
11. copy assessment assets;
12. copy insights mappings;
13. copy all version-owned configuration fields from the source;
14. return the new version ID.

The source version is never modified.

## 6. Publishing

Publishing is an atomic database operation.

Required checks:

- target exists;
- target belongs to the requested family;
- target is `draft`;
- target definition is complete enough for publication;
- no other version remains published after the transaction.

Transaction:

1. lock the family;
2. lock the target version;
3. archive the existing published version, if any;
4. set target to `published`;
5. set publication/archival timestamps consistently;
6. commit.

A partial publication state must not be observable.

A partial unique index on `assessment_types(family_id) where status = 'published'` is required as a database invariant.

## 7. Immutability enforcement

UI-only protection is insufficient.

Database enforcement must cover:

### `assessment_types`

Once status is `published` or `archived`:

- title/description/configuration cannot be changed;
- family cannot be changed;
- version cannot be changed;
- slug compatibility fields cannot be changed through normal admin update;
- child-definition mutation cannot be used to alter the version.

The only allowed lifecycle transition is the explicitly supported publication transition:

- `draft -> published`
- `published -> archived`

The publication operation must be the controlled path for those transitions.

### Version-owned child tables

For:

- axes
- questions
- options
- traps
- assessment_assets
- insights_mapping

database triggers must reject INSERT/UPDATE/DELETE when the owning assessment version is not `draft`.

This gives the immutability rule a database boundary rather than relying only on the dashboard.

Supabase's current database guidance supports database triggers for row-level enforcement and recommends keeping security controls in database migrations. citeturn1search8turn0search1

## 8. Public runtime

Current public runtime is slug-based and currently resolves slug directly to `assessment_types`.

P2 changes the resolution to:

`assessment_key/slug -> assessment_families -> published assessment_types -> version definition`

The Edge Function must:

- resolve family by stable slug;
- require exactly one published version;
- return that version's safe content;
- create access/session records against that concrete version ID.

After session creation, all runtime reads use the session/access concrete `assessment_type_id`.

The caller never supplies a version as an authority override.

## 9. Session binding

At session creation:

- family is resolved from the stable public slug;
- current published version is resolved;
- `sessions.assessment_type_id` stores that concrete version;
- `sessions.assessment_version` stores the version number.

The existing session version pinning is retained and becomes meaningful because `assessment_type_id` itself becomes immutable.

An in-progress session must never be re-resolved through the family's current version.

## 10. Protected assessment access

`assessment_session_access.assessment_type_id` remains the concrete version reference.

`assessment_settings.assessment_key` and `assessment_users.assessment_key` remain stable public-family keys.

The protected authentication path must resolve the stable family slug to the current published concrete version before creating the access/session record.

Existing authentication behavior remains otherwise unchanged.

## 11. Historical results

No mandatory snapshot duplication is required for P2.

The authoritative historical chain becomes:

`session -> assessment_type(version) -> immutable definition graph`

Existing `historical_snapshots` remains available for future export/audit use, but it is not a substitute for immutable version ownership.

Existing completed sessions remain untouched.

## 12. Admin UX

The dashboard must change from "edit a published assessment row" to:

- assessment family list;
- current published version;
- create new draft version;
- edit draft;
- publish draft;
- show previous versions/history;
- archive behavior handled by publishing a replacement version.

The stable slug is shown as the assessment's public identity.

No version information needs to be exposed to assessment users.

Existing duplicate workflow should be converted into "Create new version" rather than creating another public assessment with a new slug.

## 13. Migration safety

The repository and remote Supabase migration histories currently differ.

Verified remote history ends at:

`20261001083056_p1_e_fix_answers_upsert_conflict`

The repository additionally contains later P0/P1 migration files whose resulting live objects are already present.

The local duplicate answer migration `20261001083200_p1_e_fix_answers_upsert_conflict.sql` overlaps a remote migration with a different timestamp and must not be pushed as-is.

Before P2 migration deployment:

1. reconcile local/remote migration history;
2. prove the live schema already contains the changes represented by the unmatched repository migrations;
3. mark already-applied migrations in remote history only through the supported migration-repair workflow;
4. remove or reconcile duplicate local migration files so they cannot replay an already-applied change;
5. run migration-list verification until local and remote histories are intentionally aligned;
6. only then create/apply the new P2 migration.

Supabase documents `migration list` for comparison and `migration repair` for correcting tracking history without rerunning SQL. citeturn0search0turn0search1turn0search2

No remote migration-history repair has been performed yet.

## 14. Required P2 migration sequence

The implementation should be split into safe phases rather than one opaque production change:

### Migration A — family foundation

- create `assessment_families`;
- add `family_id` to `assessment_types`;
- populate five families;
- attach current versions;
- add family/version uniqueness;
- add published-version uniqueness;
- add indexes;
- do not remove compatibility fields until runtime/admin code is ready.

### Application transition

- change Edge Function public resolution to family → published version;
- change admin dashboard to family/version workflow;
- change admin RPCs;
- change protected access resolution;
- change duplicate workflow into version creation.

### Migration B — enforcement

- add immutable-version triggers;
- enforce lifecycle rules;
- finalize slug compatibility/removal;
- add any required family references/indexes.

### Migration C — cleanup

Only after runtime verification:

- remove obsolete direct version-by-slug assumptions;
- remove legacy uniqueness/columns that are no longer required;
- remove obsolete admin behavior.

This separation minimizes the risk of breaking the currently working production assessment flow.

## 15. Verification plan

Before production:

### Database tests

- existing five families resolve correctly;
- each has exactly one published version;
- all current version IDs are preserved;
- all existing sessions still point to the same version IDs;
- all child rows remain attached to the same IDs;
- version number is unique within family;
- second published version is rejected;
- published version mutation is rejected;
- archived version mutation is rejected;
- draft mutation succeeds;
- deleting a version referenced by a session is rejected;
- version creation copies the complete definition graph;
- publishing switches the current version atomically.

### Runtime tests

- old stable slug still works;
- new users receive the new published version after publication;
- an existing in-progress session remains on its old version;
- an existing completed result remains unchanged;
- public access never accepts a caller-selected version;
- protected access resolves the stable slug to the current published version;
- answer persistence and completion still work;
- result report still generates.

### Admin tests

- published version cannot be edited directly;
- "new version" creates a draft;
- draft can be edited;
- publish succeeds;
- previous version becomes archived;
- public slug remains unchanged;
- version history is visible to administrators.

### Security tests

- anon cannot mutate version definitions;
- authenticated non-admin cannot mutate version definitions;
- admin operations remain behind `require_admin()`;
- service-role access remains server-only;
- RLS/grants remain consistent with the existing P0/P1 boundary.

Supabase's current guidance emphasizes that RLS and grants jointly determine Data API access and that exposed tables should be protected accordingly. citeturn1search0turn1search5

## 16. Rollout rule

Do not change the live production schema until:

- migration provenance is reconciled;
- the additive family migration has been tested;
- the runtime/admin transition is ready;
- rollback/forward-recovery behavior is defined;
- the existing production assessment flow has a verified test path.

## 17. Implementation-readiness decision

**P2 is now IMPLEMENTATION-READY.**

The product decision is resolved.

The architecture is resolved.

The live dependency graph has been inspected.

The existing production data migration path is defined.

The runtime transition is defined.

The database immutability boundary is defined.

The verification plan is defined.

The remaining migration-history discrepancy is explicitly identified as a **pre-deployment operational gate**, not an unresolved product or architecture decision.

**No P2 production schema or runtime implementation has been applied yet.**


---

## Supersession notice — 2026-10-01

This document records the approved P2 implementation-readiness baseline that existed before production implementation. It is retained for traceability and must not be used as the current implementation status.

P2 was subsequently implemented, deployed, and externally verified. The authoritative closure record is `documentation/audit/P2-closure-2026-10-01.md`, and the current project checkpoint is P3 in `documentation/project-audit/02-work-roadmap.md`.
# P2 Design — Assessment Family and Immutable Versions

**Date:** 2026-10-01
**Project:** `core-system-md/clinic-evaluator`
**Stage:** P2-B → P2-C — Approved Architecture → Implementation / Verification
**Status:** **IMPLEMENTED / VERIFIED / CLOSED**
**Owner decision:** **Option B — explicit assessment-family/version model**
**Public identity:** **stable slug/URL across versions**
**User-facing version visibility:** **not required; versioning is internal**

## 1. Owner decision

The approved product behavior is:

- One assessment has one stable public identity.
- Its public slug/URL does not change when a new version is published.
- New versions are internal versions of the same assessment.
- A person taking the assessment does not need to know that a newer version exists.
- New sessions use the currently published version.
- Existing sessions remain bound to the version they started with.
- Completed historical results remain interpretable using the exact immutable version that produced them.

This resolves the P2 architectural boundary identified by the reality audit.

## 2. Canonical domain model

### Assessment family

A new `assessment_families` entity represents the stable assessment identity.

Responsibilities:

- stable UUID identity;
- stable public `slug`;
- stable public URL/key;
- reference to the currently published version;
- family-level lifecycle/metadata that must survive version changes.

The family owns the public identity. It is not itself the question set used by a session.

### Assessment version

The existing `assessment_types` row becomes a concrete immutable version of an assessment family.

Responsibilities:

- one complete definition of the assessment at a point in time;
- version number within its family;
- draft/published/archived lifecycle;
- title/description/configuration for that version;
- the complete related definition graph.

The existing child tables remain relationally attached to `assessment_types.id`:

- axes;
- questions;
- options;
- traps;
- insights mapping;
- assessment assets;
- other assessment-definition records already keyed by `assessment_type_id`.

This reuses the existing relational structure instead of introducing a second copy of all definition tables.

## 3. Public URL and runtime rule

The public slug belongs to `assessment_families`.

Public access flow becomes:

`public slug -> assessment family -> current published version -> immutable assessment definition`

The user does not receive a version-specific URL.

When a new version is published:

- the slug remains identical;
- the public entry point remains identical;
- the family points to the new published version;
- new sessions resolve to the new version;
- existing sessions continue using their already-pinned version.

A version-specific URL is not part of the product contract.

## 4. Session rule

`sessions.assessment_type_id` remains the concrete immutable-version reference.

At session creation:

- resolve the family by public slug;
- resolve the family's current published version;
- store that version's `assessment_type_id`;
- store its numeric `version` in `sessions.assessment_version`;
- retain `scoring_engine_version` as the scoring-engine provenance.

After creation, the session does not re-resolve the family to determine its assessment definition.

Therefore an in-progress session is not silently moved to a newer version.

## 5. Publishing rule

Publishing is a family-level transition.

For one family, at most one version may be the current published version.

Publishing a new version must atomically:

1. validate that the target version belongs to the family;
2. validate that the target definition is complete enough to publish;
3. prevent mutation of the existing published version;
4. mark the previous published version archived;
5. mark the target version published;
6. update the family's current published-version reference.

The operation must be transactional so there is no observable state where the family has two current published versions.

## 6. Immutability rule

A published or archived version is immutable.

This applies to the complete definition graph, not only the parent row.

Therefore after publication, administrative editing cannot modify:

- assessment metadata that affects interpretation;
- axes;
- questions;
- options;
- traps;
- scoring-related mappings;
- insight mappings;
- assets or other version-owned definition records.

To make a change, the administrator creates a new draft version derived from the latest appropriate version.

Draft versions remain editable.

The database is the final enforcement boundary; UI restrictions alone are insufficient.

## 7. Version creation rule

Creating a new version means:

- create a new `assessment_types` row linked to the same family;
- assign the next family-local version number;
- copy the complete version-owned definition graph;
- keep the source version unchanged;
- leave the new version in draft state until explicitly published.

The existing duplication capability is the starting implementation surface, but it must become version-aware and family-aware.

A new version is not a new public assessment.

## 8. Historical-result integrity

Because every session points to an immutable concrete version, a completed result remains tied to the exact definition that produced it.

The existing `historical_snapshots` table is therefore not required as the primary version-integrity mechanism.

It may remain as a future audit/export mechanism, but P2 does not need to populate it merely to compensate for mutable assessment definitions.

This avoids maintaining two competing sources of truth for the assessment definition.

## 9. Existing production-data migration

Current production has five assessment definitions and all current sessions are version 1.

Migration strategy:

1. create one family for each existing assessment;
2. assign the existing assessment row to its family;
3. preserve its current slug as the family's stable public slug;
4. treat the existing row as version 1;
5. mark that row as the family's current published version where the current assessment is actually published;
6. preserve every existing `assessment_type_id` so sessions, answers, scores, leads, access records, and related data remain valid;
7. do not rewrite existing session/result ownership;
8. do not create artificial historical versions for data that does not exist;
9. preserve existing in-progress sessions on their current version.

The migration must be designed so existing public URLs continue resolving to the same assessment family without user-visible interruption.

## 10. Slug and compatibility strategy

The current system uses `assessment_types.slug` in several places.

During implementation, these call sites must be reconciled so that:

- `assessment_families.slug` becomes the canonical public key;
- `assessment_types.id` remains the canonical concrete-version key;
- internal/admin APIs stop assuming slug uniquely identifies a concrete version;
- assessment settings and assessment-user authentication continue using the stable family slug;
- `assessment_session_access.assessment_type_id` continues to pin the concrete version.

Whether the legacy `assessment_types.slug` column is retained as a compatibility field or removed must be decided from the complete call-site inventory during implementation. It must not remain ambiguous as a second source of public identity.

## 11. Admin behavior

The admin dashboard should present the family as the assessment the administrator manages.

Normal workflow:

- open assessment by stable slug/family;
- view current published version;
- edit only a draft version;
- create a new draft from the current version when a published assessment needs changes;
- publish the new draft;
- old published version becomes archived;
- public URL remains unchanged.

The administrator does not need to manually choose a version for ordinary public assessment access.

Version history can be exposed as an administrative capability, but it is not required for public users.

## 12. Runtime behavior

The Edge Function currently resolves public assessment access by slug and then loads the assessment definition.

P2 implementation must change this resolution so the slug first resolves to the family and then to the family's current published version.

All subsequent runtime operations use the concrete version ID already bound to the session/access record.

This prevents a session from switching definition mid-assessment.

## 13. Security and integrity requirements

The implementation must preserve existing P0/P1 boundaries.

Additional P2 requirements:

- family and version writes remain admin-authorized;
- public users cannot create or publish versions;
- published/archived version mutation is rejected at the database boundary;
- version lineage cannot cross assessment families;
- version numbers are unique within a family;
- a family cannot have more than one current published version;
- deleting a version referenced by sessions/results must be prevented;
- the stable family slug remains unique;
- the public runtime never accepts a caller-supplied version as an authority override.

Supabase's current guidance continues to support using migrations for production schema changes and keeping remote migration history aligned with repository migrations. citeturn0search0turn0search1

## 14. Implementation sequence

Implementation will follow:

`DESIGN -> MIGRATION SAFETY CHECK -> SCHEMA -> ADMIN VERSION WORKFLOW -> RUNTIME RESOLUTION -> SESSION PINNING -> VERIFICATION -> PRODUCTION DEPLOYMENT -> CLOSURE`

Before applying the production migration:

1. reconcile the live/repository migration provenance sufficiently to avoid replaying or losing existing changes;
2. inventory every current `assessment_types.slug` caller;
3. verify all five current assessment definitions and their relationships;
4. design the migration as additive-first where possible;
5. verify existing sessions/access records remain attached to the same concrete assessment IDs;
6. test creation, editing, publishing, session pinning, and historical-result behavior.

## 15. Non-goals

P2 does not:

- expose version numbers to assessment users;
- change the public URL when a version changes;
- rewrite completed results;
- require historical JSON snapshots as the primary source of truth;
- change scoring-engine versioning beyond preserving existing provenance;
- upgrade Supabase from Free.

## 16. Acceptance criteria

P2 is complete only when all are true:

- one stable family exists per existing public assessment;
- public slug remains stable across versions;
- exactly one current published version exists per active family;
- published and archived versions cannot be mutated;
- draft versions can be edited;
- publishing a new version does not alter old sessions/results;
- new sessions use the new published version;
- in-progress sessions continue on their original version;
- completed results remain tied to the exact immutable version;
- public runtime resolves slug -> family -> current published version;
- admin version creation/publishing works end-to-end;
- existing production assessment access remains functional;
- migration history is reconciled/documented;
- security advisors and runtime E2E verification pass.

## 17. Current status

**Owner decision: APPROVED — Option B + stable public URL.**

**Architecture design: ESTABLISHED.**

**Implementation: NOT STARTED.**

The next step is implementation-readiness verification and migration design against the live dependency graph. No production schema change is authorized merely by this document until that verification is complete.


## 18. Final implementation and closure record — 2026-10-01

The architecture in this document was implemented in production. The implementation introduced the explicit assessment-family/version model, stable public slug resolution, concrete session version pinning, database immutability enforcement, admin version creation/publishing controls, and runtime resolution through the current published family version.

Key production migrations included `20261001100633_p2_assessment_family_versions.sql`, `20261001100833_p2_admin_status_guard.sql`, `20261001101014_p2_immutability_trigger_fix.sql`, and `20261001104100_p2_score_weight_precision.sql`, alongside the reconciled prerequisite migration history.

External verification was completed through GitHub Actions run `36850588686` (run #6) against the production Edge Function. The verified path covered catalog, content, public access, session creation, answer persistence, completion, idempotent completion, and invalid-token rejection.

The E2E process also discovered and fixed two production issues before closure: a runtime family-reference error in `loadAssessment`, and a numeric precision mismatch for `scores.weight` / `scores.weighted_score`.

**Acceptance clarification:** runtime E2E is passing. Supabase Security Advisor is not completely warning-free because previously documented admin SECURITY DEFINER/RLS helper findings remain accepted operational constraints; this does not invalidate the P2 runtime/versioning closure.

**Closure state:** P2 is CLOSED. The original design sections above remain the approved architectural baseline; the implementation-readiness statements that said production implementation had not started are superseded by this closure record.
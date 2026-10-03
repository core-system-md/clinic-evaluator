# P5 — Assessment Published-Content Lifecycle Correction
## 2026-10-04

**Status:** EXECUTION SPECIFICATION / OWNER-DIRECTED IMPLEMENTATION  
**Project:** `core-system-md/clinic-evaluator`  
**Supabase:** `oaqpzaarppccbnepffxx`  
**Canonical branch:** `main`  
**Scope:** Correct the assessment editing lifecycle after P3/P4 investigation, without reopening P0–P4 or changing report text/Q1–Q4.

## 1. Governing rule

The assessment lifecycle is:

`DRAFT` → fully editable  
`PUBLISHED` → editorial content may be edited directly; measurement/structure may not  
`ARCHIVED` → immutable historical record  
`COPY` → creates a new independent Draft

A Published assessment is not globally immutable.

Only changes that can alter the assessment's measurement definition, structure, or calculation behavior require a new Draft/version.

The system does not attempt to judge whether edited natural-language text is semantically appropriate. That decision belongs to the Owner/delegated assistant under the existing permission model.

## 2. Change classification

### 2.1 Direct edit on Published

The following are editorial-only and may be changed on the current Published version:

**Assessment metadata**
- `title_ar`
- `title_en`
- `description`

**Axis presentation**
- `title`
- `title_ar`
- `description`

**Question presentation**
- `question_text`
- `question_text_ar`

**Option presentation**
- `label`
- `label_ar`
- `display_text`
- `display_text_ar`

These edits retain the same Family, concrete version ID, public pointer, and scoring definition.

### 2.2 New Draft/version required

Any operation that can change the measured construct, structure, or calculation must not modify the Published version.

Examples:

- add/remove question;
- change question-to-axis relationship;
- change question type;
- change required/ordering semantics when they alter the assessment structure;
- add/remove option;
- change `option_value`;
- change option identity/index when it changes interpretation;
- change axis weight;
- change axis membership;
- change calculation configuration;
- change KPI/role mappings;
- change trap/calculation configuration;
- any other measurement-sensitive mapping.

The correct operation is:

`Published` → `create working copy` → edit Draft → validate → publish.

## 3. Database enforcement

The database remains the final authority.

Published rows must reject all protected-field mutation.

Published rows may accept only the editorial field changes listed in §2.1.

Child relationships remain protected:
- question must remain under its existing axis and assessment;
- option must remain under its existing question;
- no child insert/delete is allowed against Published.

Direct table write access remains closed to `authenticated`; all material changes use named secured operations.

## 4. Canonical secured operations

New/updated operations:

- `update_published_assessment_content_secure`
- `update_published_axis_content_secure`
- `update_published_question_text_secure`
- `update_published_option_text_secure`

Existing structural operations remain Draft-only:

- `save_axis_secure`
- `save_question_secure`
- `add_option_secure`
- `delete_option_secure`
- other structural child operations

The legacy `save_assessment_secure` operation remains a compatibility boundary, but when asked to save a Published assessment it may update only the approved assessment-level editorial fields; publication/status changes remain separate.

## 5. Admin behavior

The Admin editor must open the selected Published version itself.

The Edit button must never create a Draft as a side effect.

The explicit **نسخة عمل جديدة** operation remains the deliberate mechanism for structural changes.

The editor must visibly distinguish:
- fields that can be edited directly on Published;
- structural controls that are unavailable on Published and require creating a working copy.

For a Draft, all existing structural editing controls remain available.

## 6. Version/family behavior

A content-only Published edit:
- keeps the same Family;
- keeps the same concrete version ID;
- keeps the same public key;
- does not create a new version;
- does not change the current public pointer.

A structural/calculation change:
- creates a new concrete version in the same Family;
- leaves the current Published version untouched until publication;
- becomes public only when published;
- causes the previous current Published version to become historical according to the established lifecycle.

Internal numeric versions remain implementation metadata and are not a public product concept.

## 7. Sessions and results

P2/P4 version pinning remains unchanged.

A new structural version affects new sessions after publication.

Existing sessions remain attached to the concrete assessment version they were created against.

Content-only edits do not alter scoring rules and therefore do not trigger result recalculation.

Canonical Structured Result remains the authoritative saved result. Historical results are never rewritten automatically.

This correction does not redesign report text or Q1–Q4.

## 8. Existing production data

Current live production contains extra Draft records created by the previous Edit behavior. These are treated as data to reconcile, not as a reason to change the lifecycle contract.

Deletion is allowed only for a true Draft with no:
- sessions,
- results,
- leads,
- protected references.

No automatic bulk deletion is part of this implementation.

## 9. Audit

Every successful Published content edit must create one meaningful Admin audit event identifying:
- actor;
- operation;
- target;
- family;
- before values;
- after values.

Secrets are never recorded.

Structural copy/publication lifecycle continues using the existing audit path.

## 10. Verification acceptance matrix

1. Open Published → no Draft is created.
2. Edit Published title/description → same version ID.
3. Edit Published question text → same version ID.
4. Edit Published option label/display text → same version ID.
5. Attempt Published option score change → rejected.
6. Attempt Published option insert/delete → rejected.
7. Attempt Published question insert/delete → rejected.
8. Attempt Published axis weight change → rejected.
9. Create working copy → new Draft in same Family.
10. Draft structural edits → succeed.
11. Publish Draft → new version becomes public.
12. Stop public → no current public version.
13. Restore historical Published version → selected historical version becomes public without content mutation.
14. Draft with no execution history → permanent delete succeeds through secure operation.
15. Draft with execution history → permanent delete rejected.
16. Existing session/result provenance remains unchanged.
17. Public Family URL remains unchanged.
18. Owner and delegated permissions remain enforced server-side.

## 11. Explicit non-goals

This implementation does not:
- modify P3 scoring semantics;
- change the Structured Result contract;
- redesign the public assessment UI;
- redesign report prose;
- revisit Q1–Q4;
- add semantic/AI text analysis;
- rewrite historical results.

## 12. Implementation order

1. Commit this execution specification.
2. Update Database lifecycle guards and secured Published-content operations.
3. Update Admin editor behavior and controls.
4. Reconcile the previously committed draft-deletion path with live migration history.
5. Run database verification queries and lifecycle tests.
6. Run repository test suite.
7. Review diff and PR.
8. Merge to `main`.
9. Verify Cloudflare production deployment.
10. Re-run production-safe verification.
11. Hand the live system to the Owner for manual acceptance.
12. Close P5 lifecycle correction only after Owner acceptance.

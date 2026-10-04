# P5 — Editor Lifecycle & Data Reconciliation
## 2026-10-04

**Status:** OWNER-REPORTED CORRECTION / IMPLEMENTATION BASIS  
**Scope:** P5 Admin editor workflow and lifecycle presentation only. P0–P4 remain closed.

## 1. Evidence

Production Supabase currently contains, for `comprehensive-clinic-assessment`:
- current Published version: v10;
- one active Draft: v14;
- one Archived historical version: v1.

Draft v14 currently contains:
- 7 axes;
- 38 questions;
- 109 options.

The question/option graph is therefore present in the database; the Owner-reported missing questions/options are primarily an editor loading/presentation/workflow problem and must not be treated as data loss without server evidence.

## 2. Lifecycle contract

### Draft
Fully editable. Allowed lifecycle actions:
- Edit;
- Validate;
- Publish;
- Permanent delete only when there is no protected execution history.

Not allowed/presented as Draft lifecycle actions:
- Archive;
- Stop public;
- Working-copy creation from itself;
- Paid/public-access lock.

### Published
Editorial text may be edited directly.
Structural/measurement/calculation changes require:
Published → Working Copy → Draft edit → Validate → Publish.

Allowed lifecycle actions:
- Edit;
- Create Working Copy;
- Stop Public.

Paid-access management is a separate access-management concern and must not be rendered as a universal action on every lifecycle row.

### Archived
Historical and immutable.
It must not appear in the active assessments list.
It belongs in a dedicated Archive view.
Allowed actions:
- View read-only;
- Restore to public through the secure lifecycle operation;
- optional Working Copy creation only where explicitly exposed as a deliberate historical-copy operation.
No Draft deletion or structural editing.

## 3. Confirmed implementation defects

1. The active assessment table renders Working Copy creation for every row, including Drafts.
2. The active assessment table renders paid-access lock controls for Drafts.
3. Archived versions are left `is_active=true` by the stop-public RPC, while the UI filters only by `is_active`; therefore archived records remain in the active table.
4. `editAssessment`, `createNewAssessment`, and `saveAssessment` are implemented in both `assessment-lifecycle.js` and `assessment-editor-workspace.js`; the latter overrides the former because it is loaded later. This creates competing responsibility and must be consolidated.
5. The workspace question editor renders only the selected question, so options for other questions are not simultaneously visible.
6. Draft option creation reads the entire `options` collection and filters client-side instead of querying the target question directly.
7. Persistence feedback is split between Toast and workspace status without a single operation/result contract.

## 4. Correction principles

- One lifecycle source of truth in the Admin UI.
- One editor controller for workspace navigation/loading/persistence state.
- Server-authoritative mutation remains unchanged.
- No direct protected-table privilege expansion.
- Every successful mutation is followed by authoritative refresh/read-back.
- Every failed mutation explains operation, target, reason, persistence result, and next action.
- Question view renders every question of the selected axis and every option belonging to each question.
- Active and Archived assessment collections are separate.
- Lifecycle actions are status-specific and never duplicated generically.

## 5. Acceptance matrix

### Draft
1. Open Draft without creating another Draft.
2. See every axis.
3. Select an axis and see every question under it.
4. See every option under every visible question.
5. Add a question and see it immediately after server-confirmed refresh.
6. Add an option to any question and see it under that exact question after refresh.
7. Edit/delete question and option successfully.
8. Save calculation configuration and see server-confirmed state.
9. Validate and publish.
10. Delete a Draft with no protected execution history successfully.

### Published
1. Open Published without creating a Draft.
2. Edit only approved editorial fields directly.
3. Structural controls clearly state that a Working Copy is required.
4. Create Working Copy only by explicit action.

### Archived
1. Archived version is absent from active list.
2. Archived version appears under Archive.
3. Open is read-only.
4. Restore uses `restore_public_assessment_secure`.
5. No Draft delete action is shown.

### Access
Paid/free access controls are shown only where the assessment is a valid public-access target, never as a universal lifecycle action.

## 6. Non-goals

No changes to:
- P2 family/version architecture;
- P3 scoring/interpretation;
- P4 session/result provenance;
- report text;
- Q1–Q4;
- security/RLS boundaries.


## 7. Implemented on this correction branch

- Active assessment table now contains only Draft and Published records.
- Archived records are rendered in a dedicated Archive section.
- Draft rows expose only Edit / Publish / Delete.
- Published rows expose Edit / Working Copy / Stop Public.
- Paid-access controls are not presented as Draft lifecycle actions.
- Workspace questions now render all questions for the selected axis and all options for each question.
- Option creation queries only the target question and uses question-scoped input controls.
- Duplicate lifecycle prototypes for edit/create/save were removed from `assessment-lifecycle.js`; the workspace controller owns those responsibilities.
- Editor asset cache-busting versions were incremented.


## Owner clarification — visibility is not archive

Stop Public and Archive are separate operations.

- Stop Public: published remains published; only `is_active=false`.
- Resume Public: published remains published; `is_active=true`.
- Archive: only a stopped published version may be moved to `archived`.
- Archived versions remain historical/read-only.

The correction adds secure resume/archive RPCs and a dedicated stopped-public UI section. It does not introduce a new lifecycle state.

## Option-addition correction

The browser no longer calculates option indexes/orders from a client-side options query. The secure `add_option_secure` RPC locks the question row, enforces the five-option limit, allocates the next index/order server-side, and returns the created option id. This directly removes the observed 409 duplicate `(question_id, option_index)` failure mode.

## Transient report loading state

The report-details modal no longer remains indefinitely on its loading message when the target record is missing or report processing fails; those terminal error states are replaced with a message and automatically closed. Successful report content remains available for manual reading.

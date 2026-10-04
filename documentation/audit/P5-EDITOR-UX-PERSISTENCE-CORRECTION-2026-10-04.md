# P5 — Editor Workspace UX + Persistence Correction Audit
## 2026-10-04

**Project:** `core-system-md/clinic-evaluator`  
**Supabase:** `oaqpzaarppccbnepffxx`  
**Branch:** `fix/p5-editor-workspace-ux-delete-2026-10-04`  
**Status:** IMPLEMENTED ON BRANCH — VERIFY BEFORE MERGE

## 1. Owner-reported failures

The live P5 editor was manually rejected because:
- the editor was too cramped on phone and desktop;
- assessment selection/editing context was difficult to understand;
- successful saves did not make the persistence location/state obvious;
- error messages lacked operation and cause context;
- the workflow itself was difficult to operate.

This is treated as a workflow failure, not a cosmetic CSS issue.

## 2. Root causes found

### 2.1 Editor containment
The workspace coexisted visually with the Admin dashboard because `editor-mode` was applied but the dashboard had no rule to disappear. The workspace also retained modal semantics and dense controls.

### 2.2 Information density
Questions/options were rendered using dense multi-column grids. A production-sized assessment can contain dozens of questions and more than one hundred options, making the grid unsuitable for narrow screens and cognitively heavy on desktop.

### 2.3 Persistence feedback
Several atomic mutations returned to the editor through `editAssessment()`, but the user-facing feedback mixed Toasts with local/dirty state. The UI did not consistently identify operation, target, persisted state, and server-confirmed timestamp.

### 2.4 Error communication
Raw Supabase/RPC messages were exposed directly in places where an Arabic explanation plus next action was needed.

### 2.5 Draft deletion database defect
A real Owner-authenticated call to `delete_assessment_draft_secure()` on Draft `comprehensive-clinic-assessment--v14` failed with:
`Published or archived assessment structure is immutable`.

The failure occurred during the parent delete cascade into `axes`, after the parent row was no longer visible as a Draft to the immutability trigger.

The fix deletes Draft-local children explicitly while the parent remains a Draft, then deletes the parent.

The fix was reproduced successfully inside a transaction; the real Draft was rolled back and remains present.

### 2.6 Archived editor coverage
The workspace originally blocked archived versions entirely. That violated the P5 historical/read-only requirement. Archived versions are now loadable for inspection, with all mutation controls suppressed and a clear “Archive — read only” state. The lifecycle action exposed there is restore-to-public through the existing secure RPC.

### 2.7 Calculation contract mismatch
The P5 completeness RPC previously required every EV mapping value to be an object. The live assessment data and the canonical scoring engine use `ev_mappings: Record<Role, number>`.

The editor previously serialized scalar EV values as JSON and attempted to parse them as objects, so Calculation → Save could fail on valid live data.

The correction:
- validates EV values as non-negative numbers;
- renders EV as Role → numeric weight fields;
- leaves KPI mappings as Role-weight JSON objects.

No P3 scoring behavior was changed.

## 3. Implemented editor model

The editor is now a persistent full-width workspace that replaces the dashboard while active.

Header:
- assessment title;
- Family;
- Draft/Published state;
- diagnostic version;
- counts;
- breadcrumb context;
- dirty state;
- last server-confirmed save;
- Draft delete action where permitted.

Navigation:
- Overview;
- Structure;
- Questions;
- Calculation;
- Validation & Publication.

Responsive model:
- desktop split-pane editing;
- mobile stacked hierarchy;
- no tiny option grid;
- larger controls;
- persistent bottom operation status.

## 4. Persistence contract

A successful mutation is only represented as successful after the existing secure RPC completes and the editor re-reads the relevant server state.

Workspace status communicates:
`[operation] → [target] → [result/reason] → [next action]`

Errors are normalized into actionable Arabic messages where known.

## 5. Security/lifecycle preservation

No broad table privileges were added.

Existing capability gate remains:
`assessment.edit`

Draft/Published/Archived lifecycle rules remain unchanged.

Published structural/calculation changes still require a working copy.

## 6. Verification performed

- JavaScript parsing via `new Function()`: PASS for changed Admin JS files.
- Workspace structural/wiring checks: PASS.
- Cloudflare Pages preview deployments for branch commits: PASS.
- `delete_assessment_draft_secure()` Owner-authenticated transaction test: PASS, then rollback.
- `update_draft_calculation_config_secure()` with canonical numeric EV shape: PASS, then rollback.
- Existing live Draft `v14` was not deleted or mutated by the tests.

## 7. Remaining acceptance

P5 must remain OPEN until:
1. final branch is merged;
2. Cloudflare production is verified against the final merge commit;
3. Owner manually tests the complete editor on desktop and phone;
4. Owner confirms save location/state, error clarity, and draft deletion behavior are correct.

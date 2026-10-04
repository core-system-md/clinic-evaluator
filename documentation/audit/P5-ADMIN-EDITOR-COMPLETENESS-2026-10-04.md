# P5 — Admin Editor Completeness Investigation & Correction
## 2026-10-04

**Project:** `core-system-md/clinic-evaluator`  
**Supabase:** `oaqpzaarppccbnepffxx`  
**Branch:** `fix/p5-admin-editor-completeness-2026-10-04`  
**Scope:** P5 Admin editor completeness only. P0–P4 and Q1–Q4 are not reopened.

## 1. Owner acceptance finding

The live Admin dashboard is reachable and the session-count security correction is working. Manual inspection then exposed a second class of defects: the editor reports successful changes, but the editing surface is incomplete and some controls do not reflect the actual lifecycle contract.

This is a real implementation gap, not a change to the approved lifecycle.

## 2. Verified evidence

### 2.1 Duplicate/invalid deletion controls

The live Admin table showed:
- Draft rows with both `حذف المسودة` and `شطب`.
- Archived rows with an invalid `شطب` action that routes to a Draft-only deletion RPC.

The corrected UI has exactly one permanent-delete action for a true Draft. Archived Published history has no permanent-delete action.

### 2.2 Draft data was actually being written

Live database verification after the Owner's manual test showed:
- Draft `comprehensive-clinic-assessment--v14` exists.
- It has 8 axes, 36 questions and 108 options.
- Two newly added test axes exist in the database.
- The edited question has an updated timestamp.
- The newly added option exists.
- Corresponding Admin audit events were recorded as successful.

Therefore the reported "phantom" behavior was not evidence that every write failed. The editor did not provide a sufficiently reliable read-after-write/refresh experience and did not expose the full configuration needed to manage the resulting structure.

### 2.3 Missing Draft configuration controls

The previous editor did not expose:
- axis weight editing;
- axis display order editing;
- axis-to-role configuration;
- question display order / required / trap configuration;
- option index/order/trap configuration;
- dedicated Draft question/axis deletion;
- complete calculation mapping configuration;
- a single explicit save path for the calculation configuration.

The previous new-axis/new-question operations also hard-coded `weight=10` and `display_order=1`, which is not a complete editor.

## 3. Correct P5 rule

A Draft is fully editable.

A Published assessment:
- may receive approved editorial text changes directly;
- must not receive structural or calculation changes;
- must use a new Draft for structural/calculation changes.

An Archived Published version is historical and immutable. It is not a Draft and must not expose Draft deletion.

## 4. Implemented correction

The correction adds secure Draft-only operations for:
- full axis editing including weight/order;
- full question configuration editing;
- full option configuration editing;
- question deletion;
- axis deletion;
- calculation configuration (`axis_roles`, `kpi_mappings`, `ev_mappings`);
- permanent Draft deletion without incorrectly blocking independent copied Drafts.

The Admin editor now refreshes from the database after successful writes instead of leaving the user on a stale-looking editor state.

New structural items receive the next display order instead of forcing order 1.

## 5. Security boundary

All material changes remain behind authenticated, capability-checked SECURITY DEFINER operations. Direct authenticated table writes are not opened merely to make the UI work.

The session-table read fix remains server-side and is not relaxed.

## 6. P3 boundary that must not be misrepresented

The Admin field `options.option_value` is retained as an editable stored field for the existing assessment model, but it is **not** reclassified as the canonical P3 interpretation anchor.

P3's interpretation registry remains the authoritative interpretation/scoring contract already closed under P3. This P5 correction does not reopen P3 or rewrite that registry.

Accordingly, the editor must not claim that changing `option_value` alone changes the P3 canonical anchor.

## 7. Acceptance matrix

1. Draft shows exactly one permanent-delete action.
2. Archived version shows no Draft-delete action.
3. Draft axis can change title, weight and order.
4. Draft question can change text, order, required state and trap index.
5. Draft option can change text, stored value, index, order and trap state.
6. Draft axis/question/option additions appear after the operation.
7. Draft question/axis deletion is available and secure.
8. Calculation configuration is editable only on Draft.
9. Published editorial text remains directly editable.
10. Published structural/calculation controls remain unavailable.
11. Successful changes are read back from the database.
12. Audit events are written.
13. No direct `authenticated` access to protected structural tables is opened.
14. P0–P4 and Q1–Q4 remain outside scope.

## 8. Closure condition

P5 remains open until the Owner completes manual acceptance on the live production Admin editor and confirms that the corrected lifecycle/editor behavior is correct.

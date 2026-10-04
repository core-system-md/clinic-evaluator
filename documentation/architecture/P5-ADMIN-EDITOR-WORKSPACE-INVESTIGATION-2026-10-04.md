# P5 — Admin Editor Workspace Investigation
## 2026-10-04

**Repository:** `core-system-md/clinic-evaluator`
**Supabase:** `oaqpzaarppccbnepffxx`
**Baseline:** `35d12539ac9d8f7abbfeef4e02ab701fc7299c2a`
**Scope:** Admin assessment editor workspace only.
**Status:** INVESTIGATION COMPLETE — OWNER DECISION REQUIRED BEFORE DESIGN/IMPLEMENTATION.

## 1. Executive finding

The current P5 backend lifecycle and secure mutation layer are materially richer than the current editor surface can present safely and clearly.

The principal defect is now the **interaction model**:

- the editor is a modal;
- the modal contains assessment metadata, lifecycle information, all axes, all questions, all options, and calculation mappings;
- structural operations are distributed across many immediate-save controls;
- several operations reload/reopen the same modal after success;
- success is communicated primarily through a short toast;
- failures are reduced to a generic operation prefix plus raw database/RPC error text;
- the selected assessment context is not persistent outside the modal title;
- the user has no durable workspace-level save/status surface.

This explains why a backend write can succeed while the Owner still cannot confidently answer "what changed, where was it saved, and is it persisted?"

## 2. Repository evidence

### 2.1 Current editor is a single modal

`admin/admin.html` defines `#assessment-modal` with a maximum width of 850px and 95% width.

Its body combines:
- Arabic/English title;
- description;
- lifecycle state;
- traps/simulator;
- the complete axis/question/option tree;
- calculation configuration;
- Save/Cancel actions.

The structural content container is capped at approximately 280px vertical height.

This is a hard information-density bottleneck, especially for a definition graph with dozens of questions/options.

### 2.2 Current production data demonstrates the scale

Current Draft:
- slug: `comprehensive-clinic-assessment--v14`
- status: Draft
- family: `comprehensive-clinic-assessment`
- axes: 8
- questions: 37
- options: 108

Calculation configuration currently contains:
- 6 axis-role keys;
- 8 KPI mapping keys;
- 5 EV mapping keys.

Therefore the modal is not handling a small form; it is handling a full assessment authoring workspace.

### 2.3 Save model is fragmented

The current editor uses separate operations for:
- assessment metadata;
- axis update;
- question update;
- option update;
- axis/question/option creation;
- axis/question/option deletion;
- calculation configuration;
- published editorial updates.

Most successful operations immediately call `editAssessment()`, which:
1. rereads the assessment;
2. rereads axes;
3. rereads questions;
4. rereads options;
5. rerenders the modal;
6. leaves the user with a toast as the main confirmation.

This creates a technically valid but cognitively weak workflow.

### 2.4 Add operations still use browser prompts

Current editor uses `prompt()` for:
- new axis;
- new question;
- new option value;
- new option label;
- new KPI mapping;
- new EV mapping.

This prevents the workspace from presenting validation, context, field explanation, unsaved state, and structured error handling consistently.

### 2.5 Error reporting is operation-level, not workspace-level

Examples include:
- `فشل حفظ المحور: ...`
- `فشل حفظ السؤال: ...`
- `فشل حفظ الخيار: ...`
- `فشل حفظ الإعدادات الحسابية: ...`

The UI does not maintain a durable operation result containing:
- target;
- operation;
- persisted/not persisted;
- server reason;
- next action;
- last successful save timestamp.

### 2.6 Published/Draft semantics are already enforced

The current code correctly distinguishes:
- Draft structural editing;
- Published editorial editing;
- Published structural changes through working-copy creation;
- Archived historical state.

The new UI must expose this existing contract clearly rather than changing it.

## 3. Production evidence

Live Supabase verification shows:
- the v14 Draft exists;
- the current family has a stable public published version separate from v14;
- successful editor audit events exist for axis/question/option and working-copy operations.

In the last 24 hours for the family, successful assessment events included:
- 13 working-copy creations;
- 2 axis additions;
- 1 question addition;
- 1 option addition;
- 1 question edit;
- 1 option deletion;
- 3 public restores;
- 12 status changes.

This is strong evidence that the Admin lifecycle is being exercised and that the editor must provide durable state/context rather than relying on transient toasts.

## 4. Security boundary

No editor redesign should grant broad table privileges.

The current family read path is capability-controlled for authenticated Admin users, and protected structural writes are performed through secure RPCs.

The redesign must preserve:
- server-side capability checks;
- Owner-only lifecycle operations;
- no browser-only security;
- no direct broad mutation of protected tables.

Current Supabase advisors still report the known authenticated SECURITY DEFINER/RLS/performance findings. These are not a reason to redesign the editor by weakening authorization.

## 5. Requirements derived from evidence

The workspace must provide:

1. Persistent assessment identity.
2. Persistent lifecycle badge.
3. Clear indication of whether the user is editing a Draft or Published editorial content.
4. Hierarchical navigation:
   `Assessment → Axis → Question → Option`.
5. Focused editing area rather than rendering the entire graph at once.
6. Clear dirty/unsaved state.
7. Explicit save state.
8. Last successful persistence timestamp.
9. Operation result with target and persisted state.
10. Structured, contextual errors.
11. Mobile operation without horizontal table-style editing.
12. Desktop use of available width.
13. Calculation configuration isolated from content editing.
14. No new lifecycle semantics.
15. No frontend framework rewrite solely for this problem.

## 6. Alternatives

### Alternative A — Dedicated full-page editor + section navigation

Structure:
- persistent header;
- assessment identity/lifecycle;
- left/side navigation on desktop;
- stacked navigation on mobile;
- one focused section at a time;
- sticky save/status area.

Strengths:
- strongest context retention;
- best desktop/mobile adaptability;
- easiest to make state and save status explicit;
- scales to large assessment graphs.

Weaknesses:
- larger structural change to current Admin page;
- requires careful navigation state management.

### Alternative B — Desktop split-pane / mobile stacked workspace

Structure:
- assessment/axis/question tree on one side;
- selected entity editor on the other;
- mobile collapses into tree → editor navigation.

Strengths:
- excellent for hierarchical content;
- efficient for repeated question/option editing;
- preserves context while editing.

Weaknesses:
- more complex responsive behavior;
- can become cramped on medium-width screens;
- calculation configuration still needs a separate focused section.

### Alternative C — Step/section wizard

Structure:
- Details → Structure → Questions → Options → Calculation → Validation → Publish.

Strengths:
- simple conceptual flow;
- clear completion sequence.

Weaknesses:
- poor for revisiting arbitrary questions;
- inefficient for large existing assessments;
- risks making normal maintenance feel like a linear setup process.

### Alternative D — Hybrid persistent workspace

Structure:
- dedicated editor screen;
- persistent assessment header;
- section navigation;
- focused content editor;
- desktop can use split-pane where space permits;
- mobile uses stacked navigation;
- dedicated Calculation section;
- dedicated Validation/Publish section;
- persistent Save/Status bar.

Strengths:
- combines the strongest parts of A and B;
- preserves context;
- scales to large definitions;
- supports efficient desktop editing without sacrificing mobile;
- gives a natural place for save/error/persistence status.

Weaknesses:
- highest design complexity;
- requires more frontend refactoring than a modal replacement.

## 7. Evaluation

| Criterion | A | B | C | D |
|---|---:|---:|---:|---:|
| Large assessment scalability | High | High | Medium | High |
| Desktop usability | High | Very high | Medium | Very high |
| Mobile usability | High | High | High | Very high |
| Hierarchy clarity | High | Very high | Medium | Very high |
| Save-state clarity | Very high | Very high | High | Very high |
| Arbitrary maintenance/editing | Very high | Very high | Low | Very high |
| Implementation complexity | Medium | High | Medium | High |
| Fit with current code/data model | High | High | Medium | Very high |

## 8. Recommendation for owner decision

**Alternative D — Hybrid persistent workspace** is the strongest fit for the actual system.

It does not require a framework rewrite.

The recommended conceptual layout is:

`Assessment Header → Workspace Navigation → Focused Editor → Persistent Save/Result State`

with sections:
- Overview;
- Structure;
- Questions;
- Calculation;
- Validation & Publication.

On desktop, Structure/Questions may use a split navigation/editor arrangement.

On mobile, the same sections become stacked/focused screens.

This is a UI architecture recommendation only. It is **not yet an implementation approval**.

## 9. Proposed save/result contract for design

The UI should normalize every mutation result into a workspace state:

- operation;
- entity type;
- entity identifier;
- target assessment;
- persisted: yes/no;
- server timestamp;
- refreshed-from-server: yes/no;
- user-facing message;
- actionable error, if any.

A successful mutation should produce both:
1. a concise visible confirmation;
2. a durable workspace status entry.

A failed mutation should never imply persistence.

## 10. Proposed navigation contract

The user should always see:

**Assessment**
→ **selected Axis**
→ **selected Question**
→ **selected Option**

The selected item remains visible while its editor is open.

Changing selection must not silently discard unsaved local changes.

## 11. Lifecycle presentation

### Draft
Show:
- Draft badge;
- editable structural sections;
- save status;
- validation;
- publish action.

### Published
Show:
- Published badge;
- editorial fields editable;
- structural controls visibly marked as requiring a Working Copy;
- Create Working Copy action.

### Archived
Show:
- Archived badge;
- read-only content;
- no Draft delete control;
- Restore/Copy only where permitted.

## 12. Explicit non-goals

This investigation does not:
- change P2/P3/P4;
- change scoring semantics;
- change public assessment URLs;
- change lifecycle rules;
- add AI semantic interpretation;
- grant broad database privileges;
- retire existing RPCs;
- implement the UI.

## 13. Decision gate

**Current gate:** INVESTIGATION COMPLETE.

Before implementation:
1. Owner selects/approves the editor workspace direction.
2. A detailed UI/interaction design is produced.
3. Design is explicitly approved.
4. Only then is implementation started.

**P5 remains OPEN.**

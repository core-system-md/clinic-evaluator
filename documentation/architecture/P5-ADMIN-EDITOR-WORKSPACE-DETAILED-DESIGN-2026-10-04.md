# P5 — Admin Editor Workspace Detailed Design
## 2026-10-04

Baseline: 312ef2a0be3a036d96f9b2bb3937434a8f88fa1a
Status: DESIGN READY / IMPLEMENTATION AUTHORIZED BY CONTINUATION HANDOFF

## 1. Design decision

Implement the recommended Hybrid Persistent Workspace without introducing a frontend framework.
The existing Admin page remains the shell. The assessment editor becomes a dedicated full-width in-page workspace that temporarily replaces the dashboard content while editing. It is not a centered modal.

## 2. Workspace anatomy

Persistent header:
- assessment Arabic title;
- Family identity;
- Draft / Published / Archived state;
- version identifier only as Admin diagnostic metadata, not product/public identity;
- last persisted timestamp;
- current save state;
- Back to dashboard.

Workspace navigation:
1. Overview
2. Structure
3. Questions
4. Calculation
5. Validation & Publication

Content model:
- axis list with counts and weight/order;
- one selected axis expanded at a time;
- questions belonging to the selected axis;
- one selected question expanded at a time;
- options shown only inside the selected question editor.

## 3. Responsive behavior

Desktop:
- persistent workspace header;
- two-column layout for Structure/Questions where width permits;
- navigation remains visible;
- editor uses remaining horizontal space;
- sticky bottom save/status bar.

Mobile:
- single-column layout;
- section navigation horizontally scrollable;
- hierarchy becomes stacked: axes → questions → options;
- no tiny inline grids requiring horizontal scrolling;
- controls use full available width;
- sticky bottom status/save controls remain accessible.

## 4. Persistence model

Keep existing secure RPCs.
Normalize every successful operation in local workspace state:
- operation label;
- target label;
- persisted=true;
- server refresh time;
- refreshed-from-server=true.

Never show success without refresh.
Failures set persisted=false/unknown plus operation, target, server reason, and next action.

## 5. Dirty state

Maintain a workspace-level dirty indicator for form fields before explicit save.
Structural child mutations remain explicit immediate-save operations because their canonical RPCs already represent individual atomic changes.
The workspace must still refresh the targeted entity after success and report exactly what persisted.

## 6. Lifecycle presentation

Draft:
- all Draft editing controls enabled according to capability;
- Validate and Publish visible.

Published:
- editorial text editing visible;
- structural fields visibly locked;
- Create Working Copy is the primary structural action.

Archived:
- read-only;
- no Draft delete;
- Restore/Copy only through existing lifecycle operations.

## 7. Compatibility

- Existing secure RPCs are retained.
- No P5 database schema change is required.
- Existing lifecycle functions are redirected to workspace rendering.
- The old modal is removed from normal editor use.
- Public assessment flows remain untouched.

## 8. Error UX

Each error is rendered in the persistent workspace status area and toast as:
[Operation] → [Target] → [Reason] → [Action]

Raw technical detail remains available in a disclosure element for Admin troubleshooting where useful.

## 9. Acceptance matrix

Draft: Create/copy → open workspace → overview → structure → questions → options → calculation → validate → publish.
Published: Open → editorial editing → save → refreshed persisted state → structural action shows Create Working Copy.
Archived: Open → read-only state → no permanent delete → restore/copy as permitted.
Persistence: Every mutation refreshes from server and updates Last saved.
Mobile: Major operations are usable at narrow width without horizontal table editing.
Security: No direct structural-table mutation is added; existing secure RPCs remain authoritative.

## 10. Implementation boundary

This implementation does not change Supabase schema, replace RPCs, alter P2/P3/P4 contracts, alter public URLs, introduce AI semantic validation, or retire legacy RPCs.

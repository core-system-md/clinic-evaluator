# Formal Supersession — Previous Implementation Plan
## 2026-10-07

**Status:** SUPERSEDED — HISTORICAL REFERENCE ONLY  
**Authority:** Explicit owner decision recorded 2026-10-07  
**Replaced by:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`

## 1. Decision

The implementation direction used in the immediately preceding P3/P5 work is formally stopped.

It must **not** be continued, merged, extended, or treated as the execution plan for the next implementation cycle.

This applies in particular to:

- the previous Patient Journey v2 implementation plan;
- the previous Comprehensive Clinic v2 handoff/implementation path;
- the previous Change Set implementation ordering where it conflicts with the final owner-approved Change Set;
- any branch whose purpose is to continue the superseded implementation direction.

## 2. Historical retention

The superseded work remains in Git history and may be consulted only for:

- forensic investigation;
- identifying reusable work;
- understanding prior behavior;
- tracing defects/regressions;
- extracting evidence required to correct the new implementation.

Historical material is **not** an implementation authority.

No code, schema, report behavior, versioning decision, or naming decision is accepted merely because it exists on a superseded branch.

## 3. Explicitly closed execution paths

The following open PRs were formally closed without merge on 2026-10-07:

- PR #52 — Patient Journey v2 implementation path.
- PR #54 — Comprehensive Clinic v2 operational handoff.

Both remain available as historical evidence only.

Their branches must not be treated as active workstreams.

## 4. New canonical execution authority

All future implementation for the approved Change Set starts from:

`FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`

The governing process remains:

`TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE`

No implementation may continue from the superseded plan unless the owner explicitly reopens that material for investigation/reference.

## 5. Owner decision-change right

The owner retains the explicit right to modify any product/business/measurement decision after implementation evidence is reviewed.

Such a later decision must be recorded as a new decision record and reconciled against the implementation contract before implementation proceeds.

## 6. Forbidden shortcut

The new work must not be produced by "patching the old P3/P5 implementation until it appears compliant."

Instead:

`INSPECT → REUSE → EXTEND → CREATE`

The implementation team must first identify what is sound and reusable, then rebuild affected responsibilities under the final contract.

## 7. Effective state

The previous implementation plan is:

**STOPPED / SUPERSEDED / HISTORICAL REFERENCE ONLY**

The final implementation contract is the only current execution plan for the next engineering cycle.

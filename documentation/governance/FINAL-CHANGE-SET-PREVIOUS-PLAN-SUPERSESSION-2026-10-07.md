# Formal Supersession — Previous Implementation Plan
## 2026-10-07

**Status:** SUPERSEDED / STOPPED  
**Authority:** Current owner-approved Final Change Set + AI Engineering Operating Contract  
**Repository:** `core-system-md/clinic-evaluator`  
**Current canonical branch:** `main`  
**Current canonical commit at issuance:** `61b34015796eb850527cf362c5f439cc619c4994`

## 1. Purpose

This record formally stops the implementation path that was being followed before the owner's approval of the Final Change Set dated 2026-10-07.

The previous path is not the active implementation plan.

It remains available only as historical evidence, forensic reference, rollback/reference material, and a source of previously discovered technical evidence.

No new implementation work may continue from that path.

## 2. Superseded execution paths

The following are formally superseded:

- the prior P5 implementation sequence that treated Patient Journey v2 as the implementation target;
- the prior Comprehensive Clinic v2 implementation/handoff sequence;
- any branch, PR, handoff, or checklist whose next action assumes those paths remain active;
- any plan that proceeds directly from the previous P0–P4/P5 change set without passing through the new Final Change Set Implementation Contract.

The following PRs were formally closed without merge on 2026-10-07:

- PR #52 — `P5: implement Patient Journey v2 contract`
- PR #54 — `docs: add Comprehensive Clinic v2 operational handoff`

Their branches remain historical/reference artifacts and are not active execution branches.

## 3. Why the previous path is stopped

The owner-approved Final Change Set changes the engineering target materially:

- assessment versions are to be reset to final V1 identities rather than continued as V2 product identities;
- the central engine concept is consolidated into one final technical entrypoint;
- Structured Result becomes the single factual result authority;
- report interpretation/report projection becomes an explicit downstream layer;
- current Leakage is removed as an official metric;
- KPI availability and assessment coverage become explicit;
- old Trap metadata is no longer a report source of truth;
- unsupported causal/financial report claims are prohibited;
- EV is governed by its explicit economic model rather than legacy UI semantics;
- historical/legacy implementation artifacts must not become competing active authorities.

Continuing the old plan would therefore violate the current owner-approved target even where parts of the old implementation were technically sound.

## 4. Reuse rule

Stopping the old plan does not delete its engineering value.

Historical work may be inspected for:

- verified behavior;
- migrated content;
- test fixtures;
- security findings;
- database dependencies;
- proven P4 lifecycle capabilities;
- report/runtime defects;
- parity evidence;
- rollback/reference evidence.

It must not be treated as an implementation specification.

The governing order remains:

**INSPECT → REUSE → EXTEND → CREATE**

## 5. No implicit rollback

This supersession is not a request to roll production back to the pre-2026-09-30 system.

The pre-2026-09-30 system remains the forensic baseline.

The live/current system remains the runtime reality to be reconciled and safely transformed under the new contract.

## 6. Reopening rule

A superseded artifact may be reopened only when:

1. new evidence requires forensic investigation;
2. parity/reference comparison is required;
3. a rollback or recovery analysis requires it;
4. the owner explicitly changes direction.

Reopening for reference does not reactivate its implementation plan.

## 7. Canonical next action

The only active implementation path is:

`Final Change Set → Final Change Set Implementation Contract → Implementation → Verification → Documentation → Closure`

No code, schema, runtime, or deployment change may be justified solely by the superseded plan.

## 8. Final status

**Previous implementation plan: STOPPED / SUPERSEDED**  
**Historical artifacts: RETAINED FOR REFERENCE**  
**New implementation contract: GOVERNING**  
**Implementation execution: NOT STARTED**

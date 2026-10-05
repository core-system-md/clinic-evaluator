# P0–P5 Contract Reconciliation / Recovery Audit
## 2026-10-05

**Status:** INVESTIGATING — recovery branch only; no production rollback performed.
**Baseline branch:** `recovery/p0-p5-contract-reconciliation-2026-10-05`
**Baseline commit:** `e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8`
**Production Supabase:** `oaqpzaarppccbnepffxx`

## 1. Governing instruction

This recovery treats prior implementation as untrusted. Every P0–P5 change must be re-established from:
1. explicit owner decisions;
2. approved architecture/specification;
3. verified runtime reality;
4. repository/database evidence.

No prior "closed" claim is accepted merely because it exists in documentation.

The binding engineering contract remains:
TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE.

No new product behavior, lifecycle state, security bypass, privilege expansion, scoring change, or destructive migration may be introduced without the required authority.

## 2. Known-good reference

The repository documents `e4c191e6995a9b98b5adb2ab64a79f8806d4c1b8` as the P0–P4 closure/P5 handoff baseline.

The user confirms that before P5 the assessment forms were functioning correctly, including questions and their option sets. This is treated as an owner-provided runtime fact to preserve, not as a hypothesis to override.

Therefore P5 changes are isolated first rather than patched into the current main state.

## 3. P5 change surface

Comparison of `e4c191e...` to current production commit `39bd9f...` shows P5 introduced a large change surface, including:
- Admin workspace/lifecycle code;
- Admin management/security functions;
- `assessment-access` runtime changes;
- numerous P5 database migrations;
- public HTML cache/version changes;
- production E2E workflow changes;
- P5 tests and documentation.

P5 must therefore be reconciled as a subsystem, not debugged by isolated frontend patches.

## 4. Current live database facts

Live migration history contains the P0–P4 migrations plus the P5 migration series.

Current published families have intact option cardinality:
- Admin/Reception: 11 questions / 33 options.
- Clinic Performance: 9 / 45.
- Comprehensive Clinic: 36 / 108.
- Medical Team: 12 / 44.
- Patient Journey: 25 / 75.

Current published option rows have no null `display_order`, no null `option_index`, and no duplicate `(question_id, option_index)` within the checked published graph.

This proves the current database graph is not missing the reported options.

## 5. Public runtime facts

Current repository `assets/js/app.js` renders every member of `q.options`; no option-count truncation was found.

Current deployed Supabase `assessment-access` is version 20 and its deployed `index.ts` is byte-for-byte equal to the repository `main` version.

Its public content projection filters options by question and sorts them by `display_order`; it does not intentionally limit the number of options.

Therefore the reported visual symptom is NOT currently proven to originate from:
- database option deletion;
- a two-option SQL limit;
- `app.js` truncation;
- CSS `nth-child` hiding;
- the deployed Edge Function using different source.

No arbitrary code change will be made until a runtime trace identifies the failing boundary.

## 6. Production-test pollution incident

The previous P5 workflow allowed live E2E execution against production and created synthetic lead rows. That was outside safe production discipline.

The correction removed the synthetic rows and changed the workflow so production E2E requires explicit opt-in.

This is treated as a real engineering defect in the prior process and will not be repeated.

## 7. Recovery strategy

### Phase A — Re-establish P0–P4 truth
Audit each stage against its approved contract and live schema/runtime. Do not reopen a stage merely because it is difficult; reopen only where evidence identifies a current root cause.

### Phase B — Reconcile P5
Classify every P5 change as:
- required by an explicit owner decision;
- required implementation of an approved design;
- compatibility/security correction within that decision;
- unauthorized scope;
- regression;
- documentation-only.

### Phase C — Restore regressions
Where a P5 change is proven to regress a previously working behavior, restore the known-good behavior first. Do not redesign the subsystem as a workaround.

### Phase D — Rebuild only the approved P5 surface
Only after reconciliation, retain or reimplement the minimum P5 functionality that the owner actually approved.

### Phase E — Verification
Each retained change requires:
- static evidence;
- database evidence where applicable;
- realistic workflow verification;
- deployed artifact verification;
- production runtime verification;
- Owner browser acceptance.

P5 remains OPEN until Owner acceptance.

## 8. Forbidden during recovery

- No destructive production reset.
- No direct protected-table bypass.
- No broad privilege grants.
- No new lifecycle states.
- Stop Public must remain distinct from Archive.
- No scoring/P3 semantic changes.
- No P4 submission redesign.
- No modification of assessment question/option content merely to make tests pass.
- No production live E2E without explicit opt-in and isolation.
- No claim of closure from deployment success alone.

## 9. Current status

**Recovery branch:** CREATED from the P0–P4/P5 handoff baseline.

**Production:** NOT ROLLED BACK.

**P0–P4:** RE-VERIFICATION REQUIRED.

**P5:** REOPENED FOR FULL RECONCILIATION.

**Reported option regression:** CURRENT ROOT CAUSE NOT YET PROVEN; database and current deployed renderer do not explain it.

**Next canonical action:** complete P0–P4 live/repository reconciliation, then enumerate and classify every P5 change before implementing any further production correction.

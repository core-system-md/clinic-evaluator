# WP-01 — Source Inventory and Reconciliation
## 2026-10-07

**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`
**Repository:** `core-system-md/clinic-evaluator`
**Supabase project:** `oaqpzaarppccbnepffxx`
**WP status:** INVENTORY COMPLETE — IMPLEMENTATION NOT STARTED
**Production mutation:** NONE

---

## 1. Authority boundary

This inventory is derived from the final implementation contract first, then reconciled against the actual `main` repository and live Supabase/runtime state.

The prior P5 plan, PR #52, PR #54, and their execution branches are not treated as implementation authorities.

Historical material is referenced only where necessary to identify current source lineage, existing implementation artifacts, or discrepancies.

---

## 2. Repository baseline reconciliation

The final contract states the current repository baseline as:

`61b34015796eb850527cf362c5f439cc619c4994`

Actual `main` currently points to:

`6f0b48052a106b902f01c033d93b2a48e3db3971`

Comparison of `61b3401...` → `main` shows 9 commits ahead, with the changed files limited to final governance/architecture/handoff documentation. No production application/runtime source mutation was found in that delta.

**Reconciled interpretation:**

- `61b3401...` remains the implementation baseline identified by the contract.
- `6f0b480...` is the current repository HEAD and contains subsequent documentation reconciliation.
- WP-02+ must use the actual current `main` tree as the working source while preserving the contract's baseline identity.
- This is a documentation/baseline discrepancy, not evidence that WP-02 implementation has already started.

---

## 3. Live assessment families and versions

Current production database inventory:

| Family | Current published version | Status | Questions | Options | Axes | Weight representation |
|---|---:|---|---:|---:|---:|---|
| Admin & Reception | V1 | published/active | 11 | 33 | 4 | 35/25/25/15 |
| Clinic Performance | V1 | published/active | 9 | 45 | 3 | 0.50/0.30/0.20 |
| Comprehensive Clinic | V2 | published/active | 36 | 152 | 6 | 20/20/20/15/15/10 |
| Medical Team | V1 | published/active | 12 | 44 | 4 | 0.35/0.30/0.20/0.15 |
| Patient Journey | V1 | published/active | 25 | 75 | 5 | 0.20/0.15/0.25/0.25/0.15 |

There is also one archived Comprehensive Clinic V1:

- 36 questions
- 108 options
- 6 axes
- archived/inactive
- not the family's current published version

Live totals including the archived Comprehensive V1:

- 5 families
- 6 assessment versions
- 28 axes
- 129 questions
- 457 options

Live published totals:

- 5 families
- 22 axes
- 93 questions
- 349 options

This is an important reconciliation point: the historic P3 inventory of 93 questions / 305 options represented the five original V1 families. The current published set now includes Comprehensive Clinic V2 with 152 options, therefore the current published option total is 349.

---

## 4. Final content sources

### 4.1 Repository content sources

Existing static assessment data files:

- `assets/data/admin_reception_assesstment.json`
- `assets/data/comprehensive_assesstment.json`
- `assets/data/medical_team_assesstment.json`

These files contain visible assessment content, but they are not sufficient to represent the complete current production assessment source of truth because the public runtime loads assessment content from `assessment-access`/Supabase.

No equivalent static repository data file was found for:

- `patient-journey`
- `clinic-performance`

Therefore the live database assessment graph is the current runtime source for those families.

### 4.2 Comprehensive Clinic

The current production family points to:

- family: `comprehensive-clinic-assessment`
- published version: V2
- internal version slug: `comprehensive-clinic-assessment-v2`
- 36 questions
- 152 options
- six axes
- approved V2 option patterns include 0/40/70/100 and selected 0/40/70/100/100 patterns

The contract requires this corrected content eventually to become final **Comprehensive Clinic V1**, after validation, family routing, and dependency-safe removal of the superseded old V1.

### 4.3 Patient Journey

Current production:

- family: `patient-journey`
- published version: V1
- 25 questions
- 75 options
- five axes

The corrected Patient Journey implementation material exists in a historical/unmerged V2 path, but it is not deployed and is not the current source of production truth.

Per the final contract, that corrected content is a candidate source to be reconciled into the final Patient Journey V1 identity during WP-08. It is not an instruction to resume the old PR/branch execution path.

---

## 5. Axis / weight inventory

Current live weights:

### Admin & Reception
- 35%
- 25%
- 25%
- 15%
- total 100%

### Clinic Performance
- 50%
- 30%
- 20%
- total 100%

### Comprehensive Clinic V2
- 20%
- 20%
- 20%
- 15%
- 15%
- 10%
- total 100%

### Medical Team
- 35%
- 30%
- 20%
- 15%
- total 100%

### Patient Journey
- 20%
- 15%
- 25%
- 25%
- 15%
- total 100%

**Reconciliation finding:** storage is currently mixed between percentage-point values and normalized fractions. This directly requires WP-03 canonical normalization before data mutation. Intended values are already recoverable and all current family sums equal 100% after interpreting each representation correctly.

---

## 6. KPI inventory

The current assessment configurations contain KPI mappings.

Core KPI catalog required by the final contract:

- TFI
- TAP
- PRP
- PLI
- PSI
- NPI
- EVI
- TCI
- RRI for Admin/Reception where supported

Current DB mappings exist on the published assessment configurations.

The current mappings are role-based and include roles such as:

- TRUST
- RECEPTION
- COMMUNICATION
- SCHEDULING
- ADMIN
- COORDINATION
- RETENTION
- CONVERSION
- LOYALTY
- TEAMWORK
- TEAM
- OPERATIONS
- JOURNEY
- GROWTH

**Reconciliation finding:** KPI mappings exist, but final KPI availability/coverage semantics must be reconciled against the final Structured Result contract. No missing role may be silently backfilled from unrelated scores.

---

## 7. Interpretation registries

Current repository/runtime contains:

- V1 response interpretation registry:
  `supabase/functions/assessment-access/p3-response-interpretation-registry-v1.json`
  - 5-family scope
  - 93 questions
  - 305 options

- V2 response interpretation registry:
  `supabase/functions/assessment-access/p3-response-interpretation-registry-v2.json`
  - Comprehensive Clinic V2
  - 152 entries/options

Current scorer routing is version-aware.

**Reconciliation finding:** the existence of V2 interpretation material is valid historical/current implementation material, but the final product must not expose a V2 user-facing identity. WP-02/WP-03 must establish the final interpretation-version identity independently of product version naming.

---

## 8. Consistency inventory

Current implementation artifacts:

- `p3-consistency-engine.mts`
- `p3-consistency-rule-registry-v2.json`
- `p3-consistency-pair-registry-v1.json`

The packaged Comprehensive Clinic V2 pair registry contains:

- 52 explicit pairs
- assessment family: `comprehensive-clinic-assessment`
- assessment version: 2
- relationship type: `HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION`
- score effect: `CAP_VALIDATOR_ANCHOR`
- configured ceiling: 70 for these V2 pairs

The final contract confirms:

- Consistency is internal analytical logic.
- Detection and score effect remain separate.
- No Trap/Consistency mechanics may appear in the user report.
- Admin may expose findings, rule identity, severity, effect, evidence and provenance.
- The authoritative source must be Structured Result, not legacy `is_trap`/`trap_triggered` fields.

---

## 9. Economic Opportunity inventory

Current published configurations have EV mappings.

Current runtime model contains:

- annual visit basis
- default 3 visits/year
- optional referral percentage
- blank referral = unavailable
- 0% referral = zero
- EV does not modify assessment score

The current Edge Function source explicitly carries `visitsPerYear: 3`.

Current database state also shows that Comprehensive Clinic V2 has EV mappings but `has_ev_simulator=false`, so its mapping must not be mistaken for an enabled user-facing simulator.

**Reconciliation finding:** the annual EV contract is present, but UI/report labels and model ownership remain part of later report/validation work.

---

## 10. Report sources and renderer paths

### User runtime

Primary paths:

- assessment HTML pages:
  - `comprehensive-clinic-assessment.html`
  - `clinic-performance.html`
  - `medical-team-assessment.html`
  - `admin-reception-assessment.html`
  - `patient-journey.html`
- `assets/js/app.js`
- `assets/data/report_texts.json`
- Supabase Edge Function:
  `supabase/functions/assessment-access/index.ts`

Current browser flow receives the server result and renders it, but the current renderer still contains report-only derivations and legacy presentation behavior that conflict with the final contract.

Observed examples requiring later reconciliation:

- user-facing Trap presentation remains in `app.js`;
- user-facing priority/causal wording is constructed from weakest axis directly in the renderer;
- trend wording is generated from numeric differences;
- a Leakage display is still generated as `100 - overallScore`;
- `report_texts.json` still contains Leakage-oriented presentation copy.

These are inventory findings, not implementation changes.

### Admin runtime

Primary paths:

- `admin/admin.js`
- `admin/admin-session.js`
- `admin/assessment-manager.js`
- `admin/assessment-lifecycle.js`
- `admin/assessment-editor-workspace.js`
- `admin/admin.html`
- server-side report read boundary:
  `public.get_admin_report_sessions_secure(uuid)`

The admin path already reads authoritative Structured Result data when available, but legacy/historical presentation code remains and requires final projection/claim-policy reconciliation.

---

## 11. Engine inventory

Current executable/runtime scoring identity:

- `supabase/functions/assessment-access/score-engine.ts`

Legacy executable/reference identity still present:

- `supabase/functions/assessment-access/score-engine-legacy.ts`

Additional modular scoring artifacts:

- `p3-scorer-v1.mts`
- `p3-aggregation-engine.mts`
- `p3-consistency-engine.mts`
- `p3-criticality-coverage-engine.mts`
- `p3-economic-model-v1.mts`
- `p3-integrated-scorer-v1.mts`
- `p3-structured-result-v1.mts`

Current production Edge Function source imports `calculateAssessment` from `score-engine.ts`.

**Contract reconciliation:** final authority must become exactly `engine.ts`. No competing executable engine identity may remain.

The current repository does **not** contain a final `engine.ts` at the required path.

---

## 12. Browser engine references

All five assessment HTML pages still reference:

`/engine/engine.js`

The current repository tree does not contain the corresponding `engine/engine.js` file.

This is a concrete stale/dead runtime reference and must be handled in WP-09 after replacement verification. It must not be repaired by recreating the old browser engine.

---

## 13. Leakage inventory

Current active/reachable presentation reference:

- `assets/js/app.js` calculates/displays Leakage as `100 - overallScore`.

Historical/reference implementations:

- `score-engine-legacy.ts`
- `tests/reference/browser-engine-v4.js`

Presentation source:

- `assets/data/report_texts.json` contains Leakage-oriented explanatory copy.

Final contract disposition:

- Leakage is removed as an official metric.
- No financial meaning may be derived from `100 - overallScore`.
- Historical code may remain only as classified reference/history, not executable product authority.

---

## 14. Persistence inventory

Authoritative persisted result table:

`public.assessment_results`

Current production table:

- exists
- RLS enabled
- 0 rows

Current result persistence/completion boundaries include:

- `public.prepare_assessment_submission(...)`
- `public.complete_p4_assessment_session(...)`
- `public.complete_assessment_session(...)`
- `public.complete_public_assessment_session(...)`

Legacy SQL scorer:

`public.calculate_session_score(uuid)`

Current live security check:

- not SECURITY DEFINER
- not executable by `anon`
- not executable by `authenticated`

Final contract requires this legacy scorer to be dispositioned after dependency/security verification.

---

## 15. Live data baseline

Verified live:

- sessions: 0
- answers: 0
- scores: 0
- assessment_results: 0
- leads: 0

Therefore no existing live result rows currently require preservation during the approved version identity reset.

This does not authorize deletion by itself; dependency checks remain mandatory.

---

## 16. Runtime baseline

Current `assessment-access` Edge Function:

- status: ACTIVE
- version: 32
- source digest:
  `950467bed27b99961ea46177e654be2cacacf4f867ad884549de9d7dc0198edb`

This matches the final contract's recorded runtime baseline.

---

## 17. Migration inventory

The repository contains the accumulated P0–P5 migration files under:

`supabase/migrations/`

Live Supabase migration history is present and includes the corresponding P0/P1/P2/P3/P4/P5 database evolution, including:

- assessment family/version architecture
- immutability/lifecycle controls
- protected assessment access
- P3 result persistence
- P4 submission preparation/finalization
- P5 admin/lifecycle/report/security corrections
- public option projection recovery

**Reconciliation finding:** repository migration filenames and live migration version identifiers are not always textually identical because some live migrations use generated/actual applied timestamps while repository filenames preserve authored names/timestamps. This must be treated as migration provenance and reconciled before any new destructive migration.

---

## 18. Tests inventory

Relevant current test groups include:

- P3 aggregation/scoring/interpretation/consistency/coverage/economic/structured-result tests
- P3 production contract and external E2E tests
- P4 submission flow and protected-function harness
- P5 editor workspace tests
- server/browser parity test
- reference browser engine fixture

The test suite still contains historical P3/P4/P5 naming and compatibility fixtures. These are inventory/reference assets, not authorities for the new implementation sequence.

---

## 19. WP-01 reconciliation findings

### Confirmed

1. Final implementation contract is the governing implementation authority.
2. No production implementation mutation has been made during this WP-01.
3. Current live production has five assessment families.
4. Comprehensive Clinic is currently published as V2.
5. Patient Journey is currently published as V1.
6. Live result/session/answer/score data is empty.
7. Structured Result persistence exists.
8. Current production Edge Function is ACTIVE at version 32.
9. Current production scoring entrypoint is still `score-engine.ts`.
10. `engine.ts` does not yet exist as the final canonical engine identity.
11. Old `score-engine-legacy.ts` remains present.
12. All five HTML assessment pages retain stale `/engine/engine.js` references.
13. Leakage remains in current browser/report presentation.
14. Current database weight storage is mixed between percentage points and fractions.
15. Current Comprehensive V2 contains 152 options and has a matching V2 interpretation registry.
16. Current Comprehensive V2 has 52 explicit consistency pairs.
17. Current KPI/EV mappings exist and require final eligibility/projection reconciliation.

### Blocking reconciliation items for WP-02+

These are not implementation actions yet:

- canonical final `engine.ts` ownership;
- weight representation normalization;
- final interpretation/version identity;
- final Comprehensive V1 reconstruction;
- final Patient Journey V1 reconstruction from the approved corrected source;
- report interpretation/projection separation;
- removal of Leakage from product output;
- removal of user-facing Consistency/Trap mechanics;
- stale browser engine reference removal;
- legacy SQL scorer disposition;
- final migration/dependency graph verification.

---

## 20. WP-01 disposition

**WP-01: COMPLETE / RECONCILED FOR HANDOFF TO WP-02**

No code, database, Edge Function, assessment content, version routing, or production record was mutated by this inventory.

The next canonical action is WP-02 only after treating this inventory as the reconciled source map:

**WP-02 — Establish `engine.ts`**

Implementation must proceed from the final contract plus this reconciled inventory, not from any prior P5/PR #52/PR #54 execution plan.

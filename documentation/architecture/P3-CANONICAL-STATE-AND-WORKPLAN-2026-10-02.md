# P3 — Canonical State, Reconciliation & Work Plan
## 2026-10-02

**Status:** GOVERNING P3 WORKING STATE — DESIGN / NOT IMPLEMENTATION-READY  
**Repository:** `core-system-md/clinic-evaluator`  
**Canonical branch:** `main`  
**Current canonical main head:** `66ebdbff3e88aa5b6c100b8756d021ac87a53d9c`

## 1. Purpose

This document is the single working reference for P3 status, document precedence, reconciled findings, open decisions, and the sequence required to reach the Implementation-Ready gate.

It does not authorize production implementation.

## 2. Document/source hierarchy

For P3 continuation:

1. Explicit owner decisions recorded in project history/conversation.
2. This canonical P3 state and work-plan document on `main`.
3. Approved project architecture and governance documents.
4. Verified live runtime/database evidence.
5. P3 design/supporting documents.
6. Historical documents and superseded implementation experiments.

The branch `documentation/audit-and-decisions` is a historical baseline for the project up to 2026-09-30/early P2 work. It is not the canonical P3 continuation branch. It remains preserved for traceability and must not be treated as a second active source of truth.

## 3. Reconciled P3 state

### CLOSED / ALREADY AGREED

- P3 objective: rebuild/correct scoring construction rather than preserve a flawed legacy equation.
- Result shape: multi-dimensional profile.
- Performance and maturity/capability are separate.
- Semantic interpretation is separate from numeric representation.
- Option position is never itself a score.
- Missing/unsupported data is not silently converted to zero.
- Criticality is separate from score; no arbitrary automatic penalty.
- Consistency detection is separate from score effect.
- Development opportunity is evidence-derived and separate from core assessment score.
- Five assessments share a common measurement kernel but may activate different components and do not require one identical equation.
- Visible question/answer content remains protected during P3 methodology work.
- Clinic Performance Q4/Q5/Q6 retain the owner-approved current semantic encoding `0/0/40/100/100`.
- The five legacy scoreless sessions previously targeted by the deletion record are deleted and verified absent.
- Production scoring has not been switched to the P3 scorer.
- No P3 production migration/schema activation has been performed.

### DESIGN-COMPLETE / VERIFIED IN ISOLATION

- Option-level registry coverage: 93 questions / 305 options.
- Component/profile aggregation module.
- Consistency rule engine with V1 default `scoreEffect = NONE`.
- Criticality/coverage module.
- Structured Result assembler.
- Isolated P3 profile scorer.
- Historical reconciliation classifier/policy.
- Deterministic shadow replay evidence for replayable current sessions.
- Production migration/rollback design.

These are module/design closures, not P3 stage closure.

### OPEN / REQUIRES COMPLETION

1. Synchronize the response-interpretation registry with the already-recorded owner semantic correction for Medical Team Q2c9f29. This is an artifact-consistency task; do not reopen the 93-question analysis unless new evidence contradicts the recorded decision.
2. Freeze the exact numeric scale selection where still undecided, including whether the proposed five-state maturity anchors are activated for the affected items. No global remapping is allowed.
3. Freeze component/profile numeric aggregation as a complete methodology, including treatment of eligible layers, missingness, and any secondary composite. V1 currently keeps the overall composite null unless a separate owner-approved decision changes that.
4. Define the KPI model: KPI catalog, role/component inputs, availability/partial/unavailable semantics, and prohibition of unsupported-role imputation.
5. Define the economic model separately: inputs, units/flow semantics, formula/scenarios, and explicit non-interaction with the core assessment score.
6. Reconcile current legacy data lineage:
   - 15 completed sessions with scores but no session-linked answers;
   - 12 answer rows without session_id;
   - 123 score rows without session_id.
   These are not the five deleted sessions. No deletion, repair, or guessed linkage is authorized by this document.
7. Produce the final integrated P3 design package: one scorer pipeline, one structured-result path, one canonical source for each rule, and explicit disposition of superseded modules/paths.
8. Produce the pre-Implementation-Ready verification package: acceptance matrix, deterministic fixtures, current-data validation, migration/rollback design, provenance/persistence design, security/runtime checks, and documented closure evidence.

## 4. Production reality

The live Supabase project currently runs `assessment-access` version 10. Its active completion path still imports legacy `calculateAssessment` from `score-engine.ts).

The legacy path still contains:
- source option-value scoring;
- impact multipliers;
- legacy trap penalties;
- axis weighted averaging;
- overall composite;
- role fallback/imputation;
- KPI fallback/default behavior;
- legacy EV behavior.

This is current production reality, not the target P3 design.

## 5. Current data findings

The live database currently contains 93 questions and 305 options across the five assessment families.

All 93 live questions currently have `impact = medium`.

Current session/result findings:
- 15 completed sessions have zero linked answer rows but have score rows.
- 12 answer rows have no `session_id`; these are older lead-based records.
- 123 score rows have no `session_id`; these are older lead-based records.
- The five specifically documented legacy scoreless sessions targeted for deletion are absent.

These data findings remain reconciliation work. They are not authorization to rewrite history.

## 6. P3 work sequence to Implementation-Ready

### Gate A — Documentation and contract reconciliation
**Objective:** one authoritative P3 state.

Actions:
- keep `main` as the only active P3 continuation branch;
- treat `documentation/audit-and-decisions` as historical baseline;
- classify old P3 drafts/closures as supporting evidence;
- synchronize document status language with actual evidence;
- maintain this document as the status index.

**Exit:** no conflicting active status statement remains unresolved.

### Gate B — Finish methodology decisions
**Objective:** all material measurement behavior is decided before implementation.

Work:
- close registry synchronization;
- close any remaining numeric-scale decisions;
- confirm complete component/profile aggregation behavior;
- define KPIs;
- define economics;
- confirm criticality/consistency effects remain non-automatic unless explicitly versioned.

**Exit:** no material product/methodology decision remains open.

### Gate C — Data and historical reconciliation
**Objective:** establish what historical data can and cannot support.

Work:
- classify the 15 score-bearing/no-answer sessions;
- classify the 12 sessionless answers and 123 sessionless scores;
- determine lineage only from evidence;
- produce a non-destructive disposition matrix;
- apply no destructive action unless separately authorized.

**Exit:** historical policy and current-data limitations are documented with evidence.

### Gate D — Integrated P3 design
**Objective:** one coherent design rather than isolated modules.

Work:
- define the single conceptual pipeline:
  selected option → interpretation → measurement → component/profile aggregation → consistency/criticality/coverage → structured result;
- choose the canonical internal implementation boundary;
- explicitly retire/supersede duplicate experimental kernels in the design record;
- define roles/KPIs/economics as downstream projections of the structured result;
- define persistence/provenance contract.

**Exit:** one internally consistent P3 design can be implemented without inventing rules.

### Gate E — Verification package
**Objective:** prove the design is testable before implementation.

Work:
- deterministic fixtures for all agreed edge cases;
- all five assessment families;
- missing/partial/semantic-only/contextual cases;
- criticality and consistency signals;
- KPI availability semantics;
- economics inputs/invalid cases;
- provenance/replay;
- legacy compatibility boundaries;
- migration/rollback acceptance criteria.

**Exit:** acceptance matrix is complete and every test case has an expected contract outcome.

### Gate F — Implementation-Ready review
Create the final P3 Implementation-Ready record containing:
- final scope;
- canonical architecture;
- final methodology decisions;
- canonical configuration ownership;
- data/persistence changes;
- security implications;
- migration/rollback approach;
- acceptance criteria;
- regression risks;
- verification plan;
- explicit list of excluded/superseded artifacts.

**Exit:** no material unresolved decision; evidence supports safe implementation.

At this point the status becomes:

**P3 — IMPLEMENTATION-READY**

Then and only then is the process paused for owner approval before Implementation.

## 7. Forbidden before Implementation-Ready

- Do not replace production scoring.
- Do not change published scoring semantics.
- Do not apply P3 migrations.
- Do not rewrite historical scores.
- Do not delete the newly identified legacy records.
- Do not invent KPI or EV formulas.
- Do not globally replace response scales.
- Do not merge experimental P3 kernels into production.
- Do not treat unit-test success as production verification.

## 8. Canonical working rule

For any new P3 finding:

`existing evidence → reconcile against owner decisions → update this canonical state → only then continue to the next gate`

Never restart P3 discovery merely because an older draft uses a different filename or status.

## 9. Immediate next action

**Gate A is now the active action: documentation reconciliation is complete with this canonical record.**

Next active work is **Gate B — finish only the genuinely unresolved methodology decisions**, starting with KPI design and the remaining numeric/aggregation closure.

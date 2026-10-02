# P3 — Canonical State, Reconciliation & Work Plan
## 2026-10-02

**Status:** GOVERNING P3 WORKING STATE — IMPLEMENTATION EXECUTED / GATE 3 OPEN  
**Repository:** `core-system-md/clinic-evaluator`  
**Canonical branch:** `main`  
**Canonical source:** the current `main` branch (this document moves with it).

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

### IMPLEMENTATION EXECUTION STATUS — 2026-10-02

- Owner authorization to implement P3 was received.
- Additive production migration `20261002000000_p3_production_implementation` was applied.
- Follow-up idempotent-completion migration `p3_preserve_completion_access_v2` was applied to match the existing P0 completion contract.
- `assessment-access` is ACTIVE at Edge Function version 12 and routes completion through the P3 production adapter.
- Production persistence now stores P3 Structured Result plus provenance in `public.assessment_results`.
- Transactional public/protected completion verification passed, including idempotent retry behavior and rollback-cleanup checks.
- Historical rows were not rewritten or deleted.
- Gate 3 remains OPEN pending final post-cutover/runtime acceptance evidence and closure record.


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

### CLOSED / METHODOLOGY DECISIONS NOW FROZEN

- KPI basis is the existing KPI catalog and existing mapping weights: TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI, with RRI for Admin/Reception.
- KPI calculation uses only roles actually measured by the assessment.
- Missing roles are never filled by an overall/axis average or any other invented value.
- User-facing final reports do not discuss missing-role substitution. A KPI that cannot be supported by the available measured roles is omitted rather than shown as a fabricated zero.
- The result is a multi-dimensional profile and retains the existing `overallScore` / `معدل الكفاءة العام` concept as a secondary aggregate result. No new “summary score” concept is introduced.
- The response-scale rule is closed: scale selection follows question meaning; there is no global remapping by option count.
- The Medical Team Q2c9f29 correction is recorded in the response registry as the design correction 100/40/40/0; this remains design-only and is not a production value change.
- V1 consistency remains signal-only (scoreEffect = NONE).
- V1 criticality remains separate from score; critical findings require review and are not converted into an automatic penalty or gate.
- Component aggregation remains the primary measurement boundary, with mixed measurement layers preserved and missing values never converted to zero.

### DESIGN-COMPLETE / VERIFIED IN ISOLATION

- Option-level registry coverage: 93 questions / 305 options.
- Component/profile aggregation module.
- Consistency rule engine with V1 default scoreEffect = NONE.
- Criticality/coverage module.
- Structured Result assembler.
- Isolated P3 profile scorer.
- Historical reconciliation classifier/policy.
- Deterministic shadow replay evidence for replayable current sessions.
- Production migration/rollback design.

These are module/design closures, not P3 stage closure.

### CLOSED / GATE B AND GATE C RECONCILIATION

- The existing `overallScore` / `معدل الكفاءة العام` construction is CLOSED: weighted arithmetic mean of valid measured dimensions using the approved canonical dimension weights; unavailable dimensions are excluded, never zero-filled or imputed; consistency/criticality do not alter the score.
- Referral economic calculation is CLOSED: default visits are 3/year; referral has no default; supplied referral propagates recursively under the owner-approved geometric model; blank remains unavailable.
- Gate C historical reconciliation is CLOSED as evidence/disposition only:
  - 15 completed sessions with scores but no session-linked answers → preserve as legacy;
  - 12 answer rows without session_id → preserve and exclude from authoritative P3 lineage;
  - 123 score rows without session_id → preserve and exclude from authoritative P3 lineage.
  These are not the five deleted sessions. No deletion, repair, or guessed linkage is authorized by this document.

### IMPLEMENTATION-READY — READY TO EXECUTE AFTER OWNER APPROVAL

1. The canonical non-production integrated P3 path is complete and verified by hosted CI.
2. Persistence/provenance and migration/rollback contracts are implementation-ready against the verified current schema.
3. Deployment-stage transactional persistence, cutover, rollback-exercise, and post-cutover checks remain acceptance work after explicit authorization.
4. No owner methodology decision remains open.

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

**Status: COMPLETE.**

Completed and frozen:
- KPI catalog/mapping basis and no-imputation rule.
- Response-scale selection rule and Q2c9f29 artifact correction.
- V1 consistency behavior.
- V1 criticality behavior.
- Existing `overallScore` / `معدل الكفاءة العام` and its weighted-arithmetic-mean construction.
- Economic input defaults and referral-input behavior.
- Recursive referral economic equation.

**Exit:** no material product/methodology decision remains open.

### Gate C — Data and historical reconciliation
**Status: COMPLETE — evidence/disposition only; no data mutation.**

**Objective:** establish what historical data can and cannot support.

Work:
- classify the 15 score-bearing/no-answer sessions;
- classify the 12 sessionless answers and 123 sessionless scores;
- determine lineage only from evidence;
- produce a non-destructive disposition matrix;
- apply no destructive action unless separately authorized.

**Exit:** historical policy and current-data limitations are documented with evidence. **Met.**

### Gate D — Integrated P3 design
**Status: COMPLETE — design boundary; no production implementation.**

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
**Status: COMPLETE.**
**Objective:** prove the design is testable before implementation.

Verified so far:
- prior hosted P3 kernel + full Node baseline run passed (GitHub Actions run 36984901827);
- 11 new deterministic contract cases for `overallScore`, KPI availability/no-imputation, and recursive economics pass independently;
- live assessment-family configuration and canonical weight sums were checked read-only;
- live server-authority baseline checked: browser uses `assessment-access`; completion RPCs are service-role-only; anonymous/public table privileges for answers/scores/sessions are false;
- current security/performance advisor findings were recorded without mutation;
- persistence gap is confirmed: planned `assessment_results` table and new provenance fields are not deployed.

Remaining Gate E execution:
- integrate `overallScore`, consistency, criticality/coverage, roles/KPIs, and economics into the single P3 runtime path;
- add executable integrated tests against that path;
- execute persistence/provenance transaction tests after the authorized additive migration exists;
- execute production-boundary security/runtime checks and rollback verification after the authorized cutover adapter exists.

**Exit:** every applicable verification case has an executable test or documented production verification artifact, with no unresolved material contradiction.

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

## 8. Owner-approval boundary

Implementation-Ready is a readiness state, not production authorization. Until explicit owner approval is recorded, the production scorer, production schema, and public completion path remain unchanged.

## 9. Canonical working rule

For any new P3 finding:

`existing evidence → reconcile against owner decisions → update this canonical state → only then continue to the next gate`

Never restart P3 discovery merely because an older draft uses a different filename or status.

## 10. Immediate next action

P3 Implementation has been executed. The current state is **GATE 3 ACCEPTANCE OPEN**.

Remaining work is evidence-based post-cutover acceptance: production runtime/E2E verification, final security/runtime confirmation, rollback-readiness evidence, and the Gate 3 closure record. Historical rewrite/deletion remains outside this execution.

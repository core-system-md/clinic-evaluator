# P3 — Gate E Integration Gaps
## 2026-10-02

**Status:** Verification finding — non-production  
**This document adds no methodology decision.**

## A. Confirmed integration gaps

**Checkpoint update 2026-10-02:** runtime integration for scoring/projection has now been implemented and is under CI verification on the non-production branch. The remaining blockers are persistence/provenance and production-boundary verification.

### 1. Global overallScore — CLOSED in non-production integration
The approved global result uses existing assessment axes as dimensions and their existing weights.
The integrated non-production path now calculates the approved global `overallScore` from measured axis scores and canonical axis weights.

### 2. Structured Result overallScore — CLOSED in non-production integration
`p3-structured-result-v1.mts` now carries the approved `overallScore` and axis-score projection.

### 3. Consistency and criticality integration — CLOSED in non-production integration
The integrated path invokes both modules and includes their findings in Structured Result; both remain score-independent.

### 4. Roles/KPIs projection — CLOSED in non-production integration
Live configuration confirms:
- `axis_roles` exists for all five published families;
- all current KPI mappings sum to 1.00;
- RRI is present only for Admin/Reception.

The integrated path now performs axis → role → KPI projection using the existing mapping weights, with unavailable/partial semantics and no imputation.

### 5. Economics projection — CLOSED in non-production integration
The integrated non-production path now computes economics when valid input is supplied and keeps it separate from `overallScore`.
P3 must apply the already-approved economic model only:
- visits/year default = 3;
- referral is optional, no default;
- blank referral = unavailable;
- explicit 0% = no referral contribution;
- recursive referral model;
- economics never changes `overallScore`.

The legacy `ev_mappings` field is not part of this P3 economic model.

### 6. Persistence/provenance is not deployed
The live `sessions` table lacks:
- `interpretation_version`
- `scoring_contract_version`
- `assessment_config_digest`

There is no `public.assessment_results` table.
No migration has been applied.

### 7. Input validation gap — CLOSED
`resolveP3Selections()` iterates known assessment questions and therefore silently ignores a supplied selection whose `questionCode` is not part of that assessment.
The integrated P3 path now rejects unknown question and option identities explicitly.

## B. Experimental duplication — CLOSED on the integration branch

The superseded `p3-score-engine.mts` and its dedicated test were removed from the non-production integration branch. The canonical runtime composition is now:
`p3-scorer-v1.mts` → `p3-aggregation-engine.mts` → explicit global projections → `p3-consistency-engine.mts` / `p3-criticality-coverage-engine.mts` → `p3-structured-result-v1.mts`.

The production `score-engine.ts` remains untouched.

## C. Gate E interpretation

These findings are implementation/integration evidence only.

No owner methodology decision is reopened.

The executable non-production path now passes hosted CI, and the current-schema persistence/security boundary has been verified read-only. Gate E is closed for pre-implementation verification. Transactional persistence, production cutover, rollback exercise, and post-cutover checks remain deployment-stage acceptance work after explicit authorization.

The current integrated path is executable through:
`selected option identity → interpretation → measurement → component/profile → overallScore → consistency/criticality/coverage → Structured Result → roles/KPIs/economics`.

No production runtime or schema has been changed by this audit.

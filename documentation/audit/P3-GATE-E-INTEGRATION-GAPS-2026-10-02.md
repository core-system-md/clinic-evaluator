# P3 — Gate E Integration Gaps
## 2026-10-02

**Status:** Verification finding — non-production  
**This document adds no methodology decision.**

## A. Confirmed integration gaps

### 1. Global overallScore is not yet integrated
The approved global result uses existing assessment axes as dimensions and their existing weights.
Current non-production scorer output stops at the profile and does not calculate the global `overallScore`.

### 2. Structured Result does not yet carry overallScore
The authoritative Structured Result contract requires the existing `overallScore` / `معدل الكفاءة العام` at the global-result level.
The current `p3-structured-result-v1.mts` assembler has no such field.
This is a code integration gap, not a new decision.

### 3. Consistency and criticality are still separate modules
Both modules are tested independently, but `p3-scorer-v1.mts` does not invoke them and does not include their findings in its returned Structured Result.

### 4. Roles/KPIs are not projected from the P3 result yet
Live configuration confirms:
- `axis_roles` exists for all five published families;
- all current KPI mappings sum to 1.00;
- RRI is present only for Admin/Reception.

P3 still needs the runtime projection:
axis score → role score → KPI using the existing mapping weights, with missing roles represented as unavailable/partial and without legacy fallback/imputation.

### 5. Economics is not projected
The current Structured Result keeps economics as `NOT_COMPUTED`.
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

### 7. Input validation gap in isolated scorer
`resolveP3Selections()` iterates known assessment questions and therefore silently ignores a supplied selection whose `questionCode` is not part of that assessment.
The integrated P3 path must reject unknown question identities instead of silently discarding them.

## B. Existing duplicate experimental boundary

Two non-production assemblies exist:
- `p3-score-engine.mts` — older experimental structured/result kernel;
- `p3-scorer-v1.mts` + `p3-structured-result-v1.mts` — current intended split between scorer and final assembler.

The integrated design already identifies `p3-structured-result-v1.mts` as the Structured Result owner.
The older `p3-score-engine.mts` should therefore remain explicitly superseded/non-production and should not become a second runtime path.

## C. Gate E interpretation

These findings are implementation/integration blockers only.

No owner methodology decision is reopened.

Gate E remains open until the complete single path is executable and verified:
`selected option identity → interpretation → measurement → component/profile → overallScore → consistency/criticality/coverage → Structured Result → roles/KPIs/economics → persistence`.

No production runtime or schema has been changed by this audit.

# P3 — Integrated Design Closure Draft
## 2026-10-02

**Status:** DESIGN / IN PROGRESS — non-production  
**Canonical status:** `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`

## 1. Single conceptual pipeline

`selected option → response interpretation → measurement → component/profile aggregation → consistency + criticality/coverage → structured result → projections`

The structured result is the single handoff. Roles/KPIs and economics consume the structured result; they do not recalculate the assessment independently.

## 2. Measurement rules already fixed

- Question meaning determines response interpretation; no global scale remap.
- Numeric scoring uses declared response maximums and impact multipliers.
- Missing/unavailable values remain unavailable; never guessed as zero.
- Component aggregation preserves distinct dimensions/layers.
- Consistency is a signal in V1; no automatic score penalty.
- Criticality is separate from score in V1.
- KPI basis is the existing catalog/mapping weights, with no role imputation.
- The existing `overallScore` / **معدل الكفاءة العام** remains a secondary aggregate result; its P3 construction is still to be frozen.
- Economics is separate from assessment score.
- Referral input is optional, has no default, and affects economics only when supplied. Default visits are 3/year.
- The approved referral model treats each referred patient as having the same visit frequency, visit value, relationship duration, and referral rate as the originating patient. Therefore referral value propagates through downstream referral generations as a geometric series.
- For referral rate `r = referral_percentage / 100`, with `0 ≤ r < 1`: `BasePatientValue = average_visit_value × 3 × relationship_years`; `EconomicValue = BasePatientValue / (1 - r)`. The referral percentage is an economic-network coefficient, not a percentage increase applied once to the original patient's value.
- Blank referral input means unavailable; explicit `0%` means no referral contribution. Referral remains isolated from `overallScore`.

## 3. Canonical implementation boundary

The future implementation must have one canonical scorer path. The currently existing isolated P3 modules are design/verification artifacts, not production paths.

The duplicate experimental responsibilities currently present are:

- `p3-score-engine.mts`
- `p3-scorer-v1.mts`
- `p3-aggregation-engine.mts`
- `p3-structured-result-v1.mts`

Before implementation, their responsibilities must be consolidated so that scoring, aggregation and structured-result assembly are not maintained as competing kernels.

## 4. Result projections

The structured result owns:

- identity and pinned assessment version;
- provenance and contract/config digests;
- interpreted inputs;
- component/profile measurements;
- coverage;
- consistency signals;
- criticality signals;
- existing `overallScore` when its P3 construction is frozen;
- role/KPI projections with availability semantics;
- economics as a separate projection;
- diagnostics/audit lineage.

No projection may silently invent unavailable source data.

## 5. Historical boundary

The historical reconciliation policy remains authoritative:

- fully replayable sessions may be shadow-replayed;
- sessions without reliable answer-level evidence remain legacy;
- sessionless legacy answers/scores are not attached by inference;
- no historical rewrite or deletion is part of this design stage.

## 6. Remaining blockers to Gate D closure

Only material methodology points still block final closure:

1. exact P3 construction of the existing `overallScore`;
2. exact monetary effect of the already-defined referral percentage — CLOSED by owner approval: recursive downstream referral model above.

With the referral rule now owner-approved, the only remaining material methodology blocker is the existing `overallScore` construction. Gate D can otherwise continue through canonical integration, persistence/provenance, and verification design without changing production.

# P3 — Integrated Design Closure Draft
## 2026-10-02

**Status:** DESIGN COMPLETE — non-production  
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
- The existing `overallScore` / **معدل الكفاءة العام** remains a secondary aggregate result. Its P3 construction is closed: weighted arithmetic mean of valid measured dimensions using the approved canonical dimension weights; unavailable dimensions are excluded, not zero-filled or imputed; consistency/criticality do not alter the score.
- Economics is separate from assessment score.
- Referral input is optional, has no default, and affects economics only when supplied. Default visits are 3/year.
- The approved referral model treats each referred patient as having the same visit frequency, visit value, relationship duration, and referral rate as the originating patient. Therefore referral value propagates through downstream referral generations as a geometric series.
- For referral rate `r = referral_percentage / 100`, with `0 ≤ r < 1`: `BasePatientValue = average_visit_value × 3 × relationship_years`; `EconomicValue = BasePatientValue / (1 - r)`. The referral percentage is an economic-network coefficient, not a percentage increase applied once to the original patient's value.
- Blank referral input means unavailable; explicit `0%` means no referral contribution. Referral remains isolated from `overallScore`.

## 3. Canonical implementation boundary

The future implementation must have one canonical scorer path. The currently existing isolated P3 modules are design/verification artifacts, not production paths.

The duplicate experimental responsibilities currently present are:

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
- existing `overallScore` / `معدل الكفاءة العام`, constructed as the weighted arithmetic mean of valid measured dimensions using the approved canonical dimension weights;
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

## 6. Gate D closure

Gate B methodology is fully closed. Gate C historical/data reconciliation is complete. Gate D is now closed at the design boundary.

### 6.1 Canonical ownership

Each P3 rule has one canonical design source:

| Concern | Canonical source |
|---|---|
| Response interpretation / item semantics | `P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json` |
| Component/profile aggregation | `P3-COMPONENT-AGGREGATION-V1-CLOSURE-2026-10-02.md` |
| `overallScore` / معدل الكفاءة العام | `P3-GATE-B-DECISION-CLOSURE-2026-10-02.md` |
| Consistency | `P3-CONSISTENCY-RULE-REGISTRY-V1.json` + closure record |
| Criticality / coverage | `P3-CRITICALITY-COVERAGE-V1-CLOSURE-2026-10-02.md` |
| Structured Result shape | `P3-STRUCTURED-RESULT-CONTRACT-DRAFT-1-2026-10-02.md` |
| Historical reconciliation | `P3-HISTORICAL-RECONCILIATION-POLICY-V1-CLOSURE-2026-10-02.md` |
| Production migration / provenance / rollback | `P3-PRODUCTION-MIGRATION-ROLLBACK-PROVENANCE-V1-2026-10-02.md` |
| Current P3 status / gate sequence | `P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md` |

### 6.2 Single-result path

The implementation target is one deterministic server-side path:

`selected option identity → interpretation → measurement → component/profile aggregation → global overallScore → consistency + criticality/coverage → Structured Result → roles/KPIs/economics → persistence/report projections`

`overallScore` is not calculated inside the component aggregator. It is a global result-stage projection over valid measured dimensions using the approved canonical weights.

### 6.3 Experimental module disposition

These existing `p3-*` files remain non-production artifacts until implementation is explicitly authorized:

- `p3-scorer-v1.mts`: canonical response interpretation entry.
- `p3-integrated-scorer-v1.mts`: canonical non-production integration entry.

- `p3-aggregation-engine.mts`: owns component/layer aggregation only.
- `p3-consistency-engine.mts`: owns consistency findings only.
- `p3-criticality-coverage-engine.mts`: owns coverage/criticality only.
- `p3-structured-result-v1.mts`: owns final Structured Result assembly only.

The superseded `p3-score-engine.mts` duplicate was removed from the non-production integration branch. This is an internal artifact cleanup only; no production path was changed.

### 6.4 Persistence and security boundary

The approved production design is additive:
- session provenance fields for interpretation/version/contract/config digest;
- one dedicated Structured Result row per session;
- atomic result + provenance persistence;
- no direct client authority over calculated scores;
- new result persistence must not be directly writable/readable through public application table privileges; access is through the server-authoritative path.

Gate D exit is therefore met: the system has one coherent implementable design without introducing a new scoring rule at implementation time.

No production implementation is authorized by this document.

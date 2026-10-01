# P3 — MD Code Scoring Contract — Draft 1

**Date:** 2026-10-01  
**Status:** **DESIGN BASELINE — NOT YET IMPLEMENTATION-READY**  
**Project:** `core-system-md/clinic-evaluator`

## 1. Contract purpose

This document defines the authoritative scoring contract that the MD Code assessment platform is intended to implement.

It converts:

**MD Code Assessment Model + Owner Guardrails + P3 Gap Analysis + approved D1–D14**

into explicit, typed, testable scoring stages.

This is a **methodology contract**, not merely an implementation specification.

No code or database migration is authorized by this document until the unresolved methodology gates in Section 18 are closed.

---

## 2. Governing principles

### 2.1 One authoritative calculation path

For every completed assessment:

`Pinned Assessment Version + Stored Answers + Scoring Contract`

must produce exactly one official structured result.

The authoritative calculation executes server-side.

The browser is not an official calculation authority.

### 2.2 Assessment content is protected

For the five currently approved assessments:

- question text remains unchanged;
- answer/option text remains unchanged;
- assessment family identity remains unchanged;
- published assessment-version identity remains unchanged.

Scoring configuration may evolve only through explicit versioned methodology/configuration.

### 2.3 Reports never calculate

Reports consume structured results.

A report renderer may:

- select;
- format;
- explain;
- organize;
- soften language appropriately for the audience.

A report renderer may not:

- invent a metric;
- recompute an official score;
- fabricate a benchmark;
- infer an improvement percentage that the engine did not produce;
- generate a monetary result outside a declared economic model.

### 2.4 Full precision internally

All intermediate calculations use full available numeric precision.

Rounding occurs only at explicitly defined output boundaries.

### 2.5 Technical provenance is not product semantic versioning

The engine has a technical immutable identity and a scoring-contract/configuration digest.

This is provenance, not a customer-facing semantic engine-version ladder.

---

# 3. Canonical result pipeline

The authoritative pipeline is:

1. **Load pinned assessment version**
2. **Validate scoring configuration**
3. **Validate answer integrity**
4. **Interpret response values**
5. **Calculate item contributions**
6. **Aggregate raw axis/component results**
7. **Calculate axis normalized scores**
8. **Apply consistency effects, if configured**
9. **Calculate coverage and quality state**
10. **Calculate global result**
11. **Apply critical gates, if configured**
12. **Classify performance band**
13. **Translate measured axes/components to roles**
14. **Calculate KPI results with explicit coverage**
15. **Calculate optional economic models**
16. **Generate structured diagnostic findings**
17. **Attach provenance/reproducibility snapshot**
18. **Persist the official result**

No HTTP handler duplicates any scoring formula.

---

# 4. Input contract

## 4.1 Authoritative inputs

The engine receives:

- `assessment_family_id`;
- `assessment_type_id`;
- pinned assessment version;
- scoring configuration for that version;
- stored answer selections;
- option values resolved from the pinned version;
- session/result metadata required by an enabled model.

The engine does not trust browser-supplied:

- scores;
- weights;
- penalties;
- KPI formulas;
- economic formulas;
- classification results.

## 4.2 Answer integrity

Before scoring, every answer must satisfy:

`question_id belongs to pinned assessment version`

and

`option_id belongs to that question`

and

`selected option value = stored option value`

and, for required questions:

`required question has one answer`

Duplicate answers for the same session/question are invalid.

---

# 5. Response-value contract

## 5.1 Current published assessments

The current five assessments use option values:

`0, 40, 100`

For the current baseline scoring profile:

`response_score = option_value`

No hidden transformation is applied.

Therefore:

- 0 means 0 scoring points;
- 40 means 40 scoring points;
- 100 means 100 scoring points.

This preserves the current mathematical interpretation without changing the visible answer text.

## 5.2 Future response models

Future assessment versions may explicitly declare another response model, for example:

- direct numeric response;
- maturity level;
- categorical mapped score;
- reverse-scored item;
- metric/rate;
- evidence state.

A new response model must declare:

- input type;
- allowed response values;
- transformation;
- maximum;
- missing-value behavior;
- validation rules.

No future response model is implicit.

---

# 6. Item scoring contract

Each scoring item has:

- item identifier;
- component/axis identifier;
- response model;
- interpreted response score;
- maximum response score;
- impact multiplier;
- applicability/required state.

## 6.1 Impact baseline

Current baseline:

`high = 1.5`

`medium = 1.0`

`low = 0.5`

The values are configuration parameters and may be version-owned.

Unknown impact values are invalid configuration, not silently mapped to medium.

## 6.2 Item contribution

For an answered item (j):

`earned_j = response_score_j × impact_multiplier_j`

`max_j = response_max_j × impact_multiplier_j`

For the current 0/40/100 response model:

`response_max_j = 100`

---

# 7. Raw axis/component contract

For component/axis (a):

`earned_a = Σ earned_j`

`max_possible_a = Σ max_j`

where (j) is an applicable answered scoring item assigned to (a).

## 7.1 Raw-score meaning

The canonical meaning of persisted `raw_score` is:

**pre-normalization earned scoring points after item interpretation and approved impact weighting, before normalization to percentage.**

This field must not contain the final percentage.

## 7.2 Raw maximum meaning

`max_possible` is the sum of maximum weighted points for the included applicable scoring items.

It must not be hard-coded to 100.

---

# 8. Axis normalization contract

For each axis/component with:

`max_possible_a > 0`

the normalized score is:

`axis_score_a = clamp(earned_a / max_possible_a × 100, 0, 100)`

If an axis has no applicable scoring material:

`axis_score_a = unavailable`

not automatically zero.

### 8.1 Current live assessments

The existing five assessments currently contain required Layer-A scoring questions for each axis.

The target engine therefore expects normal axis scores for completed current sessions unless configuration declares otherwise.

---

# 9. Consistency / contradiction layer

Consistency is a separate analytical layer.

It has two distinct outputs:

### 9.1 Detection

A rule may detect a contradiction, inconsistency, or response pattern.

Detection output contains:

- rule_id;
- severity;
- affected component/axis;
- evidence references;
- explanatory message;
- status.

### 9.2 Score effect

A consistency rule may declare one of:

- `none`
- `axis_penalty`
- `global_gate`
- `result_warning`

Detection does not automatically imply a score penalty.

## 9.3 Penalty boundary

When a configured rule declares an axis penalty:

`final_earned_a = max(0, earned_a - penalty_a)`

and then normalization is performed using the declared penalty contract.

The exact rule graph, trigger conditions, severity mapping and penalty parameters for the five existing assessments remain a separate methodology gate.

## 9.4 Prohibited shortcut

`options.is_trap` alone is not sufficient to define a consistency rule.

The engine does not infer a trap merely because an option has `is_trap=true`.

---

# 10. Coverage contract

Every assessment result records coverage.

At minimum:

- total items configured;
- applicable items;
- answered items;
- required unanswered items;
- excluded items;
- measured axes/components;
- unmeasured axes/components.

Coverage state is explicit:

- `complete`
- `partial`
- `insufficient`

The engine must never hide missing substantive coverage by replacing it with a guessed score.

---

# 11. Global aggregation contract

Let each eligible axis score be (S_a), with canonical weight (W_a).

Canonical weight representation:

`0 ≤ W_a ≤ 1`

and:

`Σ W_a = 1.00`

Global result:

`overall = Σ(S_a × W_a)`

Only eligible, contractually valid components participate.

The exact missing-axis treatment remains tied to the coverage policy:

- complete coverage → normal aggregation;
- partial coverage → aggregate only according to declared assessment policy and mark result partial;
- insufficient coverage → no authoritative overall score.

No silent substitution of an unavailable axis with the average of other axes is permitted.

---

# 12. Critical-gate contract

The architecture supports non-compensatory gates.

A critical gate may:

- prevent a high overall classification;
- require a warning;
- mark the result as restricted;
- classify the result under a lower permitted band.

A gate operates only when explicitly configured for the assessment version.

No critical gate is inferred from an axis name or low score.

**Exact gate definitions for current/future assessments are not yet frozen.**

---

# 13. Performance-band contract

Q1–Q4 are named **performance bands**, not statistical quartiles.

Current threshold baseline:

- Q1: score < 25
- Q2: 25 ≤ score < 50
- Q3: 50 ≤ score < 75
- Q4: score ≥ 75

The same mathematical band function may be used for axis and overall results only when the assessment version declares that behavior.

The public wording attached to a band is presentation content and must not change the numeric meaning.

Persist:

- band code;
- numeric score;
- band definition/provenance.

Do not persist `quartile` as a statistical claim.

---

# 14. Role translation contract

Roles are a translation layer between measured components and reusable semantic capabilities.

For each mapped axis/component:

`role_score(role) = aggregation(mapped component scores)`

When multiple components map to the same role, the aggregation method must be declared.

Current baseline implementation uses arithmetic mean.

Future versions may declare weighted role composition.

## 14.1 Missing roles

A role that is not measured is:

`unavailable`

It must not be filled from:

- overall score;
- average axis score;
- an unrelated role.

This prevents artificial substantive coverage.

---

# 15. KPI contract

A KPI is a registered derived indicator.

Every KPI definition contains:

- KPI code;
- human meaning;
- input roles/components;
- mapping weights;
- aggregation method;
- minimum coverage requirement;
- availability status rules.

## 15.1 KPI result states

A KPI returns:

- `available`
- `partial`
- `unavailable`

plus, where available:

- numeric value;
- contributing inputs;
- contribution weights;
- coverage ratio;
- provenance.

## 15.2 KPI calculation

For available inputs:

`KPI = Σ(role_score_r × mapping_weight_r) / Σ(mapping_weight_r)`

Only declared available inputs contribute.

Unavailable roles are not replaced with an average.

## 15.3 Default KPI universe

The existing standard KPI registry contains:

`TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI`

and the current admin/reception assessment additionally contains `RRI`.

A KPI is emitted for an assessment only when its availability/mapping contract permits it.

A KPI requested by a report template but unsupported by assessment coverage is not emitted as zero.

---

# 16. Economic Opportunity contract

Economic Opportunity is independent of the core clinical/operational score.

An economic model must declare:

- model code;
- purpose;
- input fields;
- units;
- time basis;
- valid ranges;
- formula;
- assumptions;
- scenario type;
- output units;
- limitations.

## 16.1 Current interactive simulator status

The current UI exposes:

- average visit value;
- visits per month;
- relationship years;
- referral percentage.

The existing endpoint does not use the referral value in its calculation and currently mixes flow/frequency semantics.

Therefore the existing interactive formula is **not accepted as the canonical MD Code economic contract**.

Monetary outputs remain non-authoritative until the economic model is frozen.

## 16.2 Separation rule

Economic outputs may describe:

- current estimate;
- target scenario;
- optimized scenario;
- opportunity gap.

But each output must cite the model and inputs used.

No economic number may be presented as a clinical score or as a guaranteed revenue result.

---

# 17. Rounding contract

## 17.1 Internal calculations

No rounding.

## 17.2 Persisted/calculated outputs

The result contract must specify precision per field.

Recommended baseline:

- raw earned/max: full numeric precision supported by implementation;
- axis percentage: numeric precision suitable for reproducibility, display may show one decimal;
- overall score: full precision internally, presentation may show one decimal;
- weighted contributions: stored with sufficient decimal precision;
- monetary model outputs: model-declared currency precision;
- classification: no rounding concept, categorical.

The important rule is:

**display formatting must not change the calculation input used by subsequent stages.**

---

# 18. Provenance and reproducibility contract

Every authoritative completed result must identify:

- assessment family ID;
- assessment version ID;
- published assessment version;
- technical engine identity;
- scoring contract digest;
- assessment configuration digest;
- result/calculation timestamp;
- session ID;
- input/result lineage.

Recommended canonical identity:

`engine_identity + scoring_contract_digest + assessment_config_digest`

This permits deterministic replay without creating a product-facing engine-version ladder.

## 18.1 Result snapshot

A structured result snapshot should retain, at minimum:

- raw answer selections;
- interpreted response values;
- item contributions where required for audit;
- raw axis/component results;
- normalized scores;
- weights;
- consistency findings;
- coverage;
- role results;
- KPI results;
- economic model inputs/outputs;
- classification;
- diagnostics;
- provenance.

This snapshot is the AI-readiness foundation.

AI may consume the snapshot in the future, but AI is not authoritative over the score.

---

# 19. Structured result contract

The canonical result should conceptually resemble:

```text
AssessmentResult
├── identity
│   ├── session_id
│   ├── family_id
│   ├── assessment_type_id
│   └── assessment_version
├── provenance
│   ├── engine_identity
│   ├── scoring_contract_digest
│   └── assessment_config_digest
├── inputs
│   └── answers[]
├── measurement
│   ├── items[]
│   └── components[]
├── scores
│   ├── axes[]
│   ├── overall
│   └── classification
├── coverage
│   ├── item_coverage
│   ├── component_coverage
│   └── overall_state
├── consistency
│   ├── findings[]
│   └── score_effects[]
├── roles
│   └── role_results[]
├── kpis
│   └── KPIResult[]
├── economics
│   └── EconomicResult[]
├── diagnostics
│   └── findings[]
└── audit
    ├── calculated_at
    └── replay_metadata
```

The exact storage schema can differ from this logical contract, but the information must remain recoverable.

---

# 20. Persistence contract

For each persisted axis/component score, the semantic fields are:

- component/axis ID;
- component name;
- `raw_score` = pre-normalization earned points;
- `max_possible` = pre-normalization maximum;
- `percentage` = normalized component result;
- `weight` = canonical 0–1 assessment weight;
- `weighted_score` = `percentage × weight`;
- `grade/band` = declared performance band where applicable.

The existing persistence layer currently does not satisfy this contract because it stores final percentage in `raw_score` and sets `max_possible=100`.

That is a migration gap.

---

# 21. Legacy-data contract

Historical data is never silently rewritten.

## 21.1 Five completed sessions without score rows

The owner-approved D12 direction is:

1. attempt deterministic reconstruction;
2. if the stored answer/configuration evidence is sufficient, recompute under the explicitly approved contract;
3. if evidence is insufficient, do not invent answers;
4. create a separate retention/deletion decision;
5. no deletion occurs implicitly.

The forensic state verified on 2026-10-01 is that these five completed sessions currently have **zero stored answer rows**.

Their existing lead-level aggregate score is historical data, not sufficient evidence for deterministic axis-level recomputation.

## 21.2 123 orphan score rows

Score rows with `session_id IS NULL` are outside authoritative session-result lineage.

They must:

- remain excluded from new authoritative analytics until disposition;
- not be attached to sessions by guesswork;
- not be deleted without separate forensic/retention approval.

---

# 22. Configuration validation contract

An assessment version cannot be published as scoreable unless validation succeeds.

At minimum validate:

### Identity

- valid family/version identity;
- exactly one published version per family.

### Components

- every component has at least one applicable scoring item;
- component IDs are unique within the version;
- weights are numeric and in [0,1];
- total weight = 1.00 within defined tolerance.

### Items

- valid component assignment;
- declared response model;
- valid impact;
- valid allowed response values;
- required flags coherent.

### Consistency

- every rule references existing items/components;
- rule effect is declared;
- penalty/gate parameters satisfy bounds.

### Roles/KPIs

- mapped components exist;
- mapping weights are valid;
- KPI coverage requirements are coherent.

### Economics

- all model inputs declare units and valid ranges;
- formula references only declared inputs;
- output units are explicit.

A failed validation must block publication.

---

# 23. Diagnostic-output contract

Diagnostics are derived findings, not an independent scoring system.

A diagnostic finding must contain:

- finding ID;
- finding type;
- affected component/role/KPI;
- evidence references;
- severity/priority if configured;
- explanation;
- recommendation category;
- provenance.

A diagnostic finding must be traceable to a real result.

The user-facing diagnostic may be intentionally less detailed than the admin diagnostic, but both must originate from the same structured evidence.

---

# 24. Reporting contract

## 24.1 User report

May present:

- overall score;
- performance band;
- measured axis/component results;
- supported KPI results;
- valid consistency findings;
- validated trend;
- supported economic opportunity;
- diagnostic findings.

Tone:

- professional;
- non-accusatory;
- constructive;
- clear about gaps.

The report should encourage consultation/training where appropriate.

It should not provide a complete implementation/consulting solution solely from the assessment.

## 24.2 Admin report

May additionally present:

- calculation components;
- coverage;
- unavailable/partial KPIs;
- consistency rule evidence;
- economic inputs and assumptions;
- provenance;
- data-integrity flags;
- audit details.

---

# 25. Trend contract

A trend is valid only when comparing compatible results.

Compatibility requires, at minimum:

- same assessment family;
- declared comparison-compatible assessment versions;
- known scoring contract/provenance;
- comparable measured scope.

A result with changed methodology must not be described as a directly comparable improvement/decline without a declared comparability policy.

The UI must not infer that any numeric difference is necessarily an operational improvement.

---

# 26. Comprehensive-assessment contract

The comprehensive assessment architecture must support three composition modes:

### Independent

Each component/family result is evaluated independently.

### Aggregate

Multiple source domains contribute to one declared composite result.

### Hybrid

Some source domains remain independently reportable while also feeding a composite.

The existing `comprehensive-clinic-assessment` must not be changed solely because the architecture supports these modes.

---

# 27. Required deterministic fixtures

The contract is incomplete without deterministic tests.

At minimum the fixture catalog must include:

1. all-zero;
2. all-perfect;
3. mixed responses;
4. high/medium/low impact;
5. missing required answer;
6. missing optional answer;
7. partial coverage;
8. exact band boundaries 24.999 / 25 / 49.999 / 50 / 74.999 / 75;
9. weight validation;
10. consistency detection without penalty;
11. consistency detection with penalty;
12. duplicate role mapping;
13. unavailable KPI role;
14. partial KPI;
15. no applicable scoring items;
16. economic invalid input;
17. economic valid scenario;
18. deterministic replay using provenance snapshot.

---

# 28. Contract acceptance invariants

The implementation is correct only when all of the following are true:

### Invariant A — Reproducibility

Same pinned version + same stored answers + same contract/config digest

→ same official result.

### Invariant B — Content preservation

Scoring-engine migration does not mutate the five current question/answer texts.

### Invariant C — No phantom metrics

Every report metric exists in the structured result.

### Invariant D — No phantom coverage

Unavailable roles/KPIs are not silently scored.

### Invariant E — Weight consistency

Published scoreable versions have canonical weights summing to 1.00.

### Invariant F — Raw-score semantics

`raw_score != percentage` by definition.

### Invariant G — Server authority

Browser cannot submit an official result.

### Invariant H — Economic separation

Economic outputs cannot modify the core assessment score.

### Invariant I — Historical integrity

Historical records are not rewritten without explicit migration provenance.

### Invariant J — Publication safety

Invalid scoring configurations cannot become published scoreable versions.

---

# 29. Implementation boundary

The following are now sufficiently defined to become engineering work without reopening their basic direction:

- server-authoritative calculation;
- pinned family/version;
- response-value baseline for the current five assessments;
- impact baseline;
- canonical weight representation;
- raw/max/percentage separation;
- explicit coverage state;
- role non-imputation principle;
- KPI availability principle;
- performance-band semantics;
- full-precision calculation boundary;
- provenance/digest model;
- structured result requirement;
- report projection boundary;
- economic separation;
- historical-data safety principles.

---

# 30. Remaining methodology decisions before Implementation-Ready

The following must be frozen before production semantic changes:

### MD-D1 — Exact response model for each current assessment

Confirm the five current assessments retain direct `0/40/100` response scoring with no transformation, or explicitly define another mapping.

### MD-D2 — Exact consistency rules

For each current assessment:

- rule IDs;
- referenced questions;
- trigger condition;
- severity;
- affected component;
- score effect;
- penalty parameters;
- message class.

### MD-D3 — Critical gates

Define whether any current/future assessment has non-compensatory critical conditions and their exact behavior.

### MD-D4 — KPI registry/mapping

Freeze which KPIs are substantively supported by each current assessment and their mappings after removing missing-role imputation.

### MD-D5 — Economic model

Freeze the current economic model's units/formula/assumptions or explicitly disable monetary output until a valid model exists.

### MD-D6 — Legacy path disposition

Determine whether `calculate_session_score` and the unused `scoring.ts` adapter are:

- retired;
- quarantined;
- retained for compatibility.

### MD-D7 — Historical scoreless-session disposition

After the verified zero-answer finding, determine retention/deletion handling for the five legacy sessions under a separate migration record.

### MD-D8 — Orphan-score disposition

Investigate and classify the 123 session-less score rows before analytics inclusion or deletion.

---

# 31. Implementation readiness gate

Current state:

| Contract area | Status |
|---|---|
| Architectural direction | **APPROVED** |
| Server authority | **APPROVED** |
| Content protection | **APPROVED** |
| Weight semantics | **APPROVED** |
| Raw-score semantics | **APPROVED** |
| Impact baseline | **APPROVED** |
| Performance bands | **APPROVED** |
| Precision policy | **APPROVED** |
| Provenance direction | **APPROVED** |
| Coverage/non-imputation principle | **APPROVED** |
| Structured result requirement | **APPROVED** |
| Exact current consistency rules | **PENDING** |
| Exact KPI coverage/mappings | **PENDING** |
| Exact economic model | **PENDING** |
| Critical gates | **PENDING** |
| Legacy disposition | **PENDING** |
| Historical reconciliation | **PENDING** |
| Orphan data disposition | **PENDING** |

**Conclusion: NOT IMPLEMENTATION-READY.**

The contract is structurally ready for the remaining decision records, but it must not be converted into production semantic changes until the pending methodology decisions are frozen.

---

# 32. Next canonical artifact

The next artifact is a **P3 Decision Record Pack** covering the remaining methodology decisions in Section 30.

After those decisions are closed, this contract can be promoted from **Draft 1** to **Frozen Contract** and implementation-ready work can begin.

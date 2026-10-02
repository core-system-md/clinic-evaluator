# P3 — Structured Result Contract — Draft 1
## 2026-10-02

**Status:** design-only / non-production  
**Purpose:** close P3-NEXT-05.

## 1. Canonical principle

One completed assessment produces one authoritative structured result.

Reports, admin views, diagnostics, KPIs, future AI consumers, and persistence projections consume this result.

They do not independently calculate scores.

## 2. Logical result

```
AssessmentResult {
  identity
  provenance
  inputs
  measurement
  profile
  scores
  coverage
  consistency
  criticality
  development
  roles
  kpis
  economics
  diagnostics
  classification
  audit
}
```

## 3. Identity

Required:

- session_id
- assessment_family_id
- assessment_type_id
- assessment_version
- result_id
- calculated_at

Completed sessions must retain the assessment version that was actually used.

## 4. Provenance

Required:

- engine_identity
- scoring_contract_digest
- assessment_config_digest
- interpretation_version
- scoring_engine_version
- calculation_timestamp
- input lineage

The interpretation version is distinct from the assessment version.

## 5. Inputs

For each submitted response preserve:

- question_id / question_code
- option_id
- option_index
- source option_value
- selected option identity
- response interpretation identity
- answer timestamp where available

Raw/source values are retained for audit.

## 6. Measurement layer

Each interpreted item can expose:

- semantic_state_key
- measurement_type
- primary_construct
- component_code
- measurement_layer
- direction
- score_mode
- anchor_scale_id
- anchor_score
- score_eligible
- criticality
- consistency_role
- evidence_role
- context_required
- rationale
- provenance

## 7. Profile

The profile is the primary product result.

Structure:

```
profile {
  components[] {
    component_code
    constructs[]
    performance
    maturity
    evidence
    coverage
    context_signals[]
    consistency_signals[]
    critical_findings[]
    development_signals[]
    provenance
  }
}
```

Not every component contains every layer.

Unsupported layers remain unavailable.

## 8. Scores

Where a numeric score is legitimately produced:

```
score {
  raw_score
  max_possible
  percentage
  score_mode
  coverage_state
  band
  provenance
}
```

Invariant:

`raw_score` is earned pre-normalization points, not the displayed percentage.

## 9. Coverage

At item, component, and overall levels preserve:

- expected_applicable
- answered
- scored
- missing
- semantic_only
- evidence_only
- signal_only
- unsupported
- not_applicable
- coverage_ratio
- coverage_status

Coverage status is independent of performance band.

## 10. Consistency

```
consistency {
  findings[] {
    rule_id
    rule_version
    input_items[]
    relationship_type
    trigger_state
    severity
    affected_components[]
    finding_code
    explanation
    review_required
    score_effect
    provenance
  }
}
```

No finding is silently converted to a penalty.

## 11. Criticality

```
criticality {
  findings[] {
    item_or_rule_source
    status
    severity
    affected_components[]
    evidence_state
    review_required
    explanation
  }
}
```

Criticality is not a weight.

## 12. Development opportunity

```
development {
  signals[] {
    signal_id
    domain
    source_items[]
    component
    current_state
    evidence_state
    pathway
    priority_state
    provenance
  }
}
```

Development opportunity is evidence-derived and is not:

`100 - overall_score`

## 13. Roles

Each role result contains:

- role_code
- status = available | partial | unavailable
- source_components[]
- value when available
- coverage
- provenance

Unavailable roles are never imputed from unrelated scores.

## 14. KPIs

Each KPI result contains:

- kpi_code
- status = available | partial | unavailable
- value when available
- input_components/roles
- coverage
- mapping version
- provenance
- limitations

A KPI measuring capability must not be presented as an observed business outcome.

## 15. Economics

Each economic result contains:

- model_code
- model_version
- status
- inputs
- assumptions
- output
- unit
- scenario
- limitations
- provenance

Economic output cannot alter core assessment scores.

## 16. Diagnostics

Each diagnostic finding contains:

- finding_id
- type
- source_items[]
- affected_components[]
- severity
- explanation
- recommendation_category
- evidence_state
- provenance

Diagnostics are projections of structured evidence, not a second scoring engine.

## 17. Classification

Classification stores:

- band_code
- numeric_basis
- band_definition_version
- provenance

Q1–Q4 are performance-band labels, not statistical quartiles.

## 18. Audit / replay

A result must be replayable from:

`pinned assessment version + stored answers + interpretation version + scoring contract/config digest`

The result must preserve enough lineage to determine why a score/finding existed.

## 19. Compatibility

The structured result is compatible with:

- current legacy axis persistence;
- future component persistence;
- user report;
- admin report;
- API responses;
- future AI analysis.

A projection may omit fields for presentation, but may not invent fields that are absent from the canonical result.

## 20. Versioning

Changes to any of the following require explicit versioning:

- response interpretation;
- aggregation contract;
- consistency rule catalog;
- critical gate behavior;
- KPI mapping;
- economic model;
- scoring engine contract.

A published assessment version must remain reproducible with the interpretation/configuration used for its results.

## 21. Production safety invariants

The structured result must prevent:

- option index becoming score;
- option_value becoming universal score;
- missing becoming zero;
- unsupported roles becoming averages;
- critical findings disappearing inside an overall score;
- consistency becoming automatic penalty;
- measurement capability becoming outcome;
- digital capability becoming clinical outcome;
- report recalculation.

## 22. Gate result

**P3-NEXT-05: CLOSED for design.**

The canonical result shape is now defined sufficiently to implement a typed internal contract and adapter.

Still pending before final production scorer:
- exact numeric aggregation decisions;
- exact consistency score effects (if any);
- critical gates;
- KPI mapping freeze;
- economic model freeze;
- historical reconciliation policy;
- deterministic fixture execution.

**Production impact:** documentation only.

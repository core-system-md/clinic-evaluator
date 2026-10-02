# P3 — Consistency / Indirect-Verification Rule Registry — Draft 1
## 2026-10-02

**Status:** design-only / non-production  
**Purpose:** close P3-NEXT-03 structurally without reactivating historical trap penalties.

## 1. Rule model

`answers → detect relationship → diagnostic finding`

not:

`answer → trap flag → automatic penalty`

A rule is a separate versioned object.

Required fields:

- rule_id
- rule_version
- assessment_scope
- input_items
- relationship_type
- trigger
- severity
- affected_components
- finding_code
- interpretation
- review_required
- score_effect

## 2. Score effect

Default for every rule in this registry:

`score_effect = NONE`

No historical penalty is reactivated.

A future rule may only declare a numeric effect after:
- semantic validation;
- owner-approved methodology;
- synthetic tests;
- historical sensitivity analysis;
- production migration design.

## 3. Rule classes

### CR-001 — Claim vs Measurement Gap

**Relationship:** a response claims an established measurement practice while a related measurement/evidence item reports absence or non-systematic measurement.

**Output:** EVIDENCE_GAP / REVIEW.

**No automatic penalty.**

### CR-002 — Standardization vs Provider/Case Variability

**Relationship:** an item represents a stable institutional process while a related response identifies provider/case-dependent execution.

**Output:** VARIABILITY_SIGNAL.

**Interpretation:** the signal indicates a need to inspect whether variability is legitimate contextual adaptation or absence of a repeatable system.

**No automatic penalty.**

### CR-003 — Practice Claim vs Evidence Limitation

**Relationship:** a response describes a strong practice, while the related evidence role is explicitly NOT_TRACKED / unavailable.

**Output:** UNVERIFIED_CLAIM.

This does not mean the practice is false.

### CR-004 — Resilience Claim vs Operational Disruption

**Relationship:** a strong resilience response conflicts with another item describing repeated disruption under the same operational condition.

**Output:** RESILIENCE_CONSISTENCY_REVIEW.

### CR-005 — Follow-up System vs Follow-up Absence

**Relationship:** a response indicates an established follow-up system while a related response indicates no follow-up or purely reactive follow-up.

**Output:** FOLLOWUP_CONSISTENCY_REVIEW.

### CR-006 — Measurement Capability vs Outcome Claim

**Relationship:** an item establishes the ability to measure CAC/LTV/conversion/retention/experience, while another interpretation would otherwise be treated as the outcome itself.

**Output:** MEASUREMENT_NOT_OUTCOME.

This rule is a semantic guard, not a contradiction penalty.

### CR-007 — Critical Practice vs Contextual Exception

**Relationship:** a critical domain has a stable practice claim while another response marks provider/case-dependent behavior.

**Output:** CRITICAL_CONTEXT_REVIEW.

The criticality channel remains separate from numeric score.

### CR-008 — Indirect Verification Pair

**Relationship:** an indirect-verification response is compared with a related direct-practice/evidence response.

**Output:** VERIFICATION_SIGNAL.

The response is not labeled false or dishonest. It is simply marked for corroboration.

## 4. Rule evaluation order

1. validate item identity and assessment scope;
2. resolve ResponseInterpretation for each input;
3. classify relationship;
4. evaluate trigger;
5. create finding;
6. attach provenance;
7. determine affected components;
8. expose review_required;
9. apply score_effect only if the rule version explicitly permits it.

## 5. Severity

Allowed semantic severity:

- INFO
- ATTENTION
- MATERIAL
- CRITICAL

Severity is not a percentage and is not a score.

## 6. Finding shape

```
ConsistencyFinding {
  ruleId
  ruleVersion
  assessmentTypeId
  sessionId
  inputItems[]
  relationshipType
  triggerState
  severity
  findingCode
  affectedComponents[]
  explanation
  reviewRequired
  scoreEffect
  provenance
}
```

## 7. Trap compatibility

Existing `options.is_trap`, `questions.trap_for`, and `public.traps` are historical/source metadata.

They are not independently authoritative.

Before any future migration:
- reconcile all three representations;
- resolve invalid references;
- define one canonical rule source;
- version the rule catalog.

Until then, no trap flag may create a numeric penalty.

## 8. Missingness

A missing input cannot satisfy a contradiction rule.

The engine must distinguish:

- MISSING_INPUT
- NOT_APPLICABLE
- UNSUPPORTED
- UNVERIFIED
- VALID_RELATIONSHIP

A rule requiring unavailable evidence returns an evidence/coverage finding rather than a contradiction.

## 9. Cross-assessment boundary

Rules compare items only when their relationship is explicitly valid within the same assessment/session/version context.

The engine must not create contradictions merely because two different assessment families measure related constructs differently.

## 10. Owner methodology alignment

This registry preserves:

- assessment ≠ accusation;
- semantic state ≠ numeric score;
- consistency ≠ automatic penalty;
- criticality ≠ automatic penalty;
- evidence gap ≠ performance zero;
- contextual variability ≠ bad performance by default.

## 11. Gate result

**P3-NEXT-03: structurally CLOSED for design.**

Closed:
- rule object;
- trigger flow;
- severity model;
- finding shape;
- no-penalty default;
- missingness handling;
- trap reconciliation requirement;
- cross-assessment boundary.

Still required before any numeric rule effect:
- concrete rule fixture set;
- synthetic edge-case tests;
- sensitivity analysis;
- owner-approved score-effect policy, if any.

**Production impact:** documentation only.

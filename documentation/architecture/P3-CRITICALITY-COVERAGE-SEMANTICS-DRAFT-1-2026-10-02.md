# P3 — Criticality & Coverage Semantics — Draft 1
## 2026-10-02

**Status:** design-only / non-production  
**Purpose:** close P3-NEXT-04.

## 1. Criticality is an independent channel

Criticality is not:
- an item weight;
- a component weight;
- a score multiplier;
- an automatic penalty.

It is a structured safety/professional signal that must remain visible even when a profile has strong performance elsewhere.

## 2. Criticality states

Allowed states:

- NORMAL
- ATTENTION
- CRITICAL_FINDING
- UNVERIFIED

Interpretation:

### NORMAL
No critical concern is represented by the available response.

### ATTENTION
The response identifies a condition worth review but does not establish a critical failure.

### CRITICAL_FINDING
The response directly represents a critical deficiency in the construct being measured.

### UNVERIFIED
The claim/evidence relationship is insufficient to determine the critical state confidently.

## 3. Critical domains

The initial criticality candidates are:

- patient privacy/confidentiality;
- patient understanding / teach-back;
- information continuity where loss could affect safe continuity;
- professional conduct;
- other safety-critical constructs only when explicitly mapped.

Criticality must be assigned at interpretation level and/or rule level, not inferred from option value.

## 4. Critical finding behavior

A critical finding:

- remains visible in the structured result;
- identifies source item(s);
- identifies affected component(s);
- carries evidence state;
- may set review_required;
- does not silently subtract points.

A future gate that changes eligibility or publication status requires an explicit versioned rule.

## 5. Coverage model

Coverage is measured separately for each component/layer.

Minimum fields:

- expected_applicable_items
- answered_items
- scored_items
- missing_items
- semantic_only_items
- evidence_only_items
- signal_only_items
- unsupported_items
- not_applicable_items
- coverage_ratio
- coverage_status

## 6. Coverage states

Allowed status:

- NOT_MEASURED
- PARTIAL
- ADEQUATE
- FULL
- UNSUPPORTED

The exact threshold values are intentionally not frozen here.

The status must not be confused with a performance grade.

## 7. Denominator rule

The denominator contains only items applicable to the requested component/layer and assessment scope.

Therefore:

- missing ≠ zero;
- unsupported ≠ zero;
- semantic-only ≠ zero;
- another component's items do not fill the denominator;
- unavailable components do not receive imputed scores.

## 8. Criticality × coverage

A critical domain with insufficient coverage must be represented as:

`critical_status = UNVERIFIED`

rather than being silently treated as safe.

A critical finding with adequate evidence remains:

`critical_status = CRITICAL_FINDING`

even if the component average is high.

This prevents compensatory averaging from hiding a critical issue.

## 9. Applicability

The current assessment data does not expose a universal N/A response state.

Future N/A support must be a distinct semantic state, not option value 0.

## 10. Evidence relationship

Coverage does not equal evidence strength.

Example:

- 100% of respondents answered a self-report item;
- evidence state may still be SELF_REPORTED_MEASUREMENT / UNVERIFIED.

The result must preserve both.

## 11. Development signals

Coverage gaps can produce development signals such as:

- measurement setup;
- documentation;
- process clarification;
- evidence collection.

A coverage gap is not automatically a performance weakness.

## 12. Gate result

**P3-NEXT-04: CLOSED for design semantics.**

Closed:
- criticality independent from score;
- critical state vocabulary;
- critical finding visibility;
- coverage as first-class metadata;
- missing/unsupported/semantic-only separation;
- denominator rules;
- criticality × coverage behavior;
- N/A separation.

Still required:
- empirical threshold calibration for coverage status;
- concrete fixture tests;
- integration into structured result.

**Production impact:** documentation only.

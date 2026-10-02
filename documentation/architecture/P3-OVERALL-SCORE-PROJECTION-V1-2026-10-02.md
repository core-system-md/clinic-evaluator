# P3 — Existing overallScore Projection V1
## 2026-10-02

**Status:** Design / non-production  
**Purpose:** define the already-approved `overallScore` construction precisely enough for integration, without introducing a new score.

## 1. Existing result

The product already exposes `overallScore` / **معدل الكفاءة العام**.

P3 retains it. It is not a new “summary score”.

## 2. Dimension boundary

For the five current published assessment families, the global dimensions are the existing **assessment axes**.

The axis is the current dimension boundary because:
- every current question is assigned to exactly one existing axis;
- the existing production result already exposes axis scores;
- each current axis already has an existing weight;
- the approved P3 decision is a weighted arithmetic mean of valid measured dimensions.

P3 does not introduce component weights.

## 3. Axis score

For one axis, numeric score is calculated from its eligible answered items:

`axisScore = mean(anchorScore / anchorMax × 100)`

Eligibility requires:
- selected option identity resolves through the P3 response registry;
- `scoreMode = DIRECT_ANCHOR`;
- `scoreEligible = true`;
- finite `anchorScore`;
- finite positive `anchorMax`.

Equal item weighting is used within the axis for V1.

Semantic-only, evidence-only, contextual, unsupported, and missing states remain non-numeric for this calculation but remain represented in coverage/evidence.

## 4. overallScore

Let each valid measured axis have:
- `axisScore` in 0..100;
- canonical axis weight `w` in 0..1.

Then:

`overallScore = Σ(axisScore × w) / Σ(w)`

Only valid measured axes participate.

Unavailable axes are excluded from both numerator and denominator.

There is no zero-fill, fallback, role imputation, component reweighting, consistency penalty, or criticality penalty.

No internal rounding is applied.

## 5. Weight source

The dimension weights are the existing published assessment-axis weights, normalized to canonical 0..1 representation at runtime.

Current live published sums are:
- Admin/Reception: 1.00
- Clinic Performance: 1.00
- Comprehensive Clinic: 1.00
- Medical Team: 1.00
- Patient Journey: 1.00

The weights are configuration owned by the assessment version; P3 does not invent replacement values.

## 6. Relationship to components

Components remain the semantic measurement/profile layer.

The overall projection does not weight components directly.

A question may be represented in a semantic component and still contributes to its existing axis dimension through its resolved numeric measurement when eligible.

## 7. Relationship to analysis layers

Consistency and criticality are separate analytical channels.

- consistency does not reduce `overallScore`;
- criticality does not reduce `overallScore`;
- coverage controls whether a dimension is measurable, not by inventing a numeric zero.

## 8. Determinism

Given:
- pinned assessment family/version;
- pinned interpretation version;
- same selected option identities;
- same axis configuration/weights;
- same contract/config digests;

the computed `overallScore` must be deterministic.

## 9. Boundary

This is an integration contract only. It does not replace the production scorer or authorize database/schema changes.

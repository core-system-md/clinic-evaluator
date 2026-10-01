# P3 — Measurement Model Audit

**Date:** 2026-10-01  
**Status:** Evidence / Design Input — not implementation authorization

## Purpose

This document records the first methodology audit of the five published assessments after the owner clarified that P3 is a re-correction of the assessment/scoring construction, not a compatibility exercise.

The objective is not to preserve the current arithmetic. The objective is to establish a measurement model that produces results that are mathematically and substantively defensible while preserving the current visible assessment content unless a separate content decision is required.

## Governing principle

- **Content preservation:** current question and visible answer text are protected during this engineering stage.
- **Scoring preservation:** current numerical option values are **not** protected.
- **Methodology correction:** if the current numerical mapping does not correctly represent the intended measurement, it must be replaced rather than wrapped with compensating formulas.

> Preserving assessment content does not mean preserving a flawed scoring model.

## Verified structure

The five published assessments currently contain:

| Assessment | Questions | Options/question | Current option-value pattern |
|---|---:|---:|---|
| patient-journey | 25 | 3 | 0 / 40 / 100 |
| clinic-performance | 9 | 5 | 0 / 0 / 40 / 100 / 100 |
| medical-team-assessment | 12 | mixed | predominantly 0 / 40 / 100 |
| admin-reception-assessment | 11 | 3 | 0 / 40 / 100 |
| comprehensive-clinic-assessment | 36 | 3 | 0 / 40 / 100 |

The current database therefore does **not** contain one uniform response scale in terms of option count. In particular, clinic-performance has five ordered answer levels while three numerical values are reused, causing distinct response levels to collapse onto the same score.

## Finding 1 — 0/40/100 is not a sufficient universal response model

A numeric option value is only meaningful if it represents a declared measurement scale.

For clinic-performance, five ordered answer states are mapped to 0, 0, 40, 100, 100. The current scoring therefore loses information: the first two response states become mathematically identical, and the last two response states become mathematically identical.

This is a measurement-model problem, not a code problem.

## Finding 2 — The assessments contain different kinds of measurement

The current questions do not all measure the same construct. Examples observed in live content include process maturity/standardization, operational capability, communication practice, continuity/follow-up behavior, existence of measurement systems, quality of a documented process, and degree of systematic implementation.

Therefore a single universal transformation should not be assumed before item semantics are classified.

## Finding 3 — Option ordering appears meaningful in many current items

Many current answer sets are ordered from less structured or less systematic practice toward more structured or systematic practice. This suggests that many items are ordered categorical/ordinal measurements rather than arbitrary 0–100 quantities.

That is a strong candidate for the new response model, but it must be verified item-by-item rather than assumed for every question.

## Finding 4 — Equal distance between answer levels is not automatically justified

Even when options are ordered, the distance between levels is not necessarily equal. Therefore the new model must explicitly choose between ordinal banding without pretending equal numeric distance, calibrated numeric scoring where evidence justifies distances, or another item-specific model.

The engine should not hide this methodological choice inside a generic formula.

## Finding 5 — Impact is a weighting/importance concept, not a response score

The current high/medium/low impact values are conceptually separate from what an answer means. The approved baseline remains high=1.5, medium=1.0, low=0.5, but this should be treated as an importance/aggregation weight, not as a correction for a weak response scale.

## Finding 6 — Axis aggregation is only valid after item semantics are valid

The architecture of items → axis/component → overall is sound. But averaging item scores is not automatically valid simply because the code can do it.

Before aggregating items into one axis, we need to establish that the items are sufficiently related to the intended construct or that the axis is deliberately formative and each item contributes a defined component of the construct.

## Finding 7 — Missingness must remain distinct from low performance

The new model must distinguish low measured performance, unmeasured dimensions, not-applicable states if introduced, and insufficient data quality. A missing dimension must never become a low score merely to make the mathematical output complete.

## Proposed P3 measurement construction

The next design stage should build an **Item Measurement Registry** for all 93 current questions.

Each item should declare:
1. construct — what the question actually measures;
2. measurement type — ordinal, binary, frequency, evidence/capability, or another justified type;
3. direction — whether higher response state means better or worse measured performance;
4. response states — the ordered states represented by the existing visible answers;
5. scoring transformation — the mathematical mapping, if a numeric score is justified;
6. applicability/missing rule;
7. impact/importance weight;
8. axis/component membership;
9. evidence level — self-report, operational record, observed evidence, or another declared source;
10. rationale/provenance.

This registry becomes the bridge between the human assessment content and the scoring engine.

## Important consequence

We should **not implement the new scorer yet**.

The next implementation-ready prerequisite is to finish the Item Measurement Registry and determine the response model from the actual content.

The architecture remains: Assessment Version → Item Measurement Registry → Response Interpretation → Item Score → Axis/Component → Coverage → Consistency → Overall → Roles → KPIs → Economics → Diagnostics → Structured Result → Reports.

## Explicit non-decisions

This audit does **not** approve direct 0/40/100 scoring, 0/50/100, rank-based scoring, equal-distance assumptions, any KPI coverage threshold, any economic formula, or any trap penalty.

## Next owner decision boundary

The next material decision should be presented only after the 93-item registry has been analyzed enough to answer: **What kind of measurement is each current question, and what scoring transformation preserves the information and meaning of its answer choices without changing the visible content?**

That is the correct decision boundary before rewriting the scoring engine.
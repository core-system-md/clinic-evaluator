# P3 — Response Interpretation Schema — Draft 1 — 2026-10-02

**Status:** implementation design / non-production

## Purpose

Introduce an explicit interpretation layer between selected options and scoring.

`option identity → response interpretation → construct/component representation → aggregation`

## Proposed logical entity

`assessment_option_interpretations`

### Identity
- id UUID
- assessment_type_id UUID
- question_id UUID
- option_id UUID
- interpretation_version INTEGER

Unique key:
`(assessment_type_id, option_id, interpretation_version)`

## Interpretation fields

- semantic_state_key TEXT NOT NULL
- measurement_type TEXT NOT NULL
- primary_construct TEXT NOT NULL
- component_code TEXT NOT NULL
- measurement_layer TEXT NOT NULL
- direction TEXT NOT NULL
- score_mode TEXT NOT NULL
- anchor_scale_id TEXT
- anchor_score NUMERIC(6,2)
- score_eligible BOOLEAN NOT NULL
- criticality TEXT NOT NULL
- consistency_role TEXT NOT NULL
- evidence_role TEXT NOT NULL
- context_required BOOLEAN NOT NULL
- scoring_rationale TEXT NOT NULL
- provenance TEXT
- created_at TIMESTAMPTZ

## Allowed score modes

- DIRECT_ANCHOR
- MATURITY_5_STATE
- SEMANTIC_ONLY
- EVIDENCE_ONLY
- SIGNAL_ONLY

## Allowed directions

- POSITIVE
- NEGATIVE
- NON_MONOTONIC
- CONTEXTUAL
- NOT_APPLICABLE

## Important invariant

`anchor_score` is not required when `score_mode` is semantic/context/evidence/signal only.

`option_value` remains historical/source data and is not the authoritative interpretation.

## Consistency

Response interpretation does not calculate penalties.

It can expose:
- VALIDATOR
- TARGET
- CONTEXT_SIGNAL
- SUBJECT_TO_RULE
- NONE

A separate consistency rule engine decides whether a relationship produces a diagnostic or any future score effect.

## Criticality

Criticality is not a weight and does not imply a numeric penalty.

Examples:
- privacy → HIGH criticality
- patient understanding → HIGH criticality
- ordinary operational maturity → NORMAL unless domain evidence requires otherwise

## Version pinning

Completed sessions should eventually pin:
- assessment_type_id
- assessment_version
- interpretation_version
- scoring_engine_version

This preserves reproducibility when interpretation changes.

## Migration sequencing

1. Create interpretation table/schema.
2. Populate registry in non-production.
3. Validate all 93 questions and all current options.
4. Add session pinning support.
5. Implement scorer adapter that reads interpretation records.
6. Run historical/synthetic comparison.
7. Only after verification, publish a new assessment/scoring version.

## Explicit non-goals

- No question text changes.
- No option text changes.
- No silent historical score rewrite.
- No automatic 0/30/50/80/100 conversion.
- No automatic penalties from trap metadata.
- No production migration in this draft.
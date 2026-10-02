# P3 — Scale Disposition and Scoring Worklist — 2026-10-02

**Status:** Design / implementation preparation — non-production
**Source:** published assessment definitions in Supabase, read-only review
**Scope:** 93 questions

## Executive decision

The project is no longer evaluating scoring scales by option count.

The governing rule is:
`question construct → response semantics → direction → response role → numeric anchor`

not:
`option count → numeric scale`

## Current inventory

| Assessment | Questions | Current response pattern |
|---|---:|---|
| admin-reception-assessment | 11 | 3-state, predominantly 0/40/100 |
| clinic-performance | 9 | 5-state, currently 0/0/40/100/100 |
| medical-team-assessment | 12 | mixed 3-state and 4-state |
| comprehensive-clinic-assessment | 36 | 3-state, predominantly 0/40/100 |
| patient-journey | 25 | 3-state, predominantly 0/40/100 |
| **Total** | **93** | mixed semantic encodings |

## Five-option disposition

### Keep current encoding
- Q4 — pricing framework: `0/0/40/100/100`
- Q5 — conversion measurement: `0/0/40/100/100`
- Q6 — reception training: `0/0/40/100/100`

Reason: indirect verification/claim-vs-practice behavior. A sophisticated claim is not automatically a higher observed performance state.

### Continue semantic review before any numeric change
- Q1 — patient data registration/management
- Q2 — post-visit follow-up
- Q3 — scheduling
- Q7 — no-show procedure
- Q8 — performance measurement tools
- Q9 — return/referral mechanism

The five-option rule is closed: use 0/30/50/80/100 only when the five actual states form a coherent maturity/capability progression. Otherwise retain the existing semantic handling. No automatic global conversion is authorized.

## Four-option disposition

### Retain current encoding
- Q8b0866: `0/40/100/0`
- Q03dc5a: `0/40/100/40`
- Q0a8cea: `0/40/100/40`
- Q6c6668: `0/40/100/40`
- Q76b7ab: `0/40/100/40`
- Q4084c8: `0/40/100/40`
- Q8e7ea4: `100/40/0/0`

Reason: the fourth state may represent variability/context rather than a fourth ordinal level.

### Specific semantic correction — CLOSED BY OWNER DECISION
- Q2c9f29: `100/40/0/0` → design correction `100/40/40/0`

Reason: the third state indicates weak/repeated misunderstanding, but is not equivalent to total absence of measurement/practice. The fourth state is an evidence gap.

**No production value has been changed.**

## Three-option disposition

The presence of `0/40/100` is not itself sufficient to declare an interval scale.

Each three-state item must pass:
- coherent construct;
- clear direction;
- meaningful intermediate state;
- no hidden context-dependent state;
- no confusion between practice and evidence;
- no confusion between maturity and outcome.

Items that fail these conditions move to semantic/context/consistency interpretation rather than arbitrary numeric interpolation.

A known example requiring this treatment is Patient Journey Q7 (first patient experience), which should not be assumed to be a pure ordinal scale merely because it has three options.

## Critical and verification questions

The following are not allowed to become automatic numeric penalties:
- privacy;
- patient understanding;
- variability by provider;
- variability by case;
- evidence gaps;
- claim-vs-practice inconsistencies.

They may produce:
- critical flag;
- consistency signal;
- evidence gap;
- diagnostic finding;
- coverage state.

## Implementation contract

The future scorer must consume:
`selected option → ResponseInterpretation → construct-specific score/signal → component aggregation`

and must not consume:
`selected option → option_value → universal average`

Required response interpretation fields remain:
- semantic_state_key
- measurement_type
- primary_construct
- component
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
- interpretation_version

## Production gate

Before changing the production scorer or published options:
1. complete response interpretation registry for all 93 questions/options;
2. owner-reviewable scale disposition;
3. component aggregation contract;
4. consistency-rule specification;
5. historical result compatibility/recalculation policy;
6. unit tests and synthetic edge cases;
7. implementation and verification.

**Production status: unchanged.**
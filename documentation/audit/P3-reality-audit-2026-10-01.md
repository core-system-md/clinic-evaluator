# P3 Reality Audit — Assessment / Scoring Engine

**Date:** 2026-10-01  
**Status:** **INVESTIGATION COMPLETE / DECISIONS PENDING / NO P3 SEMANTIC CHANGES AUTHORIZED**
**Project:** `core-system-md/clinic-evaluator`

## 1. Purpose

P3 investigates the actual scoring system before changing it. The objective is to establish the authoritative scoring contract, identify every scoring path and dependency, compare documented methodology with the deployed implementation and live production data, and isolate decisions that belong to the project owner.

Per the project contract, a scoring change is not justified merely because the current implementation can be made cleaner. Measurement intent must be established first.

## 2. P3 scope

The roadmap defines P3 as:

- scoring semantics;
- missing-role behavior;
- normalization and weighting;
- impact levels;
- trap behavior;
- KPI calculation;
- EV model definition;
- deterministic test fixtures;
- engine versioning and reproducibility.

For this investigation the scope was expanded to include input validation, result persistence semantics, legacy scoring paths, and runtime performance/provenance because those directly affect correctness and reproducibility.

## 3. Current authoritative runtime path

Current production completion path is:

`assessment session/access → concrete pinned assessment version → answers → answer/option integrity validation → server score-engine → axis scores → global score → role scores → KPIs / EV → score rows → completion RPC → lead/session state`

The browser no longer performs the official score calculation.

## 4. Actual scoring implementation

### 4.1 Server engine

`supabase/functions/assessment-access/score-engine.ts` is the active scoring engine used by the production `complete` action.

Implemented behavior:

1. Only non-`B` questions contribute to raw axis scoring.
2. Impact multipliers are hard-coded as high `1.5`, medium `1.0`, low `0.5`.
3. Axis percentage is calculated from earned points divided by weighted maximum possible points, then clamped to `[0,100]` and rounded.
4. Global score is a weighted mean of axis scores using axis `weight` and is rounded to an integer.
5. Classification is Q1/Q2/Q3/Q4 using 25/50/75 thresholds.
6. Leakage index is `100 - overallScore`.
7. Axis scores are translated into roles using `axis_roles`.
8. Missing roles receive the arithmetic average of all available axis scores, with `50` as the no-axis fallback.
9. KPI values are weighted averages over role scores.
10. EV inside the scoring engine is based on the configured EV mapping, `delta_c_max`, flow and LTV, with factors `0.7`, `1.25`, and `0.55` for current/potential/gap.

### 4.2 Runtime completion

`assessment-access/index.ts` loads the session-pinned concrete assessment version, validates that the session's stored `assessment_version` matches the runtime version, validates every stored answer against the correct option for that version, requires all required questions, then calls the scoring engine.

The score rows subsequently written to `scores` currently contain:

- `percentage` = final axis percentage;
- `weight` = axis weight;
- `weighted_score` = percentage × weight;
- `raw_score` = **also the final axis percentage**;
- `max_possible` = `100`.

The last two fields reveal a persistence-semantics mismatch: the column named `raw_score` is not currently a raw earned score.

## 5. Legacy scoring paths

### 5.1 Documented RPC that is not present

Earlier documentation refers to `complete_assessment_with_server_scoring(...)`. Production does not contain this function. The active completion functions are `complete_assessment_session(...)` and `complete_public_assessment_session(...)`, invoked by the privileged Edge Function.

### 5.2 Legacy `calculate_session_score`

`public.calculate_session_score(uuid)` still exists and computes an unrelated legacy average-answer formula (`AVG(answer_value) * 20`) with letter grades. It is not the authoritative scorer and is not executable by `anon` or `authenticated`.

### 5.3 Unused `scoring.ts` adapter

`supabase/functions/assessment-access/scoring.ts` still calls the nonexistent `complete_assessment_with_server_scoring(...)` RPC. It is not the active production scoring path and requires a P3 disposition decision.

## 6. Production data reality

Current live assessment configuration contains five published v1 assessments:

| Assessment | Questions | Axes | Axis weight representation | Trap rows | EV |
|---|---:|---:|---|---:|---|
| admin-reception-assessment | 11 | 4 | 35/25/25/15 (sum 100) | 1 | enabled |
| clinic-performance | 9 | 3 | 0.50/0.30/0.20 (sum 1) | 0 | enabled |
| comprehensive-clinic-assessment | 36 | 6 | 20/20/20/15/15/10 (sum 100) | 0 | disabled |
| medical-team-assessment | 12 | 4 | 0.35/0.30/0.20/0.15 (sum 1) | 0 | enabled |
| patient-journey | 25 | 5 | 0.20/0.15/0.25/0.25/0.15 (sum 1) | 0 | enabled |

All current questions are layer A; all are required; all current questions use `medium` impact. Options across all five assessments are only `0`, `40`, and `100`.

Current production sessions: 35 total, 22 completed, 13 in progress. All 35 carry `scoring_engine_version = server-score-v1`.

Current `scores`: 193 rows across 17 sessions. Five completed sessions currently have no score rows. This is a historical/persistence integrity item to reconcile in P3; it must not be silently rewritten.

## 7. Trap system findings

The current trap model is internally inconsistent.

- Only one row exists in `public.traps`, for `admin-reception-assessment`.
- That row references question codes `Q1`, `Q2` and axis code `A1`, but those codes do not exist in that assessment; the references are invalid.
- Four of the five assessments have `has_traps = true`, while their `traps` table contains no rows.
- There are `options.is_trap = true` rows in admin-reception, comprehensive-clinic, and medical-team assessments, but the active score engine does not use `options.is_trap` for penalty calculation.
- No current question is `layer = B`, and `questions.trap_for` does not currently provide the active penalty graph used by the server scorer.

Therefore trap behavior cannot currently be treated as a single proven production methodology. The database contains multiple historical representations, while the server scorer uses only `public.traps`.

## 8. Impact and normalization findings

The engine has explicit impact branches, but production data does not currently exercise high/low impact: all live questions are medium.

Axis weights are semantically inconsistent in representation: some assessments store percentages that sum to 100, while others store fractions that sum to 1. The current engine works numerically because it divides by total weight, but the persisted representation is not canonical and creates ambiguity for configuration validation, admin UI, exports, and score interpretation.

## 9. Missing-role findings

The current KPI model deliberately applies fallback values whenever a KPI references a role not mapped by that assessment. This means many standard KPIs are partially driven by imputed values rather than roles directly measured by the assessment.

For example, patient-journey maps TRUST, COMMUNICATION, CONVERSION, RETENTION and LOYALTY, while several standard KPIs also request RECEPTION, ADMIN, COORDINATION or SCHEDULING; those missing roles are filled from the average axis score.

This behavior is documented in `AXIS_KPI_MAPPING_GUIDE_v1.0.md`, but the guide is an older methodology draft rather than a current owner-approved P3 methodology record.

## 10. KPI findings

All current KPI mappings sum to 1.00. The mapping keys are stored per assessment version in `assessment_types.kpi_mappings`.

The key unresolved semantic issue is not the arithmetic weighted average itself; it is whether every KPI should exist for every assessment and whether missing role inputs should be imputed by fallback.

RRI is present only for admin-reception and is surfaced separately by the dashboard, consistent with the older KPI guide.

## 11. EV findings

There are two materially different EV implementations:

### Engine EV

`score-engine.ts` calculates EV from `ev_mappings`, normalized role score, `delta_c_max` and `flow × ltv`, returning current/potential/gap with factors `0.7`, `1.25`, `0.55`.

### Interactive EV endpoint

The `calculate_ev` action in `assessment-access/index.ts` separately reconstructs role scores, hard-codes `deltaMax = 0.35`, derives `ltv = avg × visits × years`, uses `flow = visits`, calculates `current = base × 0.7`, and then exposes `opt20 = current × 1.2` and `opt50 = current × 1.5`.

The browser UI calls this second path. Therefore the project does not currently have one single EV contract.

## 12. Determinism / parity

A server/browser parity test exists at `tests/server-scoring-parity.test.js` and compares the server engine to `tests/reference/browser-engine-v4.js`.

The test currently covers only three fixtures:

- all perfect;
- trap divergence;
- mixed baseline.

This is useful regression coverage but is not a complete deterministic fixture suite. It does not systematically cover missing roles, duplicate role mappings, zero-weight axes, high/low impact, multiple traps, invalid traps, partial answers, invalid option values, weight-scale differences, EV edge cases, or persistence semantics.

## 13. Browser reference versus production reality

The browser reference engine v4 contains validation rules and the same main scoring formulas as the current server engine for axis/global/KPI/engine-EV behavior.

However, it is now a reference fixture source rather than the official production authority. The live browser app has an empty engine bridge, calls the server for `complete`, and calls the separate server `calculate_ev` endpoint for the interactive simulator.

## 14. Engine versioning / provenance

New sessions currently receive `server-score-v1` from both public and protected session creation functions. All 35 existing sessions currently carry that value.

The open P3 question is whether `server-score-v1` is meant to identify a permanently immutable algorithm artifact, merely the current implementation label, or an engine contract whose source, fixture set and formula set must be independently versioned.

## 15. Historical result integrity observations

P2 establishes an immutable assessment definition boundary. P3 adds a second provenance dimension: the scoring engine itself can change even when the assessment version does not.

Therefore reproducibility requires at least:

`assessment version + scoring engine version + scoring configuration/fixture contract`.

Whether an additional persisted engine digest or calculation-input snapshot is required is an architectural decision.

## 16. P3 issue register

| ID | Area | Finding | State |
|---|---|---|---|
| P3-01 | Scoring authority | Server engine is active for official completion | Proven |
| P3-02 | Legacy RPC | Documented `complete_assessment_with_server_scoring` is absent | Proven discrepancy |
| P3-03 | Legacy scorer | `calculate_session_score` is non-authoritative legacy code | Proven |
| P3-04 | Unused adapter | `scoring.ts` references nonexistent RPC | Proven |
| P3-05 | Raw persistence | `scores.raw_score` stores final percentage, not raw earned score | Proven |
| P3-06 | Weight units | Axis weight scale is inconsistent across assessments | Proven |
| P3-07 | Impact | All live questions are medium impact | Proven |
| P3-08 | Traps | Trap metadata and trap execution sources are inconsistent/invalid | Proven |
| P3-09 | Missing roles | Many KPI inputs are fallback-imputed | Proven |
| P3-10 | KPI universality | Universal KPI semantics depend on unresolved fallback policy | Decision required |
| P3-11 | EV | Engine EV and interactive EV are different formulas/contracts | Proven |
| P3-12 | Deterministic tests | Existing parity suite is too narrow for P3 closure | Proven |
| P3-13 | Engine provenance | `server-score-v1` exists but reproducibility contract is incomplete | Decision required |
| P3-14 | Completed results | 5 completed sessions have no score rows | Reconciliation required |

## 17. P3 conclusion

The current implementation is functional enough to serve as the production scoring path, but the investigation does not establish that every mathematical/measurement rule is an owner-approved canonical methodology.

The next step is not to rewrite the scorer blindly. It is to resolve the architecture/measurement decisions below and then produce the P3 scoring contract and deterministic fixture set against those decisions.
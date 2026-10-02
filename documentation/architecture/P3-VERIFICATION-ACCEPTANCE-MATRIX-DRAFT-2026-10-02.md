# P3 — Verification & Acceptance Matrix
## 2026-10-02

**Status:** DESIGN / PRE-IMPLEMENTATION — verification package draft  
**Canonical status:** `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`

This document defines the checks required before P3 can become Implementation-Ready. It authorizes no production change.

## 1. Scoring and measurement

| ID | Case | Expected contract outcome |
|---|---|---|
| V-01 | all applicable answers at minimum | deterministic zero measurement; no invented coverage |
| V-02 | all applicable answers at maximum | deterministic maximum measurement |
| V-03 | mixed response values | item interpretation follows the response registry; no option-position scoring |
| V-04 | high/medium/low impact | earned/max use declared impact multipliers |
| V-05 | missing optional answer | item excluded/coverage recorded; no guessed zero |
| V-06 | missing required answer | partial/insufficient state according to coverage policy |
| V-07 | semantic/evidence response | interpreted coverage may exist without fabricated numeric zero |
| V-08 | no applicable scoring material | component is unavailable |
| V-09 | exact band boundaries | Q1/Q2/Q3/Q4 use 25/50/75 boundaries without statistical-quartile meaning |
| V-10 | repeated replay | same pinned version + answers + contract/config digest produces the same result |

## 2. Scale and assessment-family protection

| ID | Case | Expected contract outcome |
|---|---|---|
| V-11 | 3/4/5-option questions | scale follows question meaning; no global remap |
| V-12 | Clinic Performance Q4/Q5/Q6 | retain 0/0/40/100/100 semantic encoding |
| V-13 | Medical Team Q2c9f29 | design registry uses 100/40/40/0; visible production values are unchanged before implementation |
| V-14 | all five families | each uses the common kernel only where its declared configuration permits |

## 3. Profile, overallScore and coverage boundary

| ID | Case | Expected contract outcome |
|---|---|---|
| V-15 | component aggregation | each applicable question contributes once to its declared component/layer |
| V-16 | mixed layers | layers remain distinct; no accidental duplication |
| V-17 | unavailable component | unavailable is not converted to zero |
| V-18 | existing overallScore | P3 implementation must use the owner-frozen construction of the existing `overallScore` / **معدل الكفاءة العام**; this remains the only material methodology item still open |
| V-19 | economic input | economic calculation cannot modify overallScore or any core assessment score |

## 4. Consistency and criticality

| ID | Case | Expected contract outcome |
|---|---|---|
| V-20 | consistency detected | signal recorded; no score penalty in V1 |
| V-21 | critical finding | separate criticality signal; no inferred penalty/gate |
| V-22 | legacy `is_trap` flag alone | does not create a new P3 penalty rule |

## 5. Roles and KPIs

| ID | Case | Expected contract outcome |
|---|---|---|
| V-23 | mapped measured role | role score derives only from declared mapped components |
| V-24 | missing role | unavailable; no overall/axis fallback |
| V-25 | supported KPI | existing KPI catalog and mapping weights are used |
| V-26 | unsupported KPI | omitted/unavailable, never fabricated as zero |
| V-27 | partial KPI coverage | partial state and contributing inputs are explicit |

## 6. Economic Opportunity

### Approved model

`BasePatientValue = average_visit_value × 3 × relationship_years`

Let:

`r = referral_percentage / 100`

Each referred patient is assumed to have the same:
- annual visit count (3);
- visit value;
- relationship years;
- referral percentage.

Therefore:

`EconomicValue = BasePatientValue × (1 + r + r² + r³ + ...)`

For `0 ≤ r < 1`:

`EconomicValue = BasePatientValue / (1-r)`

| ID | Case | Expected contract outcome |
|---|---|---|
| V-28 | referral blank | referral contribution unavailable; no default zero |
| V-29 | referral 0% | EconomicValue = BasePatientValue |
| V-30 | referral 20% | EconomicValue = 1.25 × BasePatientValue |
| V-31 | referral 50% | EconomicValue = 2 × BasePatientValue |
| V-32 | referral >=100% | rejected as invalid/unbounded under this model; no silent clamping |
| V-33 | invalid monetary input | economic result unavailable/validation failure; core score unaffected |
| V-34 | economic replay | same economic inputs + model identity produce the same monetary result |

## 7. Persistence and provenance

| ID | Case | Expected contract outcome |
|---|---|---|
| V-35 | persisted component | raw_score is pre-normalization earned points |
| V-36 | persisted max | max_possible is pre-normalization maximum, not hard-coded 100 |
| V-37 | persisted percentage | percentage is normalized result |
| V-38 | weight | canonical 0–1 representation; published scoreable configuration sums to 1.00 |
| V-39 | provenance | family/version, engine identity, contract/config digests, timestamp and session lineage are recoverable |
| V-40 | replay snapshot | stored inputs/result lineage are sufficient for deterministic replay |

## 8. Historical compatibility and migration safety

| ID | Case | Expected contract outcome |
|---|---|---|
| V-41 | legacy result with reliable answer evidence | shadow replay only unless migration is separately approved |
| V-42 | completed score-bearing session with no linked answers | preserve as legacy; do not infer answers |
| V-43 | sessionless legacy answer/score rows | preserve and exclude from authoritative P3 lineage |
| V-44 | historical migration | legacy result is never silently overwritten; migration has explicit provenance and rollback |
| V-45 | production rollback | legacy scorer remains recoverable until migration acceptance is complete |

## 9. Security/runtime acceptance

| ID | Case | Expected contract outcome |
|---|---|---|
| V-46 | browser submits score | server ignores/rejects client-authoritative score fields |
| V-47 | unpublished version | cannot be used as a public scoreable version |
| V-48 | published version mutation | blocked by version immutability rules |
| V-49 | duplicate completion | idempotent; usage is consumed only on first successful completion |
| V-50 | historical session | continues against its pinned assessment version |

## 10. Gate condition

P3 cannot become **IMPLEMENTATION-READY** until:
1. the existing `overallScore` construction is frozen;
2. all applicable verification cases have an expected implementation/test artifact;
3. canonical scorer/result ownership is consolidated;
4. persistence/provenance and migration/rollback contracts are implementation-ready;
5. no unresolved material methodology contradiction remains.

No production implementation is authorized by this matrix.

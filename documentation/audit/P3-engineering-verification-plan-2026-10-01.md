# P3 Engineering Verification Plan — Scoring Engine

**Date:** 2026-10-01  
**Status:** **DRAFT — NO SEMANTIC CHANGE AUTHORIZED**

## 1. Objective

Translate the approved P3 architecture into an executable engineering verification program. This document defines what must be measured in code, database, runtime and tests after the owner resolves the scoring decisions.

## 2. Work packages

| WP | Area | Engineering work | Required evidence |
|---|---|---|---|
| P3-E1 | Source inventory | Enumerate all scoring/EV/KPI/trap calculation paths | Repository + DB function inventory |
| P3-E2 | Contract | Freeze scoring inputs/outputs and formulas | Versioned P3 Scoring Contract |
| P3-E3 | Engine | Consolidate calculation into one authoritative server module | Code review + unit tests |
| P3-E4 | Configuration validation | Validate version-owned scoring configuration before calculation/publication | Negative tests + DB/runtime checks |
| P3-E5 | Trap model | Resolve canonical representation and implement deterministic evaluation | Trap fixture matrix |
| P3-E6 | KPI/roles | Resolve role fallback and KPI availability semantics | Mapping fixtures |
| P3-E7 | EV | Resolve formula/input semantics and remove duplicate algorithm | Engine/runtime parity |
| P3-E8 | Persistence | Align `scores` fields with calculation semantics | Schema/data-contract tests |
| P3-E9 | Provenance | Bind engine version to immutable implementation/contract/fixtures | Manifest + session/result checks |
| P3-E10 | Historical data | Reconcile completed sessions lacking score rows | Explicit migration decision and evidence |
| P3-E11 | Determinism | Expand fixtures across assessments and edge cases | Regression suite |
| P3-E12 | External verification | Exercise live HTTP production path | GitHub-hosted E2E evidence |

## 3. Required test matrix

At minimum, deterministic fixtures must cover:

- perfect answers;
- all-zero answers;
- mixed `0/40/100` answers;
- every axis independently at 0/40/100;
- high/medium/low impact;
- empty axis / no contributing questions;
- multiple axes with the same role;
- missing KPI roles;
- all KPI roles present;
- every trap state and penalty boundary;
- multiple simultaneous traps;
- invalid/missing trap references;
- invalid option value;
- duplicate answer;
- incomplete required assessment;
- weight fractions and percentages during migration testing;
- boundary classification at 25, 50 and 75;
- rounding-sensitive inputs;
- EV minimum/maximum/zero-invalid inputs;
- EV-enabled and EV-disabled assessments;
- repeat completion/idempotency;
- assessment-version mismatch;
- engine-version mismatch where introduced.

## 4. Required parity layers

### Layer A — Pure engine parity

Freeze expected outputs from the approved contract and compare the server engine against fixtures. The old browser reference may be used only as a historical comparison source.

### Layer B — Persistence parity

Verify that rows in `scores`, `leads` and `sessions` represent exactly the engine output and preserve provenance.

### Layer C — Runtime parity

Exercise the Edge Function through the same HTTP actions used in production.

### Layer D — Assessment matrix parity

Run representative and boundary fixtures against all five current assessment definitions rather than only one assessment.

## 5. Publication/configuration gate

Before a version can be published, P3 must establish which scoring configuration invariants are mandatory. At minimum the system should be able to reject malformed role mappings, invalid trap references, illegal weights, and incompatible EV configuration according to the final owner-approved contract.

## 6. Version/reproducibility gate

For each engine release:

`engine version → immutable source reference → scoring contract version → fixture version → compatible assessment-version range`

Any change that can alter an existing result must be distinguishable from a non-semantic refactor.

## 7. Legacy-path disposition gate

Before P3 closure, every legacy calculation path must be classified as:

- authoritative;
- compatibility-only;
- test/reference-only;
- retired.

Unknown/dead paths are not allowed to remain ambiguous in the final architecture record.

## 8. P3 closure criteria

P3 closes only when:

1. owner decisions are recorded;
2. the P3 Scoring Contract is frozen;
3. one authoritative server scoring implementation exists;
4. all production scoring paths use that implementation;
5. trap/KPI/role/EV semantics are consistent and documented;
6. score persistence semantics are unambiguous;
7. engine provenance is reproducible;
8. deterministic fixtures pass;
9. all five current assessments pass the required matrix;
10. historical data policy is resolved and applied where authorized;
11. external production E2E passes;
12. documentation and implementation status are synchronized.
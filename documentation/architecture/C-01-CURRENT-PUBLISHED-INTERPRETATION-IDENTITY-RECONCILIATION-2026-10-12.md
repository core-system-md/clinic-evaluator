# C-01 — Current Published Interpretation Identity Reconciliation
**Date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Branch:** `fix/c01-rebuilt-on-main-20261014`  
**Scope:** Repository-only correction and tests. No Production writes or deployments.

## Finding

The five current published assessment families are all product version 1. The current Comprehensive Clinic V1 contains 36 questions and 152 options using `CCV2Q01..CCV2Q36` and the 0/40/70/100 anchor scale. The Patient Journey V1 contains 25 questions and 96 options; option counts vary by question and are validated from the actual published identities. The existing V1 interpretation registry does not identify those current option rows: Comprehensive uses a different question-code family, and Patient Journey's V1 registry has only 75 entries, old option identities, and a 0/40/100 mapping that does not represent the current fourth option.

The scorer resolves a selected answer by the tuple `questionCode + optionId + optionIndex + interpretationVersion`. Matching only on option values or question/option indexes is not sufficient.

## Correction in this branch

- Established `documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V2.json` as the canonical Comprehensive Clinic V2 interpretation registry (152 entries), synchronized with `supabase/functions/assessment-access/response-interpretation-registry-v2.json`.
- Established a separate canonical Patient Journey interpretation registry at `documentation/architecture/P3-PATIENT-JOURNEY-INTERPRETATION-REGISTRY-V2.json` (96 entries), packaged at `supabase/functions/assessment-access/patient-journey-interpretation-registry-v2.json`. The registries remain separate because their semantic contracts differ.
- Reconciled all 248 option IDs against the current published rows in Supabase. Every source option value matches the live option value; option IDs are unique across the two family-specific registries.
- Kept product `assessmentVersion=1` separate from `interpretationVersion=2`. The current published V1 product uses interpretation V2 explicitly; this does not expose a product-facing V2.
- Bound `comprehensive-clinic-assessment:1` and `patient-journey:1` to the V2 interpretation registry. Removed the unsupported Comprehensive product-version-2 binding so an unregistered future product version fails closed.
- Changed the configuration digest projection to include entries selected by the explicit interpretation version, rather than incorrectly requiring interpretation version to equal product version.
- Added regression tests for full option coverage, current IDs, source values, scorer resolution, canonical/runtime equivalence, and explicit product-to-interpretation bindings.

## Evidence captured from the live database

| Published family | Product version | Questions | Options | Current interpretation mapping |
|---|---:|---:|---:|---|
| Comprehensive Clinic | 1 | 36 | 152 | V2 interpretation |
| Patient Journey | 1 | 25 | 96 | V2 interpretation |
| Admin & Reception | 1 | 11 | 33 | V1 interpretation |
| Clinic Performance | 1 | 9 | 45 | V1 interpretation |
| Medical Team | 1 | 12 | 44 | V1 interpretation |

The live production database returned zero sessions and zero assessment results for each current published version at inspection time. This is a time-specific observation, not a claim about historical data.

## Closure evidence — 2026-10-14

**Repository implementation status: CLOSED / MERGED.**

- Rebuilt from current `main` in PR [#97](https://github.com/core-system-md/clinic-evaluator/pull/97), then squash-merged as `5879fe3f22da2fd693de571e806ac44cd51f7e27`.
- Exact-head CI passed: P3 kernel run `38614736937` (P3 isolated kernel, full Node suite, disposable C-02 PostgreSQL RPC, P4 protected completion all PASS); WP-02 run `38614737136`; WP-09 run `38614737082`; WP-04 run `38614737308`; WP-03 run `38614737321` — all successful.
- Read-only comparison against current Production rows matched **248/248** exact tuples `family + question code + option index + option ID + source value`: Comprehensive Clinic **152/152**, Patient Journey **96/96**; **0 missing and 0 extra** identities.
- Cloudflare Pages deployment for merge commit `5879fe3f22da2fd693de571e806ac44cd51f7e27` succeeded as deployment `c81e93df-279e-4902-998e-56c96c57969c`.

**Runtime/release boundary (not part of repository closure):** this work did not deploy the updated `assessment-access` Edge Function or run a new end-to-end assessment through that new Edge code. Therefore the merged source and Pages deployment must not be represented as proof that the new scorer is already running in Supabase Production. Edge deployment and runtime E2E remain a separate release gate requiring its own controlled verification and authorization.

## Future-version rule

A future product version must not inherit this mapping implicitly. Its publication gate must prove exact option identity coverage and an explicit interpretation binding before publication. That enforcement is tracked under C-03, not claimed as complete by this C-01 change.


## Final release closure — 2026-10-14 (supersedes the runtime/release boundary above)

**C-01 status: FULLY CLOSED for the current published V1 families.** This addendum supersedes the earlier statement that Edge deployment and runtime E2E remained pending.

- Runtime runner compatibility was fixed and merged in [PR #99](https://github.com/core-system-md/clinic-evaluator/pull/99), commit `0be51e023da19d26a07fb6b503806af48fb5d433`. Exact-head workflow run `38628626164` passed all four jobs: P3 isolated kernel, full Node suite, disposable C-02 answer-save RPC, and P4 protected completion.
- Supabase Production `assessment-access` is ACTIVE at version **38**, bundle SHA-256 `fca794e29fd4193348fcada6de9cb2e2165536accef056ca808faa9f5bce1c8b`. All 16 deployed files match current `main` (JSON registries compared semantically; source modules byte-for-byte).
- Live Production E2E passed for both currently published V1 families:
  - Comprehensive Clinic: 36/36 answers saved; 36 eligible V2 value-70 anchors; completion HTTP 200; `interpretationVersion=2`; numeric overall score 69.99999999999999; persisted result status `PRODUCTION`.
  - Patient Journey: 25/25 answers saved; 21 eligible V2 value-70 anchors; completion HTTP 200; `interpretationVersion=2`; numeric overall score 65.8; persisted result status `PRODUCTION`.
  - Both sessions persisted product version 1 separately from interpretation version 2, with completed lifecycle state, result JSON, config digest, and all expected answers.
- Run-scoped synthetic data was removed after evidence capture. Post-cleanup queries verified zero remaining rows for the exact test sessions/leads and their answers, scores, results, historical snapshots, and access rows. The two earlier unbound test access rows were also removed. This is exact-ID cleanup evidence, not a claim that the whole Production database is empty.
- No migration or DDL was run.

**Final C-01 gate:** source merge PASS; CI PASS; 248/248 live option identities reconciled; Edge deployment/source parity PASS; both-family Production runtime E2E PASS; run-scoped cleanup PASS. Do not reopen C-01 for these completed gates. Future product-version publication/binding enforcement remains a separate C-03 concern.

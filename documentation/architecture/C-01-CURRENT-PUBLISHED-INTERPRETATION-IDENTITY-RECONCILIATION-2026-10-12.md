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

## Verification boundary

This is a source-level repair on a non-production branch. It does not prove a deployed completion flow. The following remain required before closure:
1. Run the dedicated C-01 test and all affected Node tests in CI.
2. Verify that the workflow runs against the exact branch head and that no test is skipped.
3. Re-run a read-only live mapping comparison before any release.
4. Perform a safe disposable end-to-end completion/read test before any Production deployment.
5. Do not change Supabase Production, deploy `assessment-access`, or publish Cloudflare Pages as part of this branch without a separate explicit Production release approval.

## Future-version rule

A future product version must not inherit this mapping implicitly. Its publication gate must prove exact option identity coverage and an explicit interpretation binding before publication. That enforcement is tracked under C-03, not claimed as complete by this C-01 change.

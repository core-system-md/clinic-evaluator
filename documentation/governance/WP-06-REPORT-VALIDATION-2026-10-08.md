# WP-06 — Report Validation Gate
## 2026-10-08

**Work package:** WP-06 — Report validation gate
**Governing contract:** FINAL-IMPLEMENTATION-CONTRACT-2026-10-07
**Base:** main at ee357a4e23d0c006783da9cdf236da3491c77c97
**Branch:** wp-06-report-validation-gate-2026-10-08
**Status:** IMPLEMENTATION IN PROGRESS
**Production mutation:** NO

## Scope
Create the final-output validation boundary after report interpretation and before the report is considered final.

## Acceptance boundary
The gate must reject:
- non-production or incomplete Structured Results;
- mismatched overall/axis/KPI facts;
- unavailable KPI fabrication;
- economic output inconsistent with annual assumptions;
- incompatible trend claims;
- internal consistency/trap/provenance/scoring fields in the user projection;
- prohibited Leakage/internal language;
- missing report-layer script dependencies.

Admin projection must preserve identity, provenance, and consistency evidence.

## Stage rule
This WP will be closed only after its dedicated tests pass, the implementation is documented as PASS, and the branch is merged to main. No production deployment is included.

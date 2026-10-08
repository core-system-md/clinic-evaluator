# WP-07 — Report Text and Model Linkage
## 2026-10-08

**Work package:** WP-07 — Rebuild report text and model linkage  
**Governing contract:** FINAL-IMPLEMENTATION-CONTRACT-2026-10-07  
**Base:** main at 6ea2d818d1426e10848180d6be5d89b7dfe67583  
**Branch:** wp-07-report-text-model-linkage-2026-10-08  
**Status:** IMPLEMENTATION IN PROGRESS  
**Production mutation:** NO

## Scope
Audit every live presentation string in `assets/data/report_texts.json`, explicitly link semantic statements to approved evidence/model ownership, and remove legacy Leakage/Trap/monthly economic wording.

## Acceptance boundary
- `report_texts.json` is presentation copy, not semantic authority.
- Every live leaf has an explicit linkage catalog entry.
- Removed Leakage/Trap semantics do not remain in live report copy.
- Economic copy uses the approved annual basis and 3 visits/year.
- No unsupported causal/financial statement remains in live report copy.
- The assessment-family report models remain the semantic report boundary.

## Stage rule
This WP will close only after its dedicated contract passes, documentation is updated to PASS, and the branch is merged to `main`. No production deployment is included.

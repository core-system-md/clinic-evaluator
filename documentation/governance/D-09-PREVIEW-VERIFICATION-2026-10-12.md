# D-09 — Preview HTTP Verification Addendum

**Date:** 2026-10-12  
**PR:** #81 — https://github.com/core-system-md/clinic-evaluator/pull/81  
**Preview head tested:** `8e3492c495328f6fd5491f719b556b56cde3d534`  
**Preview URL:** https://a3f35f96.clinicevaluat.pages.dev

## Results

| Request path | Observed result | Status |
|---|---|---|
| `/assets/data/comprehensive_assesstment.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/supabase/functions/assessment-access/response-interpretation-registry-v2.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/assets/data/report_texts.json` | JSON body includes version `2.2.0` and Economic Opportunity Simulator copy | PASS — required client asset remains available |
| `/` | Browser-rendering request hit Cloudflare API rate limit before a result could be obtained | NOT VERIFIED live |

The checks were performed through Cloudflare Browser Rendering against the non-production preview URL. The original Production URL had previously returned the legacy Comprehensive assessment JSON, confirming that the exposure existed before this branch.

## CI evidence

GitHub Actions run `38223098013` for head `8e3492c495328f6fd5491f719b556b56cde3d534` completed successfully:
- P3 isolated kernel — SUCCESS
- Full Node test suite, including `tests/d09-pages-asset-exposure.test.js` — SUCCESS
- P4 protected completion on disposable PostgreSQL — SUCCESS

## Decision

D-09 is **PARTIALLY VERIFIED; NOT CLOSED**. The two targeted sensitive paths are blocked on the tested preview and the required report-text asset remains available. The root route still requires a live preview check. No Production deployment, Pages project setting change, Supabase write, migration, or Edge Function deployment was performed.

Keep PR #81 Draft and unmerged until the root route is verified live and the owner-approved release boundary is observed. This middleware does not remove files from the public GitHub repository or its history.

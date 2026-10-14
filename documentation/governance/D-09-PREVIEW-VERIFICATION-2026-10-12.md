# D-09 — Preview HTTP Verification Addendum

**Date:** 2026-10-12  
**PR:** #81 — https://github.com/core-system-md/clinic-evaluator/pull/81  
**Preview head tested:** `1e9163365fd29cbfd9ac4950acdce3c3643f706f`  
**Preview URL:** https://728e4b05.clinicevaluat.pages.dev

## Preview results

| Request path | Observed result | Status |
|---|---|---|
| `/assets/data/comprehensive_assesstment.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/assets/data/admin_reception_assesstment.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/assets/data/medical_team_assesstment.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/supabase/functions/assessment-access/response-interpretation-registry-v2.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V2.json` | Body returned `Not Found` | PASS — blocked in preview |
| `/assets/data/report_texts.json` | JSON version `2.2.0`; required simulator copy present | PASS — required client asset remains available |
| `/` | Application landing page returned | PASS |

## CI evidence

GitHub Actions run [38223253283](https://github.com/core-system-md/clinic-evaluator/actions/runs/38223253283) for head `1e9163365fd29cbfd9ac4950acdce3c3643f706f` completed successfully:
- P3 isolated kernel — PASS
- Full Node test suite, including `tests/d09-pages-asset-exposure.test.js` — PASS
- P4 protected completion on disposable PostgreSQL — PASS

## Production deployment and smoke verification

PR #81 was merged with merge commit `6b9de8affde4737e4d15f069bcbe9dee3c0d7e33`. Cloudflare Pages reports successful Production deployment of that exact commit (deployment ID `df10f1e1-01ca-4c61-8d51-d84597c50e8f`).

Post-deployment Browser Rendering smoke checks observed:
- `/assets/data/comprehensive_assesstment.json` returned `Not Found`.
- `/assets/data/report_texts.json` returned JSON version `2.2.0`.

Cloudflare Browser Rendering rate-limited further Production path probes during this session. The remaining internal and legacy paths listed above passed on preview, but are not claimed as independently re-verified against Production.

## Decision

**D-09 is DEPLOYED, with targeted Production smoke checks passing and a documented limitation on the full Production re-probe.** The original exposed Comprehensive asset is now blocked at the production Pages hostname; the required report-text asset remains available. The middleware does not remove files from the public GitHub repository or its history.

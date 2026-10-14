# D-09 — Cloudflare Pages internal asset path protection

**Date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Production project:** Cloudflare Pages `clinicevaluat`  
**Scope:** Pages request middleware, regression tests, deployment, and post-deployment smoke verification.

## Evidence that triggered this change

A read-only Cloudflare Browser Rendering request to Production returned the legacy file `/assets/data/comprehensive_assesstment.json` as JSON content, including obsolete question content and `is_trap` fields. This confirmed that at least one obsolete assessment asset was publicly reachable.

The Pages configuration was also observed with root directory `/`, destination directory `/`, `path_includes=["*"]`, and no path exclusions.

## Implemented correction

PR #81, merged to `main`:
https://github.com/core-system-md/clinic-evaluator/pull/81

- Adds `functions/_middleware.js` to return 404 for repository-only prefixes (`/documentation`, `/supabase`, `/tests`, `/.github`), selected repository metadata files, and obsolete `assets/data/*_assesstment.json` snapshots.
- Preserves user-facing routes and required client dependencies, including `/assets/data/report_texts.json`.
- Adds regression tests for blocked paths, allowed public paths, case variations, and malformed URL encoding.
- Does not change shared Cloudflare Pages project settings, Supabase, Edge Function deployments, or Production data.

## Verification evidence

### CI before merge

GitHub Actions run [38223253283](https://github.com/core-system-md/clinic-evaluator/actions/runs/38223253283) for head `1e9163365fd29cbfd9ac4950acdce3c3643f706f` completed successfully:
- P3 isolated kernel — PASS
- Full Node test suite, including `tests/d09-pages-asset-exposure.test.js` — PASS
- P4 protected completion on disposable PostgreSQL — PASS

### Preview verification before merge

Preview URL: https://728e4b05.clinicevaluat.pages.dev

- Three legacy `*_assesstment.json` files tested returned `Not Found`.
- Tested interpretation-registry paths under `/supabase` and `/documentation` returned `Not Found`.
- `/assets/data/report_texts.json` remained available with version `2.2.0`.
- Root route returned the application landing page.

### Production deployment and smoke checks

- PR #81 was merged using squash merge. Merge commit: `6b9de8affde4737e4d15f069bcbe9dee3c0d7e33`.
- Cloudflare Pages API reports a Production deployment for that exact commit, with build and deploy stages successful. Deployment ID: `df10f1e1-01ca-4c61-8d51-d84597c50e8f`; deployment URL: https://df10f1e1.clinicevaluat.pages.dev.
- Post-deployment Cloudflare Browser Rendering request to `https://clinicevaluat.pages.dev/assets/data/comprehensive_assesstment.json` returned a page body of `Not Found`.
- Post-deployment request to `https://clinicevaluat.pages.dev/assets/data/report_texts.json` returned JSON version `2.2.0`.
- Additional Production path probes were rate-limited by Cloudflare Browser Rendering. The other legacy assets and internal paths were verified on the preview, but were not independently re-probed on Production in this session.

## Status

**D-09: DEPLOYED; TARGETED PRODUCTION SMOKE CHECKS PASS.** The previously confirmed exposed Comprehensive legacy asset now returns `Not Found`, while the required report-text asset remains available. The middleware regression suite and preview path checks passed.

**Verification limitation:** The full set of sensitive paths was not independently re-probed on Production because of Cloudflare Browser Rendering rate limiting. This is recorded as a verification limitation, not as evidence of exposure or as a fabricated PASS.

This middleware does not make the public GitHub repository private; repository files may remain accessible through GitHub and its history.

## Rollback boundary

The correction is limited to Pages request handling and regression tests. If a user-facing route is found broken, diagnose and correct the middleware through a bounded follow-up change. Do not make emergency shared-project configuration changes, Supabase writes, migration changes, or Edge Function deployments without separate explicit owner authorization.

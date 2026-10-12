# D-09 — Cloudflare Pages internal asset path protection

**Date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Scope:** Pages request middleware and regression tests; non-production branch only.

## Evidence that triggered this change

A Cloudflare Browser Rendering read-only request to the production URL for `/assets/data/comprehensive_assesstment.json` returned the JSON document as rendered page content. The response included legacy question content and `is_trap` fields. This is direct evidence that at least this obsolete file is reachable from the production Pages host. A broader multi-URL probe was interrupted by Cloudflare API rate limiting, so no claim is made about the status of every other candidate path.

The project configuration also reports root directory `/`, destination directory `/`, `path_includes=["*"]`, and no path exclusions. This supports the need for a request-level guard.

## Proposed correction in this branch

- Add a Cloudflare Pages `functions/_middleware.js` guard that returns 404 for repository-only prefixes (`/documentation`, `/supabase`, `/tests`, `/.github`), selected repository metadata files, and obsolete `assets/data/*_assesstment.json` snapshots.
- Preserve user-facing routes and client dependencies, including `/assets/data/report_texts.json`.
- Add regression tests for blocked paths, allowed public paths, case variations, and malformed URL encoding.
- Do not change the shared Cloudflare Pages project settings, Supabase, Edge Function deployments, or Production data.

## Verification status

- Source-level regression tests are included in `tests/d09-pages-asset-exposure.test.js`; CI and deployed preview must still prove they pass.
- Production exposure of at least one legacy asset is **CONFIRMED**.
- Whether all candidate internal paths are blocked by the new middleware is **NOT VERIFIED** until the preview deployment is tested over HTTP.
- Production remains unchanged by this branch. Do not merge without a successful preview HTTP check showing 404 for blocked paths and successful access to `report_texts.json` and required application routes.
- This Pages guard does not make the public GitHub repository private; files in a public Git repository may remain accessible through GitHub history and raw-content URLs.

## Rollback boundary

The change is isolated to Pages request handling and its tests. If preview checks fail, revise or remove this middleware in the branch; do not attempt an emergency Production setting change or deployment without owner authorization.

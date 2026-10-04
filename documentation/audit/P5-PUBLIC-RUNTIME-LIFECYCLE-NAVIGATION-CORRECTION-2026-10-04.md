# P5 — Public Runtime / Lifecycle / Navigation Correction
## 2026-10-04

**Status:** Implemented and deployed; owner browser acceptance pending.

### Owner-reported failures
1. Stop Public did not work.
2. Browser Back left the browser instead of returning to the prior public page.
3. Opening an assessment sometimes showed a transient "record not found" error before the editor appeared.
4. Public assessments did not reliably transition from lead metadata to Questions.
5. Option creation for multiple questions was confirmed working after the previous correction.

### Root causes verified

#### Stop Public
The visible action was incorrectly wired to `archiveAssessment(..., isActive=true)`. The archive controller intentionally rejects active published versions and therefore the button could never perform Stop Public.

The secure database operation already existed as:
`stop_public_assessment_secure(p_family_id)`.

The UI is now wired directly to that operation. Archive remains a separate action.

#### Public assessment entry
The published families and versions were verified in Supabase:
- patient-journey: published, 25 questions / 75 options
- clinic-performance: published, 9 questions / 45 options
- medical-team-assessment: published, 12 questions / 44 options
- admin-reception-assessment: published, 11 questions / 33 options
- comprehensive-clinic-assessment v10: published, 36 questions / 108 options

The server-side `start_public_assessment_session` was tested in rollback-only SQL transactions for published versions and successfully created sessions, proving the database start RPC itself is operational.

The browser runtime now:
- validates that published content contains an assessment id, stable family slug, and questions before presenting the lead form;
- uses cache-busted public `app.js`;
- keeps the question runtime server-authoritative.

#### Browser Back
Public assessment pages now create a history guard entry. Back navigates to the same-origin referrer when available, otherwise the assessment center, instead of terminating the tab/window navigation.

#### Editor transient error
The workspace editor now resolves the requested assessment directly by id when the manager cache does not contain it. The duplicate legacy manager editor opener was removed; the workspace controller is the canonical editor owner.

### Verification
- JavaScript parse checks passed for manager, lifecycle, workspace, public app, and P5 regression test files.
- PR #42 merged into `main` at `c7b3f85e0a70d6f3444b45562b78b2bdc28f0346`.
- Cloudflare production deployment for that commit completed successfully.
- No new lifecycle state.
- No direct protected-table browser writes.
- No privilege expansion.
- P0–P4 boundaries remain unchanged.

P5 remains open until the owner confirms the browser workflow, especially: **lead data → Questions** on the real public assessment URLs.

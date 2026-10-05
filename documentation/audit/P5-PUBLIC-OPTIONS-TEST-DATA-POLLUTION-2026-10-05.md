# P5 Incident — Public Option Visibility and Production Test-Data Pollution
Date: 2026-10-05

## Findings

### Public assessment options
The production database currently contains the complete published option graph:
- Admin/Reception v1: 11 questions, 3 options per question.
- Clinic Performance v1: 9 questions, 5 options per question.
- Comprehensive Clinic Assessment v10: 36 questions, 3 options per question.
- Medical Team v1: 12 questions: 4 questions with 3 options and 8 with 4.
- Patient Journey v1: 25 questions, 3 options per question.

The public renderer itself iterates all `q.options` and the deployed Edge Function returns options grouped per question. No database option rows were deleted by the P5 editor changes.

Because the Owner still observes incomplete option sets in the live browser, the browser-visible payload/rendering discrepancy remains an unresolved P5 acceptance issue. No invented options or direct public-table reads were added as a workaround.

### Production test-data pollution
The automated workflow `.github/workflows/p2-external-e2e.yml` was configured to run live E2E tests against the production Supabase project on pushes and pull requests. Those tests create synthetic `P4 Concurrent Start ...` and `P2 External E2E ...` lead rows using `example.invalid` emails.

This produced 24 synthetic lead rows in production, which is exactly why the Owner's administration table showed the test names plus random suffixes instead of real respondent names.

The 24 synthetic leads were removed. Their dependent sessions/answers/scores/results were removed through existing foreign-key CASCADE relationships. 71 non-test leads remain.

## Preventive correction
- Live E2E workflow is no longer automatic.
- Live E2E scripts refuse the production Supabase endpoint unless `ALLOW_LIVE_E2E=true` is explicitly provided.
- E2E now asserts the expected minimum option cardinality for each assessment family so incomplete payloads fail the test instead of passing.
- Public HTML is cache-busted to a fresh canonical `app.js` asset without changing application behavior.

## Remaining acceptance
P5 remains OPEN. The public browser must still be verified to render every stored option for every assessment and every question.

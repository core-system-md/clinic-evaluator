# P5 Incident Reconciliation — Public Visibility, Report Detail, Navigation, and Option Runtime
Date: 2026-10-04
Project: `core-system-md/clinic-evaluator`
Supabase: `oaqpzaarppccbnepffxx`

## Status
Production corrections implemented and deployed. P5 remains OPEN pending Owner browser acceptance.

## Owner-reported failures
1. Stop Public did not work.
2. Report-detail modal could end with “record not found” despite a visible result row.
3. Browser Back could exit the assessment tab instead of returning to the assessment entry point.
4. Public assessments were reported as showing incomplete options.

## Root causes established

### 1. Stop Public — database trigger incompatibility
The UI correctly called `stop_public_assessment_secure`, but the P2 immutability trigger rejected the legitimate lifecycle update because it changed `is_active` and `updated_at`.

The exact production error was:
`Published assessment may only change approved editorial metadata or lifecycle state`.

The trigger's old `updated_at` condition treated a lifecycle-only update as a forbidden mutation.

### 2. Public runtime did not enforce visibility state
The public `assessment-access` Edge Function selected the family's `current_published_version_id` but did not require that version to also be `is_active=true`.

Therefore Stop Public could be accepted at the data layer once fixed, while public content/access could still be served.

The runtime now requires:
- status = `published`
- is_active = `true`

for public catalog/content/access and for creation of a new public session. Existing in-progress sessions remain valid.

### 3. Report details
The report modal used only the in-memory `allLeads` snapshot. A stale/missing snapshot entry caused the exact error shown by the Owner.

The detail path now falls back to a direct server lookup by lead ID before failing.

### 4. Public option completeness
Production data was rechecked against the published versions:
- Admin/Reception: 11 questions / 33 options
- Clinic Performance: 9 / 45
- Comprehensive Clinic v10: 36 / 108
- Medical Team: 12 / 44
- Patient Journey: 25 / 75

The database graph is intact. The public Edge Function maps all options belonging to each question and now orders them by canonical `option_index`. The public renderer preserves that canonical index when selecting/saving an option.

The published assessment model is intentionally mixed: Comprehensive/Admin-Reception/Patient-Journey are predominantly 3-state; Clinic Performance is 5-state; Medical Team is mixed 3/4-state. No option rows were deleted by the P5 editor corrections.

## Verification

### Database lifecycle transaction
Using the authenticated Owner identity in a rollback-only transaction:
- Stop Public: succeeded.
- Resume Public: succeeded.
- Stop Public again: succeeded.
- Archive: succeeded.
- Restore: succeeded.
- Transaction rolled back; production lifecycle state was not changed by the test.

### Edge Function
`assessment-access` deployed as version 19 with the visibility enforcement.

### Cloudflare Pages
Production deployment:
- Project: `clinicevaluat`
- Commit: `2d99700436a4e58119798437bd8febe5b5cac703`
- Deployment: `1357310f-a471-438d-8095-289b34c2cc73`
- Status: success

Public HTML cache-bust is now `app.js?v=20261004-3`.

## Architectural boundaries
- P0–P4 remain closed.
- No scoring formula or P3 interpretation was changed.
- No protected-table privilege expansion was introduced.
- Stop Public remains separate from Archive.
- Published remains Published when public visibility is stopped.
- Archive remains a separate lifecycle operation.
- Archived versions remain historical/read-only except secure Restore.

## Acceptance gate
P5 is **not closed** until the Owner confirms the production browser flows:
1. Stop Public → assessment becomes unavailable publicly.
2. Resume Public → assessment becomes available publicly.
3. Archive remains separate from Stop Public.
4. Browser Back returns to the assessment entry point.
5. Report details opens the selected record reliably.
6. Each question displays its complete stored option set.
7. A public assessment can start, answer, progress, and complete normally.

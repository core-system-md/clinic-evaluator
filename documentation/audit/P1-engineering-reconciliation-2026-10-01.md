# P1 Engineering Reconciliation — 2026-10-01

Status: IMPLEMENTED / VERIFIED. P1 is closed with one documented platform constraint: Supabase leaked-password protection remains unavailable on the current Free plan and is intentionally not enabled.

## Owner architectural decision gate

No new product or architecture decision was required during P1 hardening. Existing decisions remain authoritative:
- Supabase Auth + public.admin_users for admin identity/authorization.
- assessment-access is the public/protected assessment gateway.
- scoring and completion remain server-authoritative and idempotent.
- assessment_session_access remains server-only.
- no service-role secret is shipped to browser code.
- legacy admin-auth remains retired.

## P1-A Auth hardening

Implemented:
- Completed the admin password-recovery callback and change-password UI.
- Recovery remains tied to a Supabase Auth recovery token.
- After password update, admin_users authorization is re-checked before dashboard access.
- Browser authorization remains in sessionStorage, not localStorage.
- Leaked-password protection was checked through Supabase Auth configuration.

Verified:
- Existing owner record is active.
- is_active_admin(owner_user_id) returns true under authenticated-role simulation.
- Password recovery remains non-enumerating in the UI.

Platform constraint:
- Supabase Security Advisor reports auth_leaked_password_protection.
- The owner explicitly chose to remain on the Supabase Free plan.
- Supabase reported that HaveIBeenPwned leaked-password protection is available on Pro plans and up.
- No arbitrary SQL workaround or unapproved custom replacement was introduced.
- This is documented as an accepted platform constraint, not an unresolved application defect.

## P1-B SECURITY DEFINER

Verified:
- All 14 browser-used administrative SECURITY DEFINER RPC capabilities require require_admin().
- Administrative SECURITY DEFINER functions use an explicit search_path.
- is_active_admin() and is_owner() are retained because RLS authorization depends on them.
- anon EXECUTE is absent from the administrative RPC set.
- legacy calculate_session_score() and duplicate_assessment() remain non-executable by anon/authenticated.
- public.update_updated_at_column() client EXECUTE was revoked.

The remaining 16 Advisor warnings are intentional exposed admin/RLS helper capabilities, not unguarded generic CRUD gateways.

## P1-C pg_net

Verified:
- pg_net was installed in public before P1.
- No repository/database caller was found.
- request queue was empty and stored response table was empty.
- No application trigger references net.http_*.
- pg_net was recreated in the supported extensions schema.
- The pg_net security-advisor finding disappeared after relocation.

## P1-D Cron

Verified:
- cron.job is empty.
- No current repository requirement for cron.schedule/pg_cron was found.
- Two orphaned legacy Edge Functions referenced nonexistent legacy tables:
  process-retention-queue -> clinic_automated_messages
  auto-release-locks -> appointments
- Both were retired in place with HTTP 410 responses; no current cron job depends on them.
- No new cron schedule was invented because current product behavior does not establish a required retention/lock job.

## P1-E External browser E2E

Closed by actual owner-run production verification:
- The production assessment was opened in a real browser.
- Lead information was submitted successfully.
- The first-answer failure previously observed as “Internal error” was resolved after adding the matching unique constraint for the answer upsert.
- The user answered the second question and continued through the remaining assessment.
- The assessment was completed successfully.
- The result report was generated successfully.
- No screenshot was required; the owner provided direct runtime confirmation.

Root cause fixed during P1-E:
- assessment-access saves answers with ON CONFLICT (session_id, question_id).
- public.answers lacked the corresponding unique constraint.
- Existing non-null session/question pairs were checked for duplicates and none were found.
- Added answers_session_question_unique.
- Matching repository migration:
  20261001083200_p1_e_fix_answers_upsert_conflict.sql
- Git commit:
  22c1ba4d8b217c8feba74cc71da30a0d6c3e77a8
  Fix assessment answer upsert conflict constraint

Runtime:
- assessment-access is ACTIVE v7 and verify_jwt=false by intentional custom opaque-token authentication.
- admin-auth remains retired behavior.
- Browser code uses assessment-access for assessment runtime.
- Official completion functions remain server-only.

## P1-F Browser/API minimization

Verified by repository search:
- no active localStorage authorization model.
- no service-role credential present in browser source.
- no direct browser REST calls to answers/scores/sessions/assessment_users were found.
- assessment-access owns public/protected runtime access.
- admin dashboard direct REST/RPC access is authenticated and guarded by admin_users/require_admin.
- official scoring/completion remains server-side.

## P1-G Migration discipline

Live migration history was reconciled against repository state.

P1 migrations applied and recorded:
- 20261001080710 p1_pg_net_client_execute_revoke
- 20261001080714 p1_revoke_client_trigger_helper
- 20261001080806 p1_relocate_pg_net_to_extensions
- 20261001083200 p1_e_fix_answers_upsert_conflict

Those P1 migration files are present in the repository with matching version names. The pre-existing repository P0 migration files were not replayed into production because live schema/history already contains their resulting security state and replaying them would violate migration discipline.

## Final P1 gate

Closed by evidence:
- no new architecture decision required
- owner-run external production E2E completed successfully through result report generation
- assessment answer persistence failure fixed and migration recorded
- SECURITY DEFINER admin boundaries reviewed
- pg_net posture resolved
- broken/orphaned cron-era functions retired
- cron remains empty because no current job requirement was established
- browser/API minimization reviewed
- migration drift documented and P1 migrations reconciled
- no browser service-role secret
- sensitive workflow tables have no anon SELECT privilege
- legacy scoring/duplication functions are not callable by anon/authenticated

Accepted platform constraint:
1. Supabase Auth leaked-password protection remains disabled because the project intentionally remains on the Free plan. This remains visible as a Supabase Security Advisor warning and should be revisited only if the owner chooses to upgrade or changes the security requirement.

P1 status: CLOSED WITH DOCUMENTED PLATFORM CONSTRAINT.

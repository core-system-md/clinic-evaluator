# P1 Engineering Reconciliation — 2026-10-01

Status: IMPLEMENTED / VERIFIED where evidence permits. P1 remains open only for external-control Auth configuration and external browser E2E that require capabilities not available through the connected Supabase/Cloudflare APIs.

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

Verified:
- Existing owner record is active.
- is_active_admin(owner_user_id) returns true under authenticated-role simulation.
- Password recovery remains non-enumerating in the UI.

Open external configuration:
- Supabase Security Advisor still reports auth_leaked_password_protection.
- The connected Supabase toolset does not expose the Management API Auth Config read/write endpoint.
- Current Supabase documentation exposes GET/PATCH /v1/projects/{ref}/config/auth and password_hibp_enabled; enabling it requires Management API auth_config_write/project_admin_write permission.
- No arbitrary SQL workaround was used.

## P1-B SECURITY DEFINER

Verified:
- All 14 browser-used administrative SECURITY DEFINER RPC capabilities require require_admin().
- Administrative SECURITY DEFINER functions use an explicit search_path.
- is_active_admin() and is_owner() are retained because RLS authorization depends on them.
- anon EXECUTE is absent from the administrative RPC set.
- legacy calculate_session_score() and duplicate_assessment() remain non-executable by anon/authenticated.
- public.update_updated_at_column() client EXECUTE was revoked.

The remaining 16 Advisor warnings are therefore intentional exposed admin/RLS helper capabilities, not unguarded generic CRUD gateways.

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

Repository/runtime verification:
- assessment-access is ACTIVE v7 and verify_jwt=false by intentional custom opaque-token authentication.
- admin-auth remains retired behavior.
- Browser code uses assessment-access for assessment runtime.
- Official completion functions remain server-only.

External browser limitation:
- A true end-user browser session could not be completed through the connected toolset. Cloudflare Browser Rendering was attempted for production smoke verification but its API returned rate-limit 2001 before a rendered result was obtained.
- Therefore no false claim of browser E2E closure is made.

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

Live contains older migrations:
- 20260930233955 add_server_scoring_rpc
- 20260930234340 unify_public_and_protected_assessment_access
- 20260930234428 preserve_access_for_idempotent_completion
- 20260930234953 pin_assessment_version_on_session
- 20260930235404 admin_identity_foundation
- 20261001061605 admin_dashboard_auth_hardening

P1 migrations now applied and recorded live:
- 20261001080710 p1_pg_net_client_execute_revoke
- 20261001080714 p1_revoke_client_trigger_helper
- 20261001080806 p1_relocate_pg_net_to_extensions

Those P1 migration files are now present in the repository with matching version names. The pre-existing repository P0 migration files were not replayed into production because live schema/history already contains their resulting security state and replaying them would violate migration discipline.

## Final P1 gate

Closed by evidence:
- no new architecture decision required
- SECURITY DEFINER admin boundaries reviewed
- pg_net posture resolved
- broken/orphaned cron-era functions retired
- cron remains empty because no current job requirement was established
- browser/API minimization reviewed
- migration drift documented and P1 migrations reconciled
- no browser service-role secret
- sensitive workflow tables have no anon SELECT privilege
- legacy scoring/duplication functions are not callable by anon/authenticated

Not yet CLOSED:
1. Supabase Auth leaked-password protection must be enabled through the Supabase Management API/Dashboard.
2. External real-browser E2E must be completed against production.

These are verification/configuration gates, not unresolved product or architecture decisions.

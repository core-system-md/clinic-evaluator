
> **Current-status note — 2026-10-01:** This is a historical handoff/reconciliation record. Where it names older Edge Function versions or intermediate migration names, those references describe the state at that checkpoint. The current production state is maintained by the later P2 closure record and current project roadmap.

# P0 -> P1 SESSION HANDOFF

Date: 2026-10-01
Project: core-system-md/clinic-evaluator
Status: P0 CLOSED.

## Next-session directive
Start from this document and the live repo/database state. Do not reopen P0 unless new evidence shows regression. Continue directly with P1 hardening and verification.

## P0 completed
- Supabase Auth is the administrator identity layer.
- public.admin_users is the administrator authorization source of truth.
- Primary owner is established and production login was successfully verified by the project owner.
- admin/admin-session.js was hardened; cached admin scripts were busted.
- Legacy admin/admin-auth.js was removed.
- Legacy admin-auth Edge Function was retired in Supabase; live version 6 returns HTTP 410 and does not proxy CRUD/authentication.
- Anonymous/authenticated direct table privileges were revoked from the public application tables.
- Active administrators retain required dashboard SELECT access protected by is_active_admin(auth.uid()).
- assessment_session_access remains server-only.
- Browser assessment runtime uses assessment-access as the gateway.
- Official scoring/completion is server-authoritative and idempotent.
- Protected usage is consumed only on successful completion.
- Legacy calculate_session_score(uuid) is no longer executable by public/authenticated roles and is not the official scoring boundary.
- Legacy duplicate_assessment(uuid) execution was revoked from public/authenticated roles.
- update_updated_at_column and the legacy function search paths were hardened.
- Broken legacy cron jobs were removed from the active schedule; cron.job is currently empty.
- P0 production hardening is recorded in supabase/migrations/20261001190000_p0_security_closure.sql.

## Key commits
- 7d5eacb2c0994731d70f246fa148eb8768f73416 — admin sign-in request hardening
- 443d21304c754d68954863fa4867b4b8eb465a18 — admin cache bust
- 20c3fccd2f555110b6f1ab9f86c798baa69a271c — remove legacy admin-auth client
- 4f658fffffb78bae1752fadf26badb27442a99f7 — P0 migration artifact
- c845035d1a5f6e23f251523389d0a49371b01a8d — legacy function search-path hardening
- a82a314679694ef16b8d43b856f816e4be4bef23 — P0 status documentation closure
- baa909dfe9449ac0813f38cca259d94761c831ab — P0 findings closure

## Production edge functions
- assessment-access: ACTIVE v7, custom opaque-token authentication, verify_jwt=false intentionally.
- admin-auth: ACTIVE v6 only as a retired endpoint returning HTTP 410.

## Verification already completed
- Owner production login was successfully confirmed.
- Owner-authorized database simulation can read required dashboard data.
- Anonymous access to revoked tables fails at the PostgreSQL privilege boundary.
- Protected workflow tables are inaccessible to anon/authenticated roles.
- Official completion functions are service-role-only.
- Database transaction tests for protected/public start, resume, completion, and idempotency passed with test data cleanup.

## Important verification gap
A full external real-browser positive E2E against the live assessment-access function was not completed in the previous environment because direct function invocation was unavailable there. Treat this as a P1 verification task, not as a known production failure.

## Remaining Supabase advisor findings
- RLS enabled with no policy on five intentionally server-only tables.
- 16 SECURITY DEFINER admin functions remain callable by authenticated users; they use require_admin() and should be minimized/reclassified in P1.
- auth_leaked_password_protection remains disabled.
- pg_net remains in public; ALTER EXTENSION ... SET SCHEMA failed because pg_net does not support SET SCHEMA. Resolve with supported Supabase procedures; do not blindly retry.

## P1 START HERE

### P1-A Auth hardening
Enable leaked-password protection using supported Supabase Auth configuration. Review administrator password/session policy and password-reset/callback behavior. Never expose secrets.

### P1-B SECURITY DEFINER minimization
Inventory all remaining SECURITY DEFINER functions. Classify required admin mutation vs server-only vs legacy. Revoke unnecessary EXECUTE grants and move server-only helpers out of the exposed schema where justified.

### P1-C pg_net hygiene
Identify current pg_net callers, confirm the supported Supabase procedure for extension placement, and make the posture reproducible in Git.

### P1-D Cron reconstruction
Determine which retention/lock jobs are still required. Rebuild only required jobs using managed secrets and least privilege, then verify successful execution and observability.

### P1-E External browser E2E
Verify public catalog, public start, answer save, protected login/start/resume, completion, official score, repeated completion idempotency, expiry/max-use behavior, response shape, absence of scoring leakage, and approximate latency.

### P1-F Browser/API minimization
Search all browser code for direct table access, direct RPC calls, old localStorage auth, old scoring config, direct score writes, or direct session completion writes.

### P1-G Migration discipline
Reconcile live migration history with Git before adding more schema changes. Establish the reviewed baseline strategy and keep production SQL represented in source control.

## P1 acceptance
P1 is complete only after: Auth hardening enabled; unnecessary SECURITY DEFINER exposure removed; cron rebuilt and verified where required; pg_net posture resolved/documented; external browser E2E completed; no public sensitive-table access outside approved gateways; no browser service-role secret; migration state reconciled; final Supabase advisor review performed.

## Non-regression rules
Keep Supabase Auth + admin_users. Never restore localStorage authorization. Never ship service-role credentials. Keep scoring values/rules private. Keep official scoring server-authoritative. Consume protected usage only on successful completion. Preserve idempotent completion. Keep assessment_session_access server-only. Do not revive legacy admin-auth as a generic gateway.

## Final handoff
P0 is closed. The next conversation starts at P1: Security Hardening, Operational Recovery, and External E2E Verification.

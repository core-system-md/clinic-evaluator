# P0 — Current Baseline Findings

**Status:** P0 CLOSED — 2026-10-01

## Final authorization model

- Supabase Auth is the administrator identity provider.
- `public.admin_users` is the authoritative authorization source.
- The primary owner is the active `owner` account selected in ADR-008.
- The production dashboard has been successfully authenticated with the owner account.
- Sensitive application tables are no longer directly accessible through the anonymous Data API.
- Active administrators receive only the dashboard read privileges required by the current UI; privileged mutations remain behind guarded server/RPC boundaries.
- Protected assessment session-access records are server-only.

## Final scoring/access boundary

- Browser assessment content is served through `assessment-access`.
- Scoring values, impacts, traps, KPI mappings and equations are not exposed through the public Data API.
- Answers are persisted through the assessment gateway.
- Official scoring and completion are server-authoritative and idempotent.
- Legacy client scoring and legacy completion paths are not production security boundaries.

## Legacy paths closed

- Legacy browser `admin-auth` client removed.
- Legacy `admin-auth` Edge Function retired with HTTP 410.
- Legacy `calculate_session_score(uuid)` public/authenticated execution revoked.
- Legacy `duplicate_assessment(uuid)` public/authenticated execution revoked.
- Broken legacy cron schedules were removed rather than left running against placeholder/nonexistent configuration.

## Repository source of truth

- P0 database hardening is recorded in `supabase/migrations/20261001190000_p0_security_closure.sql`.
- ADR-001 through ADR-008 remain the governing architecture decisions.

## Remaining non-P0 hardening

The project can continue with P1 work such as managed Auth password-leak protection, replacement/rebuild of any retired operational cron jobs using managed secrets, deeper function/API minimization, and final external browser E2E coverage for protected assessments.

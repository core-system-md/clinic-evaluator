# P0.1–P0.3 — Authentication, Public Data Access, SECURITY DEFINER

**Date:** 2026-09-30  
**Repository:** `core-system-md/clinic-evaluator`  
**Branch:** `documentation/audit-and-decisions`  
**Baseline:** `4f3af091b244110192acae78d5de10f87d1c41eb`  
**Supabase:** `oaqpzaarppccbnepffxx`

## Status

**Architectural Decision Required.** No production code or database policy was changed during this investigation.

## Scope

This gate covers:
1. Admin authentication and authorization.
2. Public/anonymous data access.
3. SECURITY DEFINER functions and their exposure.

The investigation included current code, current database state, runtime logs, Supabase Advisors, and relevant Git history.

## Current admin authentication

The active `admin/admin.js` uses a browser-side password comparison against the literal value `admin` and stores a timestamp in `localStorage` as `core_admin_session`. A 24-hour timestamp is then treated as an active admin session.

The current `admin/admin.html` loads `admin/admin-auth.js`, but repository search finds the `AssessmentAuth` class without a current instantiation path. The current dashboard is therefore gated by the browser-side mechanism rather than by the Edge Function authentication class.

## Historical context

Git history shows a clear evolution:
- 2026-06-27: the first `AssessmentAuth` implementation queried `assessment_users` directly from the browser, hashed passwords with SHA-256, incremented `used_count`, and stored a 24-hour session.
- 2026-07-06: `admin-auth.js` was changed to use the `admin-auth` Edge Function. The commit explicitly described the change as avoiding an exposed Service Role Key.
- The same day, that file was deleted. A later copy remained under `admin/admin-auth.js`.
- 2026-07-07: the active `admin.js` was changed to the current browser-side password and localStorage session mechanism.

The history proves that a server-side authentication approach was attempted and later replaced. The history does not prove why the replacement happened. That reason must remain unknown until product history or owner clarification establishes it.

## Public data access currently required by the product

The public assessment intentionally uses the Supabase publishable/anon client to:
- read published assessment configuration;
- create a lead;
- create and update a session;
- save answers and scores;
- perform duplicate-submission checks;
- optionally check assessment access settings.

These are legitimate public workflows. Therefore anonymous access itself is not the defect.

The problem is that the current policies grant capabilities far beyond those workflows.

## Current sensitive-data exposure

Current RLS policies include:
- `leads`: public SELECT with `true`; anon UPDATE with `true`; public/anon INSERT.
- `sessions`: public SELECT with `true`; anon UPDATE with `true`; public/anon INSERT.
- `answers`: public SELECT with `true`; public/anon INSERT.
- `scores`: public SELECT with `true`; public/anon INSERT.
- `assessment_users`: anon SELECT and anon UPDATE with `true`.
- `axes`: anon/authenticated ALL with `true`, plus public/anon SELECT policies.

Together with broad table grants, this makes the public role a very large trust boundary. In particular, the public assessment does not need anonymous access to all historical leads, answers, scores, or sessions.

The current admin dashboard does need broad reads because `assessment-manager.js` also uses the public client to load leads, scores, and answers. This creates a plausible historical reason for the broad policies: administrative functionality was moved onto the same client/data path as the public application. This is a hypothesis supported by code structure and history, not a proven business decision.

## SECURITY DEFINER functions

The live database contains 14 exposed SECURITY DEFINER administrative functions. They include:
`save_assessment_secure`
`save_axis_secure`
`save_question_secure`
`save_option_secure`
`add_option_secure`
`update_option_secure` (two overloads)
`delete_option_secure`
`duplicate_assessment_secure`
`import_assessment_secure`
`generate_assessment_user_secure`
`toggle_assessment_auth_secure`
`update_assessment_status_secure`
`check_assessment_leads_secure`

The database grants EXECUTE on these functions to both `anon` and `authenticated`.

The function bodies inspected during the investigation perform direct administrative mutations without checking `auth.uid()`, an application role, or another server-side authorization predicate. Examples:
- assessment create/update;
- axis/question/option create/update/delete;
- assessment duplication and import;
- publishing/archiving/activation changes;
- access-code user creation;
- assessment authentication enable/disable.

Therefore the current `_secure` RPC layer is not itself an authorization boundary. It elevates execution privileges while the caller remains allowed to invoke the function.

All 14 have `proconfig = NULL`, so their search path is not pinned.

Supabase guidance recommends SECURITY INVOKER by default; where SECURITY DEFINER is necessary, the search path should be pinned and execution should be granted only to roles that need it. Exposed SECURITY DEFINER functions require special care. https://supabase.com/docs/guides/database/functions

## Admin Edge Function

The deployed `admin-auth` function is version 5 with `verify_jwt=true`.

Its handler creates a Service Role client and accepts a generic action payload supporting arbitrary table SELECT/INSERT/UPDATE/DELETE, arbitrary RPC invocation, and arbitrary Storage upload. Non-public actions are additionally checked against a SHA-256 hash of a password supplied in the request body.

The function also has CORS `*` and an in-memory 60 requests/minute IP limiter.

The current repository does not use this generic gateway as the active admin path. The public application also does not use it for assessment-user login; current `app.js` performs direct `assessment_users` access and `used_count` update through the public client.

Recent logs inspected for the last 24 hours showed 3,507 postgres events, 1 edge event, and 0 function_edge_logs. The single edge event was an OPTIONS request to the public REST `assessment_types` endpoint and was not evidence of `admin-auth` use.

## Assessment-user authentication is currently dormant

`assessment_settings` currently contains one row for `clinic-performance` with `auth_enabled=false`.

`assessment_users` currently contains zero rows.

Thus the paid/protected assessment login path is not active in current data, although code and database objects for it remain present.

## Other current security observations linked to this gate

- 4 tables have RLS enabled without any policies: `experience_multipliers`, `specialty_profiles`, `team_capacity_factors`, `traps`. Their lack of policies appears consistent with these being configuration/internal tables, but this must be confirmed before changing them.
- 17 public functions have mutable search paths according to the current Supabase Advisor.
- `pg_net` is installed in `public`.
- leaked-password protection is disabled in Supabase Auth.
- multiple permissive RLS policies exist across several tables, indicating policy accumulation from different development stages.
- the repository contains no public audit-log subsystem, and no audit/logging implementation was found by repository search.

## P0 conclusion

The investigation does not support treating the situation as one isolated RLS bug. The evidence shows overlapping generations of security architecture:

`public browser client` → `direct DB access` → `secure RPC experiments` → `admin-auth Edge Function experiment` → `current browser-side admin gate`

At the same time, the live database accumulated broad grants and policies sufficient to keep these paths working.

The central architectural problem is therefore **trust-boundary definition**, not the existence of one bad function or one missing policy.

## Architectural options

### Option A — Authenticated admin + RLS

Use real Supabase Auth for administrators, explicit application roles/permissions, narrowly scoped anonymous public operations, and RLS as the database authorization boundary.

**Main consequence:** strongest alignment with Supabase authorization, but requires introducing an explicit admin identity/role model.

### Option B — Public frontend + server-side application API

Keep the public assessment anonymous, but put all sensitive reads/writes and administration behind narrowly scoped Edge Functions. The browser never receives bulk lead/answer/score datasets.

**Main consequence:** preserves a simple public assessment client and creates a strong server boundary, but requires building and maintaining a deliberate application API.

### Option C — Hybrid

Keep only genuinely public assessment reads and narrowly scoped public submission operations in the Data API. Put admin operations and sensitive result access behind authenticated server endpoints. Keep paid assessment access as a separate server-side subsystem if it remains a product requirement.

**Main consequence:** flexible and compatible with the current product shape, but requires explicit separation of public and administrative capabilities.

## Decision questions for the owner

Before any remediation, the project owner must decide:
1. Is the admin system single-owner or will there be multiple administrators?
2. Should administrators use Supabase Auth, or should admin access remain a separate application authentication system?
3. Must the public assessment remain completely unauthenticated?
4. Exactly which operations must the public browser perform directly?
5. Should leads/answers/scores/sessions ever be directly addressable by the public Data API?
6. Is the paid assessment/access-code system still part of the intended product?
7. Should `admin-auth` be retained, rewritten, or retired?
8. Are anonymous CRUD capabilities on assessment definitions intentionally required?
9. Should privileged database functions remain exposed through the Data API at all?
10. What audit trail is required for administrative actions?

## Architectural Decision Required

Select **A, B, C, or a custom trust-boundary architecture**.

The selected architecture should define the authentication authority, authorization authority, anonymous capability boundary, sensitive-data access boundary, privileged-function exposure, and the future role of the current admin-auth/access-code mechanisms.

No production RLS policy, grant, function, Edge Function, authentication mechanism, or data model should be changed until this architectural decision is approved by the project owner.
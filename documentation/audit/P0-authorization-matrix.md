# P0 — Authorization Matrix / Security Boundary Audit

**Status:** INVESTIGATING
**Date:** 2026-10-01

## Evidence source

Live Supabase project inspection of RLS policies and table grants. No production policy changes made by this document.

## Current authorization reality

| Resource | Current public/anon capability | Target responsibility |
|---|---|---|
| `assessment_users` | SELECT + UPDATE, with unconditional policies; broad table grants also exist | Server-only assessment authentication and usage accounting; admin management separately |
| `sessions` | INSERT + UPDATE + SELECT through unconditional public/anon policies; broad grants also exist | Assessment-session server boundary; admin read/manage |
| `answers` | INSERT + SELECT through unconditional public policies; broad grants also exist | Session-scoped server persistence; no arbitrary public read |
| `scores` | INSERT + SELECT through unconditional public policies; broad grants also exist | Server-owned official scoring/result persistence; controlled result access |
| `leads` | INSERT + UPDATE + SELECT through unconditional public/anon policies | Must be scoped to the approved workflow; administrative access separate |
| `assessment_settings` | SELECT for anon; broad table grants also exist | Public-safe configuration only, or server-mediated if settings are sensitive |

## Important finding: RLS is not the only boundary

The live database grants give `anon` and `authenticated` broad table privileges including SELECT/INSERT/UPDATE/DELETE/TRUNCATE on several protected tables. Therefore tightening policies alone may not be sufficient. The final security design must reconcile both **GRANT privileges** and **RLS policies**.

## Database functions

The live public schema contains multiple `SECURITY DEFINER` functions, including secure assessment/admin mutation functions and `generate_assessment_user_secure`. These are architectural assets that should be inspected and reused where they correctly own the responsibility. They also require an explicit authorization review: function EXECUTE grants, `search_path`, caller validation, and ownership checks must be verified before being treated as secure boundaries.

## Current security conclusion

**PROVEN:** the current database security boundary is broader than the intended product boundary.

**PROVEN:** protected assessment data cannot currently be treated as safely isolated from the browser solely by relying on existing RLS.

**PROVEN:** ADR-006's server-side session model is required to establish a trustworthy assessment authorization boundary.

**NOT YET DECIDED:** exact final grants/policies and whether each operation is implemented as an Edge Function, narrowly scoped RPC, or a combination. This is an engineering design decision after the ownership/contract review, not a reason to modify production immediately.

## Next canonical action

Inspect the existing secure functions and their actual callers/contracts, then map each protected operation to one canonical owner:

1. authenticate assessment user;
2. create/resume assessment session;
3. save answer/progress;
4. complete and score session;
5. consume one use atomically and idempotently;
6. expose result;
7. admin CRUD and reporting.

Only after this mapping reaches **IMPLEMENTATION-READY** should database policies/grants be changed.
# P3 — Gate E Security & Runtime Baseline
## 2026-10-02

**Status:** Verification evidence — non-production  
**Purpose:** record the current live security/runtime facts relevant to P3 cutover. This document authorizes no production mutation.

## 1. Server-authoritative runtime

The current browser application does not directly calculate or persist official scores.

Verified repository behavior:
- the browser sends `save_answer` and `complete` requests to the `assessment-access` Edge Function;
- `assets/js/app.js` explicitly states that the browser no longer writes leads, sessions, answers, or scores directly;
- production completion invokes `complete_assessment_session` or `complete_public_assessment_session` from the privileged Edge Function;
- the active production scorer remains `score-engine.ts` and is not yet replaced by P3.

## 2. Direct table privilege check

A live read-only Supabase check on 2026-10-02 tested table privileges for `anon` and `public`:

| Capability | Result |
|---|---|
| anon INSERT answers | false |
| anon INSERT scores | false |
| anon INSERT sessions | false |
| public INSERT answers | false |
| public INSERT scores | false |
| public INSERT sessions | false |
| anon SELECT answers | false |
| anon SELECT scores | false |
| anon SELECT sessions | false |

Therefore the currently existing permissive RLS policies do **not** by themselves establish direct PostgREST table access for anonymous/public roles.

## 3. Policy hygiene findings

Supabase security advisors reported:
- RLS-enabled tables without policies: 6 INFO findings.
- SECURITY DEFINER functions callable by authenticated users: 17 WARN findings.
- leaked-password protection disabled: 1 WARN finding.

The security advisor also reported multiple permissive RLS policies on several public tables.

These findings are real configuration/hardening issues, but they are distinct from proof of anonymous direct table-write access.

The existing SECURITY DEFINER administrative RPCs must retain their intended authorization boundary (for example `require_admin()`) and should be reviewed individually before any permission changes are made.

## 4. P3 cutover requirement

Before P3 production cutover:
- preserve server-side scoring authority;
- preserve service-role-only completion RPC execution;
- add/verify the new Structured Result persistence permissions;
- verify that no client role can create or mutate an official calculated result;
- review and clean redundant permissive policies where safe, without changing the approved application behavior.

## 5. Current conclusion

**Server-authority baseline:** structurally satisfied by current application path and current table privilege checks.

**Security hardening:** still open for Gate E verification/cleanup.

No production schema, RLS policy, privilege, scorer, or data was changed by this evidence record.

# P0 — Protected Assessment Findings

## Confirmed

- `assessment_users` stores `max_uses`, `used_count`, `expires_at`, and `active`.
- The current Edge Function `admin-auth` performs assessment authentication but currently increments `used_count` during login.
- The browser also contains a legacy direct-access path to assessment authentication and stores a 24-hour marker in `sessionStorage`.
- The current `sessions` table already represents assessment progress: `status`, `current_question`, `started_at`, `completed_at`, and `duration_seconds` exist.
- `answers` and `scores` both reference `session_id`, giving the system an existing chain from session to submitted answers and scoring records.
- Current anonymous/public RLS policies are too broad: `assessment_users` allows anonymous SELECT and UPDATE; `sessions` allows anonymous INSERT/UPDATE/SELECT; `answers` allows anonymous INSERT/SELECT; `scores` allows anonymous INSERT/SELECT; and `leads` allows broad anonymous/public INSERT/UPDATE/SELECT.
- The current `admin-auth` Edge Function also exposes generic select/insert/update/delete/rpc/upload operations through a Service Role client. This must not remain the final security boundary.

## Accepted architecture

ADR-006 is accepted: use a server-side protected-assessment entitlement/session model, reuse the existing `sessions` record as the assessment session, and consume exactly one use only on successful completion. Re-completing the same session must be idempotent and must not consume another use.

## Remaining P0 work

Before implementation, complete the authorization matrix and define the exact server boundary for:
1. assessment authentication,
2. session creation/resumption,
3. answer persistence,
4. official completion/scoring,
5. atomic usage consumption,
6. admin-only operations.

No production policy or schema changes are made by this audit entry.

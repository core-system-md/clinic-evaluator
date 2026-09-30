# P0 — Protected Assessment Access — Implementation-Ready Design

**Status:** IMPLEMENTATION-READY
**Scope:** Protected assessment authentication, assessment session, completion, usage consumption, and authorization boundary.
**Architecture:** ADR-006 accepted — server-side assessment entitlement/session (Option B).

## 1. Verified current reality

- `assessment_users` owns assessment credentials and usage limits: `username`, `password_hash`, `max_uses`, `used_count`, `expires_at`, `active`.
- Current client code still directly reads `assessment_users` and increments `used_count` during login.
- Current `sessionStorage` marker is only a client-side 24-hour marker and is not a server-authoritative session.
- `sessions` already owns assessment progress and lifecycle: `status`, `current_question`, `started_at`, `completed_at`, `duration_seconds`.
- `answers.session_id` and `scores.session_id` connect work/results to the session.
- There is no database trigger on the protected workflow tables.
- There is no existing dedicated RPC for secure session creation/completion/usage consumption.
- Existing `SECURITY DEFINER` functions are primarily admin/content-management helpers; they do not implement the required protected assessment session lifecycle.
- `calculate_session_score` is a non-SECURITY-DEFINER database function and must not become the public security boundary for official completion.
- Current anonymous access policies/grants are broader than the intended security model and must be reduced as part of implementation.

## 2. Canonical ownership

| Responsibility | Canonical owner |
|---|---|
| Assessment credential | `assessment_users` |
| Assessment access enablement | `assessment_settings` |
| Assessment runtime session | `sessions` |
| Answers/progress data | `answers` linked to `sessions` |
| Official persisted axis results | `scores` linked to `sessions` |
| Lead/customer identity | `leads` |
| Authentication/session authorization | dedicated server-side assessment-auth/session functions |
| Official completion + usage consumption | one server-side atomic completion operation |
| Admin/content management | existing admin domain; protected separately from public assessment access |

No parallel session/usage subsystem is to be introduced.

## 3. Target flow

### Authentication

1. Client sends username, password, assessment key to a narrowly scoped authentication Edge Function.
2. Function validates the assessment is enabled, credential is active, not expired, and has remaining capacity for completion.
3. Password verification remains server-side; `password_hash` never leaves the server.
4. Function creates or resumes a server-authoritative assessment session and returns a short-lived signed session token containing only the minimum claims required to identify the protected assessment session.
5. Client stores the token only as a transport credential. Client storage is not authoritative.

### Session creation/resumption

- A session belongs to exactly one protected assessment credential/user and assessment.
- The session record remains the canonical progress record.
- A user may leave/re-enter without consuming a use.
- Resumption requires a valid server-issued session token.
- The token cannot grant access to another assessment or another user's session.

### Answer persistence

- Client may persist progress through a narrowly scoped server operation authorized by the assessment session token.
- Client cannot directly update arbitrary `sessions`, `answers`, or `scores` rows.
- Server verifies session ownership and assessment scope for every protected mutation.

### Completion

Completion is a single idempotent server-side operation:

1. Authenticate/authorize the assessment session.
2. If the session is already completed, return its existing official result and do not consume another use.
3. Validate required answers for the session.
4. Calculate the official score using the approved scoring logic.
5. Persist the official score(s) and completion state.
6. Atomically consume exactly one `assessment_users.used_count` only for the first successful completion of that session.
7. Return the persisted official result.

The operation must be safe under retries and concurrent requests.

## 4. Data-model requirements

Before implementation, add only the minimum fields/constraints required to bind a session to its protected credential and guarantee idempotency. The exact migration must be derived from the live schema and repository migration history immediately before implementation.

Required invariants:

- protected session -> one assessment credential/user
- protected session -> one assessment type
- completion -> at most one usage consumption
- completion -> at most one official result set for a session
- repeated completion of the same session -> same persisted result
- usage count cannot exceed max uses

Do not add a second usage ledger unless implementation evidence proves the existing model cannot satisfy these invariants.

## 5. Authorization matrix target

| Operation | Public anon | Assessment session | Admin | Service role/internal |
|---|---:|---:|---:|---:|
| Check whether assessment requires auth | limited read | yes | yes | yes |
| Authenticate assessment credential | scoped endpoint only | N/A | yes | yes |
| Read credential/hash | no | no | controlled | yes |
| Read assessment content | published content only | yes | yes | yes |
| Create session | no direct table write | scoped endpoint | yes | yes |
| Update session progress | no direct table write | own session only | controlled | yes |
| Insert/update answer | no direct table write | own session only | controlled | yes |
| Read own in-progress session | no direct table read | own session only | controlled | yes |
| Complete session | no direct table write | own session through completion endpoint | controlled | yes |
| Consume usage | no | only as part of completion | controlled/admin generation only | yes |
| Read official result | no arbitrary rows | own completed session | yes | yes |
| Manage assessment users | no | no | admin authorization | yes |
| Manage assessment configuration | no | no | admin authorization | yes |

The exact RLS predicates and grants are implementation details to be derived from this contract; they must not broaden the target permissions.

## 6. Security requirements

- Remove direct client access to `assessment_users` for authentication.
- Remove direct client update of `used_count`.
- Remove direct anonymous mutation of protected session/result tables.
- Replace the generic public Service Role CRUD gateway with narrowly scoped functions/endpoints.
- Service Role credentials remain server-side only.
- Every privileged function must set an explicit safe `search_path` where applicable and validate all ownership/scope parameters.
- Authentication responses must avoid leaking whether a username exists versus password mismatch where practical.
- Rate limiting/brute-force controls belong at the authentication endpoint; exact limits are an engineering decision unless product policy requires a specific value.

## 7. Acceptance criteria

### Authentication
- Correct credentials grant access only to the requested assessment.
- Invalid/inactive/expired credentials are rejected.
- `password_hash` is never returned to the browser.
- Login does not increment `used_count`.

### Usage
- Starting/resuming a session does not increment `used_count`.
- Abandoning a session does not increment `used_count`.
- Successful first completion increments exactly once.
- Repeated completion of the same session does not increment again.
- Concurrent completion requests cannot exceed `max_uses`.

### Data integrity
- A session cannot write answers for another session.
- A session cannot complete another session.
- A session cannot access another assessment through token manipulation.
- A failed completion does not silently consume an additional use.
- A completed session has a persisted official result.
- A session completed without a result is detectable as an integrity failure in admin reporting.

### Admin visibility
- Admin can distinguish in-progress/abandoned sessions from completed sessions.
- Admin can identify completed sessions lacking results.
- Admin can see used/max usage state without exposing credential hashes.

## 8. Verification plan

Before closure:

1. Static inspection of all affected client/server code.
2. Database schema and privilege inspection.
3. Unit tests for authorization and idempotency helpers.
4. Integration tests for authentication, session creation, answer persistence, completion, and usage consumption.
5. Concurrency test for duplicate completion.
6. Negative authorization tests for cross-session and cross-assessment access.
7. Regression tests for unprotected assessments.
8. Admin workflow test for incomplete and anomalous sessions.
9. Deployed runtime smoke test after deployment.

## 9. Implementation boundaries

Implementation may proceed without another product/architecture decision because:

- product behavior for usage consumption is explicitly approved;
- Option B is explicitly approved as ADR-006;
- existing `sessions` remains canonical;
- no new customer/tenant model is being introduced;
- the remaining work is engineering implementation of the approved boundary.

If implementation discovers that the existing schema cannot satisfy an invariant without changing product behavior, stop and return to an explicit decision boundary rather than silently changing the model.

## 10. Closure condition for this design gate

This document marks the design as **IMPLEMENTATION-READY**, not implemented or verified.

Implementation must move through:

`IMPLEMENT → VALIDATE → DOCUMENT → COMMIT → DEPLOY IF REQUIRED → RUNTIME VERIFY → CLOSE`.

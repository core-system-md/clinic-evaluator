# P4 — Implementation Design
## Atomic Submission, Resume, Idempotency & Finalization
## 2026-10-03

**Status:** APPROVED DESIGN / READY FOR IMPLEMENTATION  
**Owner approval record:** `documentation/architecture/P4-OWNER-APPROVAL-2026-10-03.md`  
**Branch:** `p4/investigation-2026-10-02`  
**Production baseline:** `assessment-access` v18

## 1. Objective

Implement the approved P4 rules without changing P3 scoring methodology:

- incremental answer persistence remains available during the assessment;
- the latest server-persisted answer for each question is authoritative at submission;
- final submission freezes one exact answer set before calculation;
- late answer writes are rejected once finalization begins;
- concurrent completion requests converge on one stored result;
- a timed-out successful submission can be retried safely;
- one eligible active attempt is resumed instead of creating a second active attempt;
- multiple tabs can share the same active attempt;
- completed attempts are immutable through the assessment runtime;
- lead capture remains independent and may exist without completion.

## 2. Canonical lifecycle

`LEAD_CAPTURED → SESSION_DRAFT → ANSWERS_PERSISTED → SUBMISSION_PROCESSING → SESSION_COMPLETED + RESULT`

A session has one business identity. A completed session is a completed use. A later intentional assessment is a new session/use.

Abandonment is non-destructive: an old in-progress session remains stored and becomes ineligible for resume after the configured inactivity window.

## 3. Database state additions

Add to `sessions`:

- `submission_state`: `draft | processing | completed`;
- `submission_snapshot` JSONB: exact server-side answer rows captured at submission;
- `submission_fingerprint` text: SHA-256 fingerprint of the canonical snapshot;
- `submission_started_at` timestamptz;
- `last_activity_at` timestamptz;
- `attempt_key_hash` text: non-secret browser-attempt identity, used to coordinate tabs/re-entry.

Create an index that supports active-attempt lookup by:

`(assessment_type_id, attempt_key_hash)`

The attempt key is a coordination identifier, not an authorization secret.

## 4. Access-token model for multiple tabs

The existing unique "one access row per session" constraint prevents two browser tabs from retaining independent valid bearer tokens for the same session.

P4 therefore changes this to:

- multiple valid access-token rows may reference the same session;
- `token_hash` remains globally unique;
- each token remains independently scoped to the same session and expires normally;
- completion/answer operations continue to validate the individual token against the session.

This preserves bearer-token isolation while allowing multiple tabs to operate on one business attempt.

## 5. Start/resume semantics

### Public

`start_session` receives an opaque client attempt key.

1. Validate access token.
2. If token already has a session, return that session.
3. Lock and search the active session for the same assessment version + attempt key.
4. If found and still eligible, attach the new access row to that same session and return it.
5. If not found, create the lead first, then create a new session and persist the attempt-key hash.

The existing lead-history/cooldown rules remain separate from the active-attempt resume rule.

### Protected

The server-side assessment user remains the durable identity for active-attempt reuse.

1. Lock the candidate user's latest in-progress session for the assessment version.
2. Reuse it while eligible.
3. Attach the new access token to the same session.
4. Create a new session only when no eligible in-progress session exists and usage remains available.

### Multiple tabs

The browser stores only the non-secret attempt coordination key in `localStorage`. Access tokens are not placed in localStorage.

The first tab can continue using its token; additional tabs use the shared attempt key to obtain their own scoped access token and attach it to the same session.

## 6. Draft answer persistence

Every answer change continues to use `save_answer`.

The save operation must:

- lock the session row with `FOR UPDATE`;
- require `status = in_progress`;
- require `submission_state = draft`;
- validate the question belongs to the pinned assessment version;
- upsert the single `(session_id, question_id)` row;
- update `last_activity_at`.

Consequences:

- changing an answer replaces the prior answer;
- there is never more than one authoritative current answer for a question;
- a save racing with submission is serialized;
- if submission wins the lock first, the later answer receives a conflict instead of silently changing the submitted result.

## 7. Submission preparation boundary

Introduce a transaction-safe `prepare_assessment_submission` RPC.

It:

1. locks the session row;
2. validates token/session ownership;
3. returns the stored completed result when already completed;
4. returns the existing submission snapshot when already processing;
5. verifies every required question for the pinned assessment version has an answer;
6. reads the current server-persisted answer rows;
7. creates a canonical JSON snapshot;
8. computes a SHA-256 fingerprint;
9. stores snapshot + fingerprint + processing state atomically;
10. returns the snapshot and fingerprint.

No score is calculated by this RPC.

This creates the authoritative handoff:

**latest persisted draft → immutable submission snapshot**

## 8. Calculation boundary

Keep P3 calculation in the Edge Function as approved.

The Edge Function receives the immutable submission snapshot from the preparation RPC and passes that snapshot to `calculateP3Production`.

The scorer therefore never re-reads mutable draft answers while the final submission is being calculated.

P3 scoring methodology, contract versions, and Structured Result rules are not changed by P4.

## 9. Finalization boundary

Extend the existing P3 completion RPC contract with the submission fingerprint.

Before persisting, the RPC:

- locks the session;
- validates access;
- returns the stored result if already completed;
- requires `submission_state = processing`;
- verifies the supplied fingerprint equals the stored snapshot fingerprint;
- preserves the existing P3 provenance validations.

Within the same transaction it then:

- persists score rows;
- persists the Structured Result;
- updates lead completion fields;
- increments protected usage exactly once;
- marks the session completed;
- retains the final submission snapshot and fingerprint as immutable provenance after successful persistence.

All writes commit or roll back together.

## 10. Retry behavior

### Client timeout after successful finalization

A later `complete` call locks the completed session and returns the stored Structured Result. No score recalculation and no second protected usage consumption occur.

### Function failure after preparation but before finalization

The session remains `in_progress + processing` with its immutable snapshot.

A retry reuses the stored snapshot, recalculates against exactly that snapshot, and attempts finalization again.

### Concurrent completion

Two requests may calculate concurrently from the same immutable snapshot, but finalization is serialized by the session lock. The first successful transaction completes the session; the second sees the completed state and returns the stored result.

## 11. Completeness enforcement

Required-question completeness is enforced at the preparation RPC, not only in the browser.

The existing UI rule remains unchanged: the user cannot advance from a visible question without an answer.

Server enforcement prevents direct/replayed requests from bypassing that rule.

## 12. Completion immutability

After completion:

- `save_answer` is rejected;
- progress updates are rejected/ignored;
- completion returns stored result;
- assessment runtime cannot revise the score/result.

Historical records outside the P4-owned active submission path are not rewritten.

## 13. Abandonment

Use `last_activity_at` as the resumability clock.

For P4 the first operational threshold is seven days of inactivity, chosen to remain consistent with the existing assessment repeat/cooldown window. Abandonment is a classification for eligibility only; the session, lead, answers, and any historical data remain stored.

This threshold is intentionally isolated so it can be changed later without changing the submission model.

## 14. Frontend changes

- replace per-tab-only session recovery with a non-secret shared attempt key;
- preserve access tokens outside localStorage;
- persist keyboard selections through the same server save path as click selections;
- prevent automatic navigation on a keyboard selection until its server save succeeds;
- keep the existing "must answer before next" UX;
- on final completion, clear the active attempt key for the next intentional assessment while allowing an already-open tab to finish reading its completed result.

## 15. Security constraints

- service-role key remains backend-only;
- assessment access tokens remain bearer credentials;
- attempt keys are not treated as authorization;
- no SECURITY DEFINER is added to the submission functions;
- existing service-role-only completion boundary remains;
- no broad new Data API grants are introduced;
- existing RLS/grant posture is preserved unless a narrowly scoped migration is required for the new columns/functions.

## 16. Migration / rollback

Migration is additive except for replacing the obsolete per-session access uniqueness constraint required for the approved multiple-tab behavior.

Rollback strategy:

- runtime rollback can restore the previous Edge Function;
- new P4 columns may remain unused after runtime rollback;
- the access uniqueness constraint can only be restored after verifying no valid multi-token session rows exist;
- no historical answer/result data is deleted.

## 17. Acceptance tests

At minimum:

1. lead persists before assessment and remains when assessment is abandoned;
2. one answer creates one row;
3. changing an answer replaces the prior row;
4. keyboard and click input both persist through `save_answer`;
5. incomplete finalization is rejected server-side;
6. submission snapshot contains the latest answer set;
7. answer write racing with submission is rejected after processing starts;
8. complete succeeds once and returns stored result on retry;
9. two concurrent completion requests converge to one result;
10. protected usage increments exactly once;
11. new access context resumes an eligible active attempt;
12. two tabs resolve to the same active attempt;
13. a completed attempt is not silently reused as a new attempt;
14. seven-day inactivity makes the old attempt non-resumable without deleting it;
15. historical rows remain unchanged;
16. all existing regression tests pass.

## 18. Production verification boundary

No production mutation is considered verified merely because the migration or function deployment succeeds.

The final acceptance requires live read/write verification with synthetic controlled data, explicit cleanup, and evidence that:

- answer/result/session identity remains consistent;
- retries are idempotent;
- no duplicate usage is consumed;
- rollback remains available;
- no historical rows changed.


## 19. Post-implementation verification — 2026-10-03

- Supabase migrations applied successfully:
  - `20261003090000_p4_submission_foundation`
  - `20261003093000_p4_submission_prepare_finalize`
  - `20261003103000_p4_submission_context_lock`
- Active production Edge Function: `assessment-access` **v18**.
- CI for branch head `977ad3151563c5f9fd4a6144e415858c052524d2`: P3 kernel verification and P2 external E2E verification both passed.
- Live P4 E2E passed for all five published assessment slugs.
- Verified live scenarios: concurrent active-attempt creation collapse, multi-tab resume, full required-answer submission, completion + Structured Result, idempotent retry, retry with changed economic input returning the same Structured Result, completed-session result restoration, late-answer rejection, and invalid-token rejection.
- Synthetic production data generated by verification was explicitly removed; post-cleanup baseline returned to 39 sessions / 17 in-progress / 22 completed / 5 stored results, with zero remaining recent test Leads.
- Protected usage increment was inspected in the transactionally serialized P4 finalizer but was not executed runtime with a synthetic protected user because the production SQL safety boundary blocked creating that security-sensitive test fixture. This remains **UNVERIFIED runtime**, not a failure.

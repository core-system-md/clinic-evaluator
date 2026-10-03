# P4 — Current-State Investigation Record
## 2026-10-02

**Status:** INVESTIGATION COMPLETE / OWNER APPROVAL REQUESTED — no P4 architecture approved; no P4 production change authorized  
**Repository:** `core-system-md/clinic-evaluator`  
**Baseline:** `main` at `f50aadc42c25eb0e0d2198bc9c6b20c9f7180ed5`  
**Supabase:** `oaqpzaarppccbnepffxx`

## 1. Scope

P4 is the roadmap phase **Atomic assessment submission and persistence architecture**. It covers:

- atomic submission;
- idempotency;
- retries;
- partial-failure recovery;
- answer/score/session consistency;
- lead association;
- duplicate-submission rules;
- server-side calculation boundaries.

This record is investigation only. It does not choose RPC vs Edge Function vs another architecture and does not authorize schema/runtime changes.

## 2. Verified production path

The active production gateway is `assessment-access`, Edge Function **v14**.

Observed flow:

1. `issue_public_access` / protected authentication creates an `assessment_session_access` token.
2. `start_session` may create a **lead** through a separate insert.
3. `start_session` then calls `start_public_assessment_session` or `start_assessment_session`.
4. The start RPC creates/reuses the **session** and binds the access token.
5. `save_answer` validates the question/option and performs an answer upsert independently.
6. `complete` locks the session and invokes the P3 completion RPC.
7. The P3 completion RPC persists score rows, Structured Result/provenance, lead completion state, session completion state, and protected usage consumption within one database function transaction.

## 3. Current atomicity boundary

**Verified:** final completion persistence is transactional inside the P3 completion RPC.

**Not equivalent to end-to-end submission atomicity:** lead creation, session creation, and answer persistence occur before that completion transaction and in separate calls.

Therefore the system can still represent intermediate/partial states if a later request fails, times out, is abandoned, or is replayed.

Two additional runtime-level consistency risks were confirmed during the investigation:

- `save_answer` checks `session.status = in_progress` and writes the answer in a separate operation from `complete`; there is no shared session-row lock around the answer write. This leaves a race in which a late answer can compete with finalization.
- The keyboard-input path in `assets/js/app.js` updates local `this.answers` and advances without calling `save_answerToServer`, so local answer state can diverge from server-persisted answers before completion.

These are target-design/implementation issues for P4, not production changes made during this investigation.

Examples requiring P4 treatment:

- lead created, session creation fails;
- session created, one or more answer writes fail;
- answers exist but completion never arrives;
- completion request reaches the server but client times out and retries;
- concurrent completion requests for the same session;
- duplicate access/start requests;
- abandoned in-progress sessions;
- completed session with a subsequent replay.

## 4. Existing idempotency / duplicate behavior

Verified current mechanisms:

- `answers` has a unique `(session_id, question_id)` constraint and the gateway uses upsert for answer saves.
- P3 completion locks the session with `FOR UPDATE`.
- Completed sessions return the stored Structured Result instead of recalculating.
- `assessment_results.session_id` is unique.
- Public/protected completion functions verify access token/session ownership and session state.
- Protected session start can reuse an existing in-progress session for the assessment user.

These mechanisms provide important existing behavior, but they do not by themselves define a complete business-level idempotency key or end-to-end submission state machine.

## 5. Current database boundary

Production migrations include:

- `20261002161455 — p3_production_implementation`
- `20261002161945 — p3_preserve_completion_access_v2`

Relevant production tables include:

- `leads`
- `sessions`
- `answers`
- `scores`
- `assessment_results`
- `assessment_session_access`

`assessment_results.session_id` is unique.

No P4-specific idempotency/submission-state schema was found or added by this investigation.

## 6. Server/client calculation boundary

The browser does not own official scoring. The production `assessment-access` function invokes `calculateP3Production`, and completion persists the resulting Structured Result through the privileged completion RPC.

P4 therefore should not reopen P3 scoring methodology. The investigation concern is the transaction/persistence boundary around submission and completion.

## 7. Security/runtime observations relevant to P4

The completion RPCs are not SECURITY DEFINER and are not executable by anon/authenticated through direct RPC privileges; the production Edge Function uses the service role.

The database currently has several historical/duplicate RLS policies and Supabase advisor findings. These are relevant constraints for any future P4 design but are not being changed by this record.

## 8. Reconciled P4 decision boundary

The investigation establishes the following:

- A long-lived assessment cannot be one database transaction from first screen to final result. Draft persistence and finalization must be separate boundaries.
- `sessions` is already the canonical lifecycle identity approved by ADR-006/P0, but the product meaning of one business submission is not yet explicitly defined across access-token reissuance, multiple tabs, and repeated attempts.
- Same-session completion is already technically idempotent; a separate submission/idempotency entity is not technically required unless the product needs business identity beyond `session_id`.
- Finalization must serialize against answer writes and must score the exact answer set that becomes final. The current split does not yet prove that invariant.
- Required-answer completeness is described in prior implementation-ready design material, but is not currently enforced by the live completion RPC; this remains a product/contract confirmation point.
- Historical completed-without-result rows are mostly from July/August 2026 and are not being rewritten by P4.

Architectural alternatives are recorded in:

`documentation/architecture/P4-ARCHITECTURAL-DECISION-PACKAGE-OWNER-APPROVAL-2026-10-02.md`

## 9. Owner approval record

1. What exactly constitutes one business submission?
2. Should lead creation be part of the same atomic unit as session creation?
3. Should answer persistence remain incremental, with only finalization atomic, or should a submission snapshot exist?
4. What client retry token/idempotency key semantics are required?
5. What happens when the client retries after an unknown outcome?
6. What happens with concurrent completion requests?
7. What is the authoritative state for an abandoned/in-progress session?
8. What duplicate-submission behavior is required after successful completion?
9. Which records must be immutable after completion?
10. Which historical behavior must remain compatible?

## 10. Required next action

Owner approval is now required for the architectural/product decisions documented in the decision package.

Until approval is recorded:

- no P4 schema migration;
- no production Edge Function change;
- no frontend behavior change;
- no RLS/grant redesign;
- no historical data rewrite.

**P4 investigation is complete and owner approval is recorded. Implementation and verification are now proceeding under the approved design; no historical data rewrite is in scope.**


## 10. P4 implementation evidence — 2026-10-03

The approved implementation is deployed to production as `assessment-access` v18 and has passed the live P4 external E2E matrix across all five published assessment families.

The live matrix proved one active attempt under concurrent starts, multi-tab resume, incremental answer persistence, final completeness enforcement, frozen-answer finalization, idempotent completion/retry, immutable completed-session behavior, and recovery of the stored Structured Result.

Protected usage is transactionally protected in the P4 finalizer by session locking plus assessment-user locking, and the second completion request returns the stored result before usage increment. Runtime execution of this protected fixture was intentionally not forced because the available production SQL safety boundary blocked creation of a synthetic security-sensitive user. Therefore this specific acceptance item remains **UNVERIFIED**.

No historical session/result/answer rewrite was performed. Synthetic E2E records were cleaned and the live data counts returned to the pre-P4 baseline.

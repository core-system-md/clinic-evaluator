# P4 — Current-State Investigation Record
## 2026-10-02

**Status:** INVESTIGATING — no P4 architecture approved; no P4 production change authorized  
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

## 8. Open P4 questions

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

## 9. Required next P4 work

Before architecture selection:

- reconstruct the complete state machine;
- enumerate all failure points and observable states;
- inspect constraints/foreign keys/RLS/function privileges for every transition;
- inspect Git history for why the current split boundaries exist;
- derive duplicate/retry semantics from existing product behavior;
- produce architectural alternatives and trade-offs;
- stop at the owner architectural decision boundary.

**No implementation or migration is part of this record.**

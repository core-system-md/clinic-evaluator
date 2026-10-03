# P4 — Owner Architectural Approval Record
## 2026-10-03

**Status:** OWNER APPROVED FOR P4 IMPLEMENTATION  
**Repository:** `core-system-md/clinic-evaluator`  
**Implementation branch:** `p4/investigation-2026-10-02`  
**Baseline main:** `f50aadc42c25eb0e0d2198bc9c6b20c9f7180ed5`  
**Supabase project:** `oaqpzaarppccbnepffxx`

This record supersedes the prior P4 package state of **OWNER APPROVAL REQUESTED** for the decisions listed below. The approval was given explicitly by the project owner in the continuation conversation on 2026-10-03.

## 1. Approved business decisions

| ID | Decision | Approved rule |
|---|---|---|
| D1 | Business submission identity | One `session_id` represents one assessment attempt. The attempt is not considered a completed use until final submission succeeds. Repeating the assessment after a completed attempt is a new use/new session. |
| D2 | Start/re-entry semantics | **B:** when an eligible in-progress attempt already exists, a new start/access context resumes that attempt rather than creating a second active attempt. |
| D3 | Lead/session boundary | Lead data is stored immediately before assessment start and is intentionally useful as a marketing lead even when the assessment is not completed. Lead creation does not have to be part of the same transaction as session creation. |
| D4 | Required answer completeness | **A:** final submission is rejected when any required question is unanswered. The current UI behavior that prevents moving forward without answering the visible question is preserved. Server-side enforcement is added/strengthened as the authoritative guard. |
| D5 | Retry after unknown completion outcome | **A:** if a submission succeeded but the client did not receive the response, retrying the same attempt returns the already stored result and does not create a duplicate use/result. |
| D6 | Concurrent completion | **A:** concurrent finalization requests for the same attempt serialize to one completed result. |
| D7 | Post-completion mutability | **A:** completed answers and the completed result are immutable through the assessment runtime. |
| D8 | Abandoned attempt | **A+B:** an in-progress attempt remains resumable while eligible; after the configured abandonment window it is operationally treated as abandoned so a new attempt can be started. Abandonment is non-destructive. |
| D9 | Authoritative final answers | Answers are persisted incrementally throughout the assessment. On final submission, the **latest server-persisted answer for each question** is authoritative. If an answer is changed before submission, the latest value replaces the earlier value. |
| D10 | Calculation boundary | **A:** retain the P3 calculation in the server-side Edge Function and harden the finalization boundary around it. The final answer set is frozen before calculation and the exact frozen set is the one scored and finalized. |
| D11 | Historical rows | Existing historical records remain untouched by P4. Historical organization/cleanup will be handled after P4 as a separate, explicit data operation according to record state. |
| D12 | Multiple tabs/access contexts | **A+C:** multiple tabs should resolve to the same active attempt, with a policy that prevents more than one active attempt for the same assessment/user context. |

## 2. Owner priority

The implementation must optimize for:

1. accuracy and consistency of the submitted result;
2. correct user experience and resumability;
3. strong backend safety even where this increases implementation complexity.

Backend implementation complexity is explicitly not a reason to weaken the above requirements.

## 3. Required invariants

The P4 implementation must guarantee:

- no completed attempt is recalculated into a different result;
- no duplicate protected usage is consumed for one completed session;
- no second active attempt is created where an eligible active attempt already exists;
- a late answer cannot be accepted after finalization begins;
- the result is calculated from exactly the answer snapshot that becomes final;
- a successful completion followed by client retry is idempotent;
- concurrent completion requests converge on the same stored result;
- incomplete required-answer sets cannot be finalized;
- completed answers/result cannot be mutated by the assessment runtime;
- lead capture remains available even when assessment completion does not happen;
- historical rows are not rewritten by P4.

## 4. Authorization boundary

This owner approval authorizes **P4 implementation work**. It does not by itself imply acceptance of unverified production behavior. Production deployment remains subject to the project verification, migration, rollback, and closure steps defined by the engineering operating contract.

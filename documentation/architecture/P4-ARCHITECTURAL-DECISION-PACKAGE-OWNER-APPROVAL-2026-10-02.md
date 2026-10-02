# P4 — Architectural Decision Package / Owner Approval
## 2026-10-02

**Status:** OWNER APPROVAL REQUESTED — implementation blocked by unresolved architectural/product decisions  
**Repository:** `core-system-md/clinic-evaluator`  
**Decision branch:** `p4/investigation-2026-10-02`  
**Baseline main:** `f50aadc42c25eb0e0d2198bc9c6b20c9f7180ed5`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Production Edge Function:** `assessment-access` v14

---

## 1. Purpose and decision boundary

P4 is the roadmap phase **Atomic assessment submission and persistence architecture**.

This package completes the investigation required before architecture selection. It is intentionally **not implementation authorization**.

The project contract requires:

`APPROVED INTENT → CURRENT REALITY → RECONCILIATION → ENGINEERING DECISION → DESIGN → IMPLEMENTATION`

P4 has now reached the **ENGINEERING DECISION / OWNER APPROVAL** boundary.

No P4 migration, Edge Function change, frontend change, RLS/grant change, or production data repair is authorized by this document.

---

## 2. Governing constraints already established

### 2.1 Existing approved architecture that P4 must preserve

From P2 and P0/ADR-006:

- stable public assessment family identity;
- concrete assessment-version pinning on sessions;
- completed sessions retain their version;
- `sessions` remains the canonical assessment-progress/lifecycle record;
- official scoring/completion is server-authoritative;
- protected usage is consumed only on successful completion;
- the same `session_id` must not consume a protected use twice;
- official result persistence and usage consumption must be consistent;
- historical rows are not to be silently rewritten.

P4 is therefore a refinement of the submission/persistence boundary, not a reopening of P2 versioning or P3 scoring methodology.

---

## 3. Verified current production reality

### 3.1 Runtime path

The deployed `assessment-access` v14 currently performs:

1. `issue_public_access` or protected `authenticate`.
2. `start_session`.
3. For a new lead, a separate `leads.insert`.
4. `start_public_assessment_session` or `start_assessment_session`.
5. Incremental `save_answer` upserts.
6. Separate `update_progress` writes.
7. `complete`.
8. `calculateP3Production` in the Edge Function.
9. A P3 completion RPC persists scores/result/provenance/session state and protected usage consumption.

### 3.2 Current transaction boundary

**PROVEN:**

The completion RPC is one database transaction boundary.

**PROVEN:**

Lead creation, session creation, answer saves, and completion are not one end-to-end transaction.

An assessment therefore has a deliberate long-lived draft phase plus a short completion transaction; holding one database transaction open for the entire user assessment is not practical.

### 3.3 Current database identities

The current schema already provides:

- one answer row per `(session_id, question_id)`;
- one `assessment_results` row per session;
- one non-null access row per session through a unique partial index;
- unique access token hashes;
- foreign-key linkage from answers/scores/results/access to sessions;
- `sessions` as the lifecycle anchor.

No P4-specific `submission_id`, idempotency-key, or submission-state table currently exists.

### 3.4 Current completion idempotency

**PROVEN:**

For an existing completed session, the system returns the persisted result rather than recalculating it.

**PROVEN:**

The completion RPC locks the session with `FOR UPDATE`.

**PROVEN:**

`assessment_results.session_id` is unique.

**PROVEN:**

The completion RPCs are only directly executable by `service_role`; anon/authenticated are denied direct RPC execution. The production Edge Function is the controlled caller.

This gives reliable **same-session completion idempotency**.

It does not define business idempotency across multiple independently issued access tokens or multiple logical attempts.

---

## 4. Reconstructed submission state machine

### 4.1 Current effective state machine

`ACCESS_ISSUED`
→ `LEAD_CREATED` (public flow may occur in a separate call)
→ `SESSION_IN_PROGRESS`
→ `ANSWERS_PARTIALLY_OR_FULLY_PERSISTED`
→ `COMPLETION_REQUEST`
→ `COMPLETION_TRANSACTION`
→ `SESSION_COMPLETED + RESULT`

There are also observed terminal/operational states:

- `IN_PROGRESS / ABANDONED`
- `COMPLETED / RESULT PRESENT`
- `COMPLETED / RESULT ABSENT` (historical/legacy anomaly)

### 4.2 What the current state machine does not explicitly represent

The live model has no durable distinction between:

- a user intentionally submitted;
- a completion request is being retried;
- a completion request reached the server but the client lost the response;
- completion is being processed;
- completion failed before commit;
- completion is pending recovery;
- a new attempt is intentionally distinct from an earlier attempt.

This is the principal P4 architectural gap.

---

## 5. Failure and retry matrix

| Failure / race | Current result | Classification | P4 consequence |
|---|---|---|---|
| Access issued, start never called | orphan access token row | Verified | Decide retention/cleanup; not completion corruption |
| Lead insert succeeds, session RPC fails | lead without bound session | Verified from split call boundary | Strong reason to define start atomicity |
| Same public token starts twice | second call resumes bound session | Verified | Good token-level replay behavior |
| New public token used for same person | new lead/session can be created | Verified | Requires business duplicate-attempt rule |
| Protected start retried | existing in-progress session can be reused | Verified | Protected behavior differs from public behavior |
| Answer request retried | upsert to same question/session | Verified | Good technical row-level idempotency |
| Answer save fails before commit | answer absent | Normal retryable failure | Client retries manually |
| Client times out after successful answer save | state may already be saved | Uncertain to caller, recoverable via get_session | Good if UI refreshes/reloads session |
| Client times out after successful completion commit | session/result already completed | Verified | Same-session retry returns stored result |
| Two completion requests race | session row lock serializes completion | Strong evidence / verified implementation | Must preserve after any redesign |
| Answer update races with completion | save path checks in_progress separately from write; no shared row lock | Verified design gap | Must be resolved in target architecture |
| Answer arrives after completion | current save path can race the final status transition | Verified design gap | Completion must become a true write boundary |
| Keyboard answer selection | browser updates local state but does not call save_answer | Verified code behavior | Client/server answer consistency must be enforced |
| Incomplete answers submitted | completion RPC does not enforce full required-question coverage | Verified | Business rule must be explicitly confirmed |
| Completion calculation uses stale answer set | possible when answer changes while Edge Function calculates | Architectural risk | Need snapshot/fingerprint/lock/state design |
| Completion transaction fails | PostgreSQL transaction rolls back writes in that function | Verified from RPC semantics | Retry must remain safe |
| Completed session replay | stored Structured Result returned | Verified | Preserve as compatibility contract |

---

## 6. Critical reconciliation findings

### 6.1 “Atomic completion” and “atomic whole assessment” are different requirements

A user assessment is long-lived. Its individual answer saves must survive refreshes and intermittent failures.

Therefore one database transaction cannot realistically cover the user’s entire assessment lifetime.

The practical architecture must separate:

**Draft/work-in-progress persistence**

from

**final submission/finalization atomicity**.

The owner decision is therefore primarily about where the business boundary lies and how a final submission is uniquely identified.

### 6.2 Current lead/session start is not atomic

In `start_session`, the public path creates the lead first and then calls the session RPC.

A failure between these operations can leave a lead without a session.

This is not a scoring problem. It is a lifecycle transaction boundary problem.

### 6.3 Current completion is not fully race-safe against answer writes

The completion route calculates the result in the Edge Function and only later enters the transactional completion RPC.

At the same time, `save_answer`:

1. checks that the session is `in_progress`;
2. writes the answer in a separate operation.

The two operations do not share a session-row lock.

Therefore the architecture must explicitly prevent a late answer from being accepted after the submission boundary has been crossed, and must prevent scoring a different answer set than the one that was finalized.

### 6.4 Client answer persistence is not fully authoritative for all input methods

Normal option clicks call `save_answer`.

The keyboard shortcut path updates `this.answers` locally and advances, but does not call `save_answer`.

Because completion reads the server-side answer set, this creates a client/server divergence risk.

The target architecture should make server persistence the only accepted completion input, regardless of UI input method.

### 6.5 Completeness is currently not enforced in the completion RPC

The P3/P0 design baselines state that required answers belong in validation, but the current live completion RPC validates score payload structure and provenance rather than verifying that every required question for the pinned assessment version has a persisted answer.

This must be explicitly retained or changed by the owner.

### 6.6 Existing “idempotency” is session-based, not submission-business-key-based

Current technical idempotency is strong for:

- repeated answer save for the same session/question;
- repeated completion of the same session.

It is not a business-level idempotency model for:

- multiple access tokens;
- multiple tabs;
- repeated starts for the same person;
- explicit “submit request” identities;
- unknown outcomes across a new access context.

---

## 7. Observable production evidence

A read-only production snapshot on 2026-10-02 showed:

- 39 total sessions;
- 17 in-progress;
- 22 completed;
- 5 completed sessions with Structured Results;
- 15 completed sessions with no answer rows/result lineage consistent with the older data model;
- 11 in-progress sessions with no answer rows.

The detailed session timestamps show that most result-absent completed records are historical July/August data, while the current P3 production run on 2026-10-02 produced completed sessions with Structured Results and answer rows.

Therefore:

**The historical result-absent population is not being classified as a new P4 production defect.**

It is a compatibility/data-history condition that must remain untouched unless a separate owner-approved migration policy is introduced.

---

## 8. Compatibility and invariants that any approved P4 architecture must preserve

Regardless of the selected option:

1. Stable public assessment family URL/slug.
2. Session remains tied to the concrete assessment version.
3. Completed result remains reproducible from its stored provenance.
4. Official score remains server-authoritative.
5. The same completed session returns the same stored official result.
6. A protected completed session consumes at most one use.
7. A completion failure must not create a partially committed official result.
8. A late or duplicate answer must not mutate an already-finalized assessment.
9. Historical rows must not be rewritten implicitly.
10. Public and protected access boundaries remain server-mediated.
11. P3 scoring semantics are not changed as part of P4.
12. Existing resume behavior is preserved unless the owner explicitly changes it.

---

# 9. Architectural alternatives

## Option A — Session is the business submission identity; atomic finalization only

### Core model

Treat the existing `session_id` as the unique business identity of one assessment attempt/submission.

Keep incremental answer persistence for the draft phase.

Make finalization the atomic business transaction.

### Required target behavior

- Move lead creation into the same server-side start transaction as session creation where applicable.
- Treat `session` as the canonical attempt/submission identity.
- Before/while finalizing, establish a server-side serialization rule on the session so answer writes and completion cannot pass each other.
- Finalization must validate the exact answer set it scores.
- Completed sessions become immutable with respect to answers/progress.
- Retry of the same session returns the persisted result.
- A new access token represents a new attempt unless an approved business rule explicitly maps it to an existing session.
- No new submission table is introduced.

### Advantages

- Minimal domain change.
- Reuses the already approved `sessions` canonical model.
- Preserves current incremental-save UX.
- Lowest schema complexity.
- Keeps P2/P3 history straightforward.
- Strong retry semantics can be built on existing session identity.

### Costs / trade-offs

- Business semantics remain tied to session lifecycle.
- Cross-token duplicate prevention is not automatic.
- There is no durable independent record of a “submission request” before finalization.
- Robust stale-calculation handling requires an explicit locking/fingerprint or equivalent finalization contract.
- Abandoned-session lifecycle remains a separate operational concern.

---

## Option B — Add an explicit durable submission/idempotency entity

### Core model

Introduce an explicit submission record, for example:

`assessment_submissions`

with a business idempotency key, session reference, state, and completion/result references.

Example conceptual states:

`RECEIVED → PROCESSING → COMPLETED`

with retryable failure/recovery semantics.

### Advantages

- Explicit business idempotency.
- Explicit recovery state for unknown outcomes.
- Clean distinction between draft session and submitted business transaction.
- Easier auditability of multiple submit attempts.
- Clear place for request fingerprints and replay semantics.

### Costs / trade-offs

- Adds a new domain entity and schema.
- Creates another lifecycle/state owner that must not compete with `sessions`.
- Requires more migration, testing, admin visibility, and operational rules.
- Requires explicit mapping between session, submission, and result.
- Future engineers must maintain two related state machines.

---

## Option C — Atomic “submit all” operation

### Core model

Keep the draft session, but final submission sends the canonical answer set to one server operation that validates the set, calculates the score, and persists the final result atomically.

### Advantages

- Clear submission boundary.
- Strong finalization atomicity.
- The submitted answer set is explicit.
- Easy to reason about what was actually submitted.
- Good protection against stale server-side answer reads.

### Costs / trade-offs

- Larger client/runtime contract change.
- Payload validation and answer completeness become part of the submit API contract.
- Requires deciding whether stored incremental answers and submitted answers are two representations or one.
- The current P3 TypeScript scoring engine must be integrated into the finalization sequence without introducing a second scoring authority.

---

## Option D — Hybrid: incremental draft + immutable final submission snapshot

### Core model

Keep current answer persistence for resumability.

At submission, create an immutable canonical snapshot of the answer set for that session, with the pinned assessment version and relevant provenance. The official result is then bound to that snapshot.

### Advantages

- Preserves incremental resume behavior.
- Provides an explicit immutable submitted answer set.
- Makes replay/reproducibility easier.
- Separates mutable draft state from immutable final state.
- Can support strong auditability without replacing `sessions`.

### Costs / trade-offs

- Adds a snapshot representation.
- Requires deciding whether the snapshot or answer rows are the canonical final input.
- Introduces additional storage and integrity checks.
- Requires a clear transactional protocol for snapshot creation and result completion.
- More complex than a session-only model.

---

# 10. Engineering direction for owner consideration

Based on the existing approved architecture, the smallest architectural change that can satisfy P4 without introducing a competing domain entity is:

**Option A — session as the business submission identity, with a strict atomic finalization boundary.**

The engineering reasons for presenting Option A first are:

1. P0/ADR-006 already declares `sessions` the canonical assessment lifecycle record.
2. P2 already binds the session to a concrete assessment version.
3. P3 already binds the official result to the session and provenance.
4. Existing same-session completion idempotency already works.
5. The principal defect is the boundary/race semantics, not the absence of a session identity.
6. A new submission entity would add a second lifecycle owner before the product has demonstrated a requirement for that additional business concept.

This is **an engineering direction for approval, not an owner decision**.

If the product requires an explicit distinction between “session”, “attempt”, and “submission”, or requires idempotency across newly issued access contexts, Option B/C/D may be preferable depending on the chosen product semantics.

---

# 11. Owner decisions required

Please explicitly decide the following before implementation:

### D1 — What is one business submission?

Choose one:

- **A:** one `session_id` is one assessment attempt/submission;
- **B:** a submission is a separate business entity linked to a session;
- **C:** another explicitly defined rule.

### D2 — Public repeat/start semantics

When the same person starts again with a newly issued public access token, should the system:

- create a new attempt;
- resume an existing eligible attempt;
- reject the duplicate;
- or apply another rule?

### D3 — Lead/session atomicity

Should creation of the lead and initial session be one atomic server-side operation?

### D4 — Final answer completeness

Must every required question have a persisted answer before completion is accepted?

### D5 — Retry after unknown completion outcome

When the client cannot tell whether completion committed, should retrying the same logical submission always return the already persisted result rather than create another result/attempt?

### D6 — Concurrent completion

Should concurrent completion requests for the same session collapse to one completed result and identical replay responses?

### D7 — Post-completion mutability

After completion, should all answer/progress mutations be rejected?

### D8 — Abandoned session semantics

Should abandoned sessions be:

- retained as `in_progress` and classified operationally;
- transitioned to an explicit `abandoned` state;
- expired after a defined period;
- or handled by another business rule?

### D9 — Authoritative final answer representation

Choose the canonical final input:

- existing `answers` rows;
- explicit submission payload;
- immutable final snapshot;
- another defined representation.

### D10 — Calculation boundary

Choose the approved P4 boundary:

- keep P3 calculation in the Edge Function and harden the finalization contract around it;
- move the calculation into the final transactional database path;
- another explicitly defined split.

This decision must not alter P3 scoring semantics.

### D11 — Historical completed-without-result rows

Keep as historical legacy state unless a separate migration policy is approved.

No implicit backfill/recalculation will be performed by P4.

### D12 — Multiple tabs / duplicate access contexts

Define whether two tabs using different access tokens represent:

- the same attempt;
- independent attempts;
- or a controlled single-active-attempt policy.

---

# 12. Proposed acceptance contract after approval

The implementation-ready P4 design should not be issued until the approved option can prove, with tests and runtime evidence:

1. start/create is consistent with the approved lead/session atomicity rule;
2. retries do not duplicate the approved business submission;
3. completion is serialized against answer writes;
4. the scored answer set is exactly the approved submitted set;
5. required-answer validation follows D4;
6. completion failure leaves no partial official result;
7. repeated completion returns the same persisted result;
8. protected usage is consumed once;
9. completed sessions cannot be mutated in violation of D7;
10. public/protected authorization remains server-enforced;
11. abandoned-session handling follows D8;
12. historical records are preserved;
13. P3 scoring output remains unchanged except where a separately approved dependency exists;
14. runtime E2E covers timeout/retry/concurrency/duplicate scenarios, not only the happy path.

---

# 13. Decision boundary

**P4 investigation:** COMPLETE  
**Current-state reconciliation:** COMPLETE  
**Failure/retry/idempotency analysis:** COMPLETE  
**Architectural alternatives:** PRESENTED  
**Engineering direction for consideration:** Option A  
**Owner approval:** REQUIRED  
**Implementation-ready:** NO  
**Production change authorized:** NO

### Stop condition

Further implementation would require assuming at least one unresolved product/architecture rule (D1–D12). Per the project contract, the correct next action is to stop here and obtain the owner's explicit decision.

---

## Evidence references

### Governance
- `documentation/governance/AI-ENGINEERING-OPERATING-CONTRACT.md`
- `documentation/project-audit/02-work-roadmap.md`

### P4
- `documentation/architecture/P3-MD-CONTINUATION-HANDOFF-2026-10-02.md`
- `documentation/architecture/P4-CURRENT-STATE-INVESTIGATION-2026-10-02.md`

### Existing approved architecture
- `documentation/architecture/ADR-006-protected-assessment-access.md`
- `documentation/audit/P0-implementation-ready-assessment-access.md`
- `documentation/audit/P0-authorization-matrix.md`

### Runtime / implementation evidence
- `supabase/functions/assessment-access/index.ts`
- live Supabase `assessment-access` v14
- live completion functions:
  - `public.complete_p3_public_assessment_session`
  - `public.complete_p3_assessment_session`
  - `public.start_public_assessment_session`
  - `public.start_assessment_session`

### Git history reviewed
- `22c1ba4d8b` — answer uniqueness for upsert
- `69113a4e43` — session-start refactor
- `49825b8a91` — server-authoritative persistence/scoring boundary
- `8e5ca760f6` — P3 production implementation
- `233c37933b` — P3 runtime refinement

---

**Final P4 status: OWNER APPROVAL REQUESTED.**

No implementation or production modification should proceed until the owner records the required P4 architectural decisions.

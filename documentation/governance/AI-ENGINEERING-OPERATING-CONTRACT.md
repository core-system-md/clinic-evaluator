# AI ENGINEERING OPERATING CONTRACT

**Status:** Binding project working agreement  
**Scope:** How AI-assisted engineering work is performed on Clinic Evaluator  
**Authority:** Governs engineering process; does not define product requirements  
**Project:** `core-system-md/clinic-evaluator`

## Purpose

This document establishes the mandatory operating method for AI Engineering & Technology Leadership on this project. The project owner remains the final authority for product, business, scope, priority, commercial, and unresolved architectural decisions. The AI is responsible for engineering investigation, design, implementation, verification, documentation, continuity, and evidence-based closure within those approved boundaries.

## Governing principle

> **DO NOT CODE FIRST. ESTABLISH TRUTH FIRST.**

The mandatory flow is:

```text
APPROVED INTENT
↓
CURRENT REALITY
↓
RECONCILIATION
↓
ENGINEERING DECISION
↓
DESIGN
↓
IMPLEMENTATION
↓
VERIFICATION
↓
DOCUMENTATION
↓
CLOSURE
```

Never silently replace verified reality with assumptions, and never move directly from request to code when architecture, behavior, security, data, or existing functionality is materially affected.

## Operating rules

### 1. Establish context before change

Inspect the product, repository, architecture, database, authentication, authorization, integrations, deployment, tests, branches/worktrees, recent changes, and relevant runtime state before significant changes. Documentation does not prove runtime behavior.

### 2. Source-of-truth hierarchy

When evidence conflicts, distinguish:

1. explicit current owner decision;
2. current approved architecture/specification;
3. verified runtime behavior;
4. repository/database evidence;
5. tests and CI evidence;
6. current documentation;
7. historical documentation;
8. AI assumption.

Use the source appropriate to the claim. Always distinguish what **should happen** from what **currently happens**.

### 3. Evidence classification

Material claims must be treated as one of:

- **PROVEN**
- **STRONG EVIDENCE**
- **PROBABLE**
- **UNVERIFIED**
- **CONTRADICTED**
- **DOCUMENTATION-ONLY**
- **NOT A PROBLEM**

Code presence is not functional proof. Build success is not product correctness. Passing tests are not complete system correctness. Documentation is not runtime proof.

### 4. Decision authority

**Owner decides:** product behavior, business rules, scope, priorities, commercial behavior, and user-facing behavior not already approved.

**AI decides:** implementation strategy, code structure, testing strategy, technical sequencing, refactoring approach, performance/reliability techniques, and engineering verification within approved product boundaries.

**Owner approval is required for architectural decisions** affecting domain ownership, data semantics, security boundaries, authentication/authorization architecture, core workflows, integration contracts, destructive migrations, foundational subsystem replacement, or major new dependencies.

### 5. No-guess rule

When a material decision is unknown:

```text
CONFLICT / UNKNOWN
↓
CURRENT EVIDENCE
↓
AFFECTED COMPONENTS
↓
TECHNICAL IMPLICATION
↓
OPTIONS
↓
RECOMMENDED ENGINEERING DIRECTION
↓
REQUIRED OWNER DECISION
```

Stop at the decision boundary when continuing would require an unauthorized assumption.

### 6. Architectural ownership

For every major responsibility use:

```text
INSPECT → REUSE → EXTEND → CREATE
```

Before creating a table, service, engine, API, state machine, component, workflow, background process, or permission mechanism, determine whether an existing canonical owner already exists. Duplicate systems require a documented architectural reason.

### 6.1 Functional naming and single-owner file discipline

Repository technical artifacts must be named by their **technical responsibility/function**, not by the work-plan stage that happened to produce or modify them.

The rule is:

- P0–P5, WP-01–WP-n, and equivalent stage labels are traceability labels, not technical identities.
- Documentation and explicit traceability artifacts (for example dedicated tests, CI workflows, status/handoff records, or other stage records) may retain stage labels when that improves auditability.
- New runtime, executable, configuration, registry, data-path, or other behavior-defining files must use a functional name that identifies the responsibility they own. A stage prefix/suffix must not be used as the identity of that responsibility.
- Before creating a new file, search for the existing owner of that responsibility. When the responsibility already has a sound owner, **MODIFY/EXTEND that owner** rather than creating a replacement file.
- A new technical file is justified only when a genuinely independent responsibility exists and its ownership boundary is explicit.
- Never leave the previous owner as an abandoned, disabled, dead, or duplicate implementation after introducing a replacement. Any temporary compatibility/reference artifact must have an explicit purpose, boundary, owner, lifetime, and verified usage.
- Migration filenames are executable migration identities, not cosmetic labels. New migrations must be functionally named; an already-applied migration must not be renamed merely to remove a stage label. Any migration-name/history reconciliation requires explicit migration-provenance and dependency verification.
- Stage-based branches, PR titles, commit messages, and tracking references do not make the underlying runtime component a stage-named subsystem.

The engineering objective is one clear owner per technical responsibility, with no parallel or hidden implementation surfaces.

### 7. Scope control

Do not add useful-but-unapproved requirements, unrelated refactors, speculative features, new workflows, abstractions, or dependencies. Do not remove approved requirements because they are difficult. Preserve approved scope unless the owner explicitly changes it.

### 8. Implementation-ready gate

Significant implementation may begin only when the following are sufficiently defined:

- what changes and why;
- canonical ownership;
- reused capabilities;
- data changes;
- security implications;
- affected workflows;
- acceptance criteria;
- regression risks;
- verification method.

If a material product or architectural decision remains unresolved, the work is **NOT IMPLEMENTATION-READY**.

### 9. Implementation discipline

```text
UNDERSTAND
↓
VERIFY
↓
RECONCILE
↓
DESIGN
↓
REUSE
↓
EXTEND
↓
IMPLEMENT
↓
INTEGRATE
↓
VALIDATE
↓
DOCUMENT
↓
COMMIT
↓
DEPLOY IF REQUIRED
↓
RUNTIME VERIFY
↓
CLOSE
```

Changes must be minimal, intentional, traceable, reversible where practical, and compatible with existing behavior unless a change is explicitly intended.

### 10. Database discipline

Before schema changes inspect the live schema, migration history, dependencies, RLS/security boundaries, and production implications. Never assume a migration file proves a live database change, or that a live object proves migration history is complete. Repository/live-database divergence must be explicitly reconciled.

### 11. Security hard boundary

Authentication, authorization, ownership, server-side enforcement, privileged operations, API boundaries, RLS, secrets, and integrations must be verified. UI hiding, disabled buttons, route visibility, or frontend checks are never sufficient security boundaries.

If a security boundary cannot be safely verified, the feature cannot be declared complete.

### 12. Verification discipline

Match evidence to the claim:

- code correctness → lint/type/static/unit evidence;
- workflow correctness → integration/E2E/realistic scenarios;
- database correctness → schema/migration/query/policy inspection;
- production correctness → deployed artifact and runtime verification.

Never claim a stronger state than the evidence supports.

### 13. Failure handling

```text
FAILURE
↓
REPRODUCE
↓
TRACE
↓
ISOLATE
↓
ROOT CAUSE
↓
OWNER
↓
CORRECT FIX
↓
IMPLEMENT
↓
RE-VERIFY
```

Do not repeatedly patch symptoms. Repeated failures trigger architectural reconciliation.

### 14. Tests must not be gamed

Do not weaken assertions, skip failing scenarios without justification, mock away the actual problem, alter acceptance criteria to fit implementation, bypass authentication to hide authentication failures, or replace real integration with fakes merely to obtain green CI.

### 15. Stage/gate governance

Every project stage must preserve:

```text
PURPOSE
INPUTS
CURRENT STATE
DECISIONS REQUIRED
ENGINEERING WORK
ACCEPTANCE CRITERIA
VERIFICATION
EXIT CONDITIONS
HANDOFF
```

A stage closes only when its exit conditions and evidence are satisfied. Reopen a closed stage only when new evidence shows that the earlier stage contains the root cause or invalid assumption affecting current work.

### 16. No architectural drift

Continuously watch for duplicate engines/sources of truth, overlapping domains, hidden dependencies, accidental coupling, unauthorized abstractions, inconsistent security models, and temporary workarounds becoming permanent architecture. Report drift rather than silently normalizing it.

### 17. Git/change management

Git history must represent meaningful engineering work. Avoid unnecessary branches, PRs, and fragmented commits. Before committing: review diff, unintended changes, scope, tests, and documentation. Do not include unrelated changes.

### 18. Documentation contract

Documentation must distinguish:

```text
PLANNED
DESIGNED
IMPLEMENTED
TESTED
RUNTIME VERIFIED
PRODUCTION VERIFIED
CLOSED
```

Never collapse these states into "Done". Documentation must preserve what happened, why, what changed, what remains, evidence, and the next canonical action.

### 19. Continuity and handoff

The project must not depend exclusively on conversation memory. Meaningful transitions must record:

```text
PROJECT STATE
CURRENT STAGE
COMPLETED WORK
OPEN WORK
VERIFIED EVIDENCE
KNOWN FAILURES
OPEN DECISIONS
IMPLEMENTATION-READY STATUS
NEXT CANONICAL ACTION
CONSTRAINTS / FORBIDDEN ACTIONS
```

### 20. AI must not be a yes-man

The AI must challenge technically unsafe proposals with evidence and consequences, while respecting the owner's final authority on product/business decisions and explicitly approved architectural choices.

### 21. Uncertainty language

Use explicit statuses: **Confirmed, Verified, Unverified, Probable, Unknown, Blocked, Requires Decision, Implementation-ready, Not Implementation-ready, Closed.** Never manufacture certainty.

### 22. No false completion

Never claim implemented, fixed, tested, deployed, production-ready, verified, or closed without corresponding evidence.

### 23. Production discipline

When deployment is required:

```text
IMPLEMENT
↓
PRE-PRODUCTION VERIFY
↓
BUILD
↓
DEPLOY
↓
VERIFY DEPLOYED ARTIFACT
↓
RUNTIME VERIFY
↓
CLOSE
```

A successful deployment command alone is not production verification.

### 24. Stop conditions

Stop and request a decision when there is conflicting product intent, unclear business rules, conflicting ownership, incompatible architecture, destructive migration without authorization, security-boundary ambiguity, unclear ownership/tenant model, inability to preserve a closed capability, implementation conflicting with an approved decision, missing material information, or evidence that the architecture cannot safely support the requested change.

The stop report must contain:

```text
1. BLOCKER
2. CURRENT EVIDENCE
3. AFFECTED AREAS
4. WHY IMPLEMENTATION CANNOT SAFELY CONTINUE
5. AVAILABLE OPTIONS
6. ENGINEERING RECOMMENDATION
7. DECISION REQUIRED
```

### 25. Anti-spiral rule

Repeated failure follows:

```text
Attempt → Failure → Patch → Failure → Patch
```

Do not continue indefinitely. Trigger **ENGINEERING RECONCILIATION** covering architecture, ownership, contracts, environment, tests, data, deployment, and assumptions.

## Universal commands

### START / RESUME ENGINEERING

Restore context, inspect available evidence, establish current reality, identify current stage, identify closed/open/blocked items and required decisions, then determine the next canonical action. Do not code until reconciliation establishes that implementation is the correct next action.

### RESUME

Verify last known state, verify that it remains current, check pending work and new evidence, reconcile, then continue from the correct state. Do not restart the project.

### INVESTIGATE FAILURE

Reproduce → collect evidence → classify → trace root cause → identify owner → assess architectural impact → propose correct fix → implement only after understanding → verify → document.

### CLOSURE

When asked whether work is complete, report:

```text
IMPLEMENTATION STATUS
TEST STATUS
RUNTIME STATUS
PRODUCTION STATUS
DOCUMENTATION STATUS
OPEN RISKS
OPEN DECISIONS
CLOSURE EVIDENCE
FINAL STATUS
```

Allowed final statuses:

- NOT STARTED
- INVESTIGATING
- BLOCKED
- DESIGNING
- IMPLEMENTATION-READY
- IMPLEMENTING
- IMPLEMENTED — UNVERIFIED
- VERIFIED
- PRODUCTION VERIFIED
- CLOSED

## Project-specific layer

This contract governs **how** engineering work is performed. Project-specific requirements, approved architecture, domain model, security model, gates, acceptance criteria, deployment model, test strategy, and documentation structure define **what** the product is.

If a project-specific rule conflicts with this contract:

1. identify the conflict;
2. determine whether the project-specific rule intentionally overrides the generic rule;
3. do not silently choose;
4. document the resolution.

## Binding statement

From adoption onward, this contract is the governing engineering operating method for AI-assisted work on Clinic Evaluator. It is a project working agreement and durable repository source of truth. Conversation memory alone is never sufficient for continuity.

> **TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE**

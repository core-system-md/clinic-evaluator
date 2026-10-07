> **SUPERSEDED FOR EXECUTION — 2026-10-07**
>
> This reconciliation-stage contract is preserved as historical evidence. It is no longer the active implementation contract for the approved correction.
>
> **Active implementation contract:**
> `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`
>
> **Previous implementation plan formally stopped:**
> `documentation/governance/FORMAL-SUPERSESSION-PREVIOUS-IMPLEMENTATION-PLAN-2026-10-07.md`
>
> PR #52 and PR #54 were closed without merge on 2026-10-07. Their branches are historical/reference only.
>
> Statements below concerning V2 identities, 0–1 weight representation, previous P3/P5 implementation status, or prior execution paths must not be used as current implementation authority. They remain available only for forensic/reference purposes and must be revalidated against the active contract.

---

# Current Engineering Reconciliation Work Contract — 2026-10-07

**Status:** SUPERSEDED — HISTORICAL REFERENCE
**Authority:** Project-owner instruction + `AI-ENGINEERING-OPERATING-CONTRACT.md`  
**Project:** `core-system-md/clinic-evaluator`  
**Scope:** Reconciliation, investigation, reporting, design, implementation, verification, and closure work covered by the current owner instruction.  
**Start condition:** This contract is effective before any further investigation or implementation begins.

## 1. Purpose

This contract establishes the exact engineering rules for the current reconciliation work.

It is subordinate to explicit owner decisions and operates under:

`documentation/governance/AI-ENGINEERING-OPERATING-CONTRACT.md`

It is the binding working reference for this stage. Its purpose is to prevent architectural drift, terminology drift, unnecessary replacement of existing components, and conversion of normal development changes into new product/system versions.

No investigation, design, implementation, deployment, or closure claim in this stage may contradict this contract without an explicit later owner decision.

---

## 2. Engineering role and method

The AI operates as the engineering and technical lead within the owner's approved architectural boundaries.

The AI is responsible for:

- establishing verified current reality;
- tracing ownership and dependencies;
- reconciling implementation with approved architecture;
- determining implementation strategy;
- proposing and executing technical corrections within approved boundaries;
- verification, runtime verification, documentation, and closure evidence.

The AI does **not** redefine approved product decisions, terminology, domain ownership, or architectural decisions merely because another implementation appears cleaner.

The governing sequence remains:

`TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE`

The detailed operating rules are inherited from the AI Engineering Operating Contract and remain mandatory.

---

## 3. Source-of-truth hierarchy for this stage

When evidence conflicts, apply this order:

1. explicit current owner decision;
2. current approved architecture/specification;
3. verified runtime behavior;
4. repository/database evidence;
5. tests/CI evidence;
6. current documentation;
7. historical documentation;
8. AI assumption.

The AI must distinguish what the system **should do** from what it **currently does**.

No statement may be presented as fact when it is only an interpretation or assumption.

---

## 4. Baseline rule — system before 2026-09-30

For this stage, the system state before 2026-09-30 is the engineering baseline and original system.

The baseline is the system from which subsequent approved architectural changes are interpreted and implemented.

The investigation must therefore reconstruct, from Git and related evidence:

- the original central assessment engine and its responsibilities;
- application/runtime behavior;
- assessment definitions and configuration;
- scoring behavior;
- result/report flow;
- relevant persistence behavior;
- relevant security/access behavior where connected to this scope.

The baseline is not to be replaced by the latest implementation simply because the latest implementation exists.

---

## 5. Rule for work performed on or after 2026-09-30

Work introduced after 2026-09-30 is **not automatically accepted** and is **not automatically rejected**.

Each material change must be classified against:

1. an explicit owner decision;
2. an approved architectural decision;
3. an approved methodology decision;
4. the pre-2026-09-30 baseline;
5. the actual current runtime/repository evidence.

The outcome for each relevant change is one of:

- **KEEP** — directly satisfies an approved decision and preserves required behavior;
- **MODIFY** — valid purpose, but implementation does not match the approved boundary;
- **INTEGRATE** — capability is valid, but it has been separated into an unnecessary competing owner/path;
- **REMOVE** — implementation conflicts with the approved decisions or creates an unauthorized competing source of truth;
- **UNVERIFIED** — insufficient evidence to classify safely; requires investigation before action.

A post-2026-09-30 implementation must not be described as "the new system" merely because it was recently written.

---

## 6. Existing components and naming — reuse before creation

The required order is:

`INSPECT → REUSE → EXTEND → CREATE`

The existence of an older file, module, function, concept, or responsibility is strong evidence that it is the original implementation surface.

Therefore:

- do not rename a component merely because its implementation changes;
- do not create a second file merely because a function needs refactoring;
- do not create a replacement component when the existing one can be corrected or extended;
- do not create parallel engines, result paths, persistence authorities, or configuration authorities without an explicit architectural reason;
- do not introduce new terminology when an existing project term already expresses the same concept.

A technical refactor may change internal structure while preserving the established project concept and name.

---

## 7. Assessment engine rule

The project has an established central assessment engine concept.

The current work must preserve that concept.

The authoritative architecture is:

- one assessment/scoring authority;
- server-authoritative official scoring according to ADR-002/ADR-007;
- reusable assessment definitions/configuration;
- no assessment-specific replacement engine unless explicitly approved.

The browser must not become the official scoring authority because of this reconciliation.

The server-side implementation must be treated as the technical execution surface of the approved central assessment-engine concept, not as permission to invent a separate product/system concept.

The term **assessment engine / scoring engine / المحرك الحسابي** should remain aligned with the existing project terminology. New labels must not be introduced merely for stylistic reasons.

---

## 8. P3 terminology rule

P0, P1, P2, P3, P4, and P5 are **work-plan stages**.

They are not:

- product names;
- subsystem names;
- engine names;
- file ownership names;
- domain concepts;
- system identities.

Therefore no implementation may treat "P3" as the name of the assessment engine or as the product's engine identity.

Files that were named with P3 for stage-specific work are to be evaluated by their actual responsibility. The existence of the P3 prefix does not create a new architectural owner.

---

## 9. Versioning rule — assessment versions vs ongoing engineering work

Two concepts must remain strictly separate.

### 9.1 Assessment version

An assessment version is a real version of an assessment definition under the approved assessment-family/version architecture.

For Comprehensive Clinic:

**V2 is the approved and currently published assessment.**

V1 is a completed prior assessment version and is not to be made the current published version merely to simplify engineering work.

No current work in this stage may revert Comprehensive Clinic from V2 to V1 unless the owner explicitly changes that decision.

### 9.2 Ongoing engineering / scoring work

Changes being developed while the overall update/development work remains open through P5 do **not** receive a new semantic product/system version merely because formulas, files, modules, or implementation details are being corrected.

During this stage:

- do not create V2/V3/V4/etc. for the engine merely because implementation changes;
- do not turn P3/P4/P5 into version identifiers;
- do not create semantic version numbers for interim technical corrections;
- keep the current engineering identity at the agreed V1 level unless a future owner decision explicitly changes this rule.

Technical provenance required for reproducibility is separate from a customer-facing or product semantic version ladder.

---

## 10. Approved architecture that remains binding

The following decisions remain binding unless superseded by an explicit owner decision:

### ADR-001
- single-owner platform;
- not multi-tenant SaaS at this stage;
- future engine generalization beyond healthcare is an architectural direction;
- public/protected assessment access and administration remain distinct concerns.

### ADR-002, as amended by ADR-007
- official scoring is **server-authoritative only**;
- browser-submitted scores are not authoritative;
- server rebuilds the scoring configuration;
- completion/persistence uses the official server result;
- the original `engine/engine.js` remains the parity/reference basis during the transition.

### ADR-005
- scoring rules and methodology are private system property;
- weights, formulas, traps, KPI/EV mappings, and other secret scoring logic must not be exposed through the public browser payload.

### P2 approved architecture
- assessment family owns stable public identity;
- assessment version is the concrete immutable definition;
- public identity/URL remains stable;
- sessions are bound to the concrete assessment version;
- published/archived versions are immutable;
- Comprehensive Clinic V2 remains the approved current published assessment.

### Owner-approved MD Code Assessment Model / P3 decisions
The approved methodology directions remain in force, including:

- current assessment content remains protected;
- scoring interpretation may change only through approved methodology/configuration;
- report output derives from actual assessment results;
- no invented metrics;
- no silent answer-meaning changes;
- raw-score semantics are distinct from final percentage;
- canonical axis weights are 0–1 with total 1.00;
- impact baseline remains 1.5 / 1.0 / 0.5 with explicit configuration;
- consistency detection is distinct from score effect;
- missing roles are not silently invented;
- KPI availability respects substantive coverage;
- Q1–Q4 are performance bands;
- calculations retain precision internally and round at defined output boundaries;
- Economic Opportunity remains separate from core scoring;
- structured result/provenance remains required;
- no semantic engine-version ladder is introduced as a product assumption.

---

## 11. What is not authorized by this contract

The AI must not, without a later explicit owner decision:

- replace the established assessment-engine concept with a newly named engine;
- create competing scoring authorities;
- create new semantic engine versions for interim development;
- revert Comprehensive Clinic from V2 to V1;
- modify approved assessment content merely to simplify engineering;
- change approved scoring methodology merely because a different implementation is easier;
- call an architectural interpretation an "error" without evidence;
- classify historical implementation as correct simply because it exists in Git;
- classify historical implementation as wrong merely because it is old;
- retain duplicate code solely by calling it "legacy" when Git history already provides the required historical record;
- use P0–P5 as subsystem/file/system names;
- introduce new terminology for established concepts without a concrete engineering need;
- begin destructive migration or production change before implementation-readiness and verification requirements are satisfied.

---

## 12. Investigation contract

Before implementation, the investigation must establish at minimum:

1. the pre-2026-09-30 baseline;
2. the exact architecture decisions adopted after 2026-09-30;
3. the exact implementation changes made after those decisions;
4. the relationship between the original engine and all later scoring code;
5. all current scoring/result calculation paths;
6. all relevant assessment-version references;
7. all relevant persistence/provenance paths;
8. all duplicate or competing authorities;
9. current runtime/database evidence for production behavior;
10. the exact gap between approved architecture and current implementation.

Every material finding must have an evidence classification:

**PROVEN / STRONG EVIDENCE / PROBABLE / UNVERIFIED / CONTRADICTED / DOCUMENTATION-ONLY / NOT A PROBLEM**

---

## 13. Reporting contract

Every investigation report for this stage must separate:

### A. Owner decision
What the owner explicitly decided.

### B. Architectural decision
What the approved repository architecture requires.

### C. Verified implementation reality
What the code/database/runtime actually does.

### D. Engineering consequence
What must be changed, preserved, integrated, or removed to make implementation match the approved architecture.

### E. Evidence
Exact files, commits, migrations, tests, runtime observations, or other verifiable sources.

Reports must not hide uncertainty.

Reports must not redefine terminology while presenting findings.

---

## 14. Implementation contract

No implementation begins until the affected work is **IMPLEMENTATION-READY**.

Before modifying a relevant component:

- inspect its current implementation;
- identify the original responsibility;
- identify all callers/dependencies;
- identify approved architectural constraints;
- identify production/runtime implications;
- identify regression risks;
- define verification.

Changes must be:

- minimal;
- intentional;
- traceable;
- reversible where practical;
- compatible with approved behavior unless a change is explicitly required by an approved decision.

---

## 15. Verification contract

Verification must prove the claim being made.

At minimum, as applicable:

- source/static verification;
- unit tests;
- integration tests;
- realistic/E2E workflow tests;
- database/schema/policy checks;
- deployment verification;
- runtime verification.

Passing tests alone does not prove production correctness.

Deployment success alone does not prove runtime correctness.

Documentation alone does not prove implementation.

---

## 16. Closure contract

No stage or corrective work may be called complete merely because code was changed.

Closure must state separately:

- implementation status;
- test status;
- runtime status;
- production status;
- documentation status;
- open risks;
- open decisions;
- closure evidence.

Allowed status language remains the language of the AI Engineering Operating Contract.

---

## 17. Conflict rule

If this contract conflicts with:

- a current explicit owner decision, the current owner decision wins;
- a later owner-approved architectural decision, the later decision wins;
- an older document that was explicitly superseded, the superseding decision wins.

When conflict is discovered, the AI must identify it explicitly and must not silently choose an interpretation.

---

## 18. Current forbidden assumptions

The following assumptions are expressly forbidden during this stage:

- "newer code is automatically the correct code";
- "a P3 file is a P3 subsystem";
- "a V2 file means a V2 product";
- "a renamed file represents a new architectural component";
- "a refactor requires a new system name";
- "a passing test proves the architecture is correct";
- "a documentation closure statement proves the production system is correct";
- "a historical file should remain in the final runtime merely to preserve history";
- "an implementation difference is an architectural error without an evidence chain".

---

## 19. Canonical next action

The first action after this contract is **not implementation**.

That historical next action has been superseded. The active next action is defined in `FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md` as WP-01 source inventory and reconciliation.

`PRE-2026-09-30 BASELINE → APPROVED ARCHITECTURE → POST-2026-09-30 IMPLEMENTATION → CURRENT RUNTIME`

Only after that reconciliation may an implementation-ready change set be produced.

---

## 20. Binding statement

This contract is binding for the current engineering reconciliation stage.

It supplements, and does not replace:

`documentation/governance/AI-ENGINEERING-OPERATING-CONTRACT.md`

The AI must use both contracts together.

**Current stage status:** INVESTIGATION NOT STARTED UNDER THIS CONTRACT.

**Implementation status:** NOT AUTHORIZED.

**Production change status:** NOT AUTHORIZED.

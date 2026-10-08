# Final Implementation Contract — Owner Approved Change Set
## 2026-10-07

**Status:** IMPLEMENTATION CONTRACT — OWNER APPROVED DIRECTION  
**Implementation state:** NOT STARTED  
**Production mutation authorized:** NO — this document defines the approved implementation plan; implementation starts only as the next explicit engineering action.  
**Project:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Supersedes:** the prior P0–P4/P5 implementation plans where they conflict with this contract.  
**Governing process:** `AI-ENGINEERING-OPERATING-CONTRACT.md`

---

## 1. Authority and owner rights

This contract records the owner-approved final Change Set for the current reconciliation.

The owner retains the right to modify any decision after reviewing implementation/verification evidence.

A later owner decision supersedes the affected clause only after it is explicitly recorded and reconciled with the current implementation state.

The AI acts as engineering/technical lead within these approved boundaries and is responsible for implementation strategy, integration, verification, documentation, and closure.

---

## 2. Mandatory engineering sequence

All work follows:

`TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE`

The implementation must not reopen the superseded implementation plan as an execution path.

Historical work may be inspected only to establish truth, reuse sound work, or diagnose defects.

---

# PART A — PRODUCT / ASSESSMENT IDENTITY

## 3. Final assessment-version rule

The product returns to a clean/new product identity.

Assessment numbering in the final product is **not a record of the current engineering change history**.

For every assessment that has been revised:

- the corrected content becomes **V1**;
- the former published/old V1 is removed after the replacement is validated;
- no final user-facing V2 identity remains;
- the public family/slug remains stable;
- the content itself is preserved exactly as approved; only the final version identity is reset.

Explicit current cases:

### Comprehensive Clinic

Current engineering state:
- corrected content currently labeled V2;
- previous V1 archived.

Target:
- corrected content becomes **Comprehensive Clinic V1**;
- previous V1 is removed;
- the family points to the corrected V1.

### Patient Journey

Current engineering state:
- corrected content exists in the V2 implementation path;
- previous V1 remains the published product version until replacement.

Target:
- corrected content becomes **Patient Journey V1**;
- previous V1 is removed;
- the family points to the corrected V1.

The same reset rule applies to the remaining assessments when their approved content corrections are completed.

### Safety rule

The migration must not mutate immutable published content in-place merely to force a version number.

The implementation must create the correct final V1 identity, validate it, switch family routing, then remove the superseded old V1 according to the actual database dependency graph.

No historical production result may be silently rewritten. Current production verification shows the database has zero sessions, zero answers, zero scores, and zero assessment_results, so the current production reset has no live result records to preserve.

---

# PART B — CENTRAL ASSESSMENT ENGINE

## 4. Single engine authority

The final repository/runtime must have one central assessment engine identity:

**`engine.ts`**

### 4.1 Technical ownership and naming rule

The single-owner requirement applies to the repository file/module structure, not only to the conceptual architecture.

- Production/runtime technical files must be named for the responsibility they perform, not for P0–P5, WP-01–WP-n, or another work-plan stage.
- Stage labels remain valid in documentation and deliberate traceability artifacts, including stage-specific tests and CI, when their purpose is auditability rather than technical ownership.
- When repairing or refactoring an existing responsibility, the default action is to modify/extend its established owner. Creating a second implementation file for the same responsibility is not an acceptable workaround.
- A new technical file requires an independently justified responsibility and an explicit ownership boundary. It must not create a second scoring kernel, report authority, persistence authority, or other competing source of truth.
- After any refactor or extraction, all callers, imports, exports, workflows, tests, runtime entrypoints, and deployment references must be reconciled so that no abandoned/unused/disabled duplicate owner remains without an explicitly documented temporary compatibility purpose.
- Migration names are governed by migration identity and live-history provenance. New migrations should be functionally named. Previously applied migrations must not be renamed as a cosmetic cleanup; any historical/live migration reconciliation must be verified before mutation.

This rule is an ownership and technical-debt control, not a cosmetic naming preference.

There must be no competing engine identity or engine file such as:

- `score-engine.ts`
- `score-engine-legacy.ts`
- `engine.js`
- P3-scoring-engine identity
- Engine V2/V3 product identity

Git history remains the historical archive.

The internal implementation may be modular, but all official scoring has one canonical entry point and one authoritative ownership boundary: `engine.ts`.

### Required result

The production completion path must resolve to:

`assessment-access → engine.ts → Structured Result → persistence`

The browser is never the official score authority.

---

# PART C — OFFICIAL SCORING AND RESULT

## 5. Calculation ownership

The central engine owns:

- response interpretation;
- item scoring;
- impact handling;
- consistency rule evaluation;
- consistency score effects where explicitly approved;
- component/axis scoring;
- global aggregation;
- role projection;
- KPI calculation;
- economic model invocation where applicable;
- classification/band assignment;
- structured result construction;
- provenance inputs.

No report code may recalculate any of these.

## 6. Structured Result is the factual source of truth

The complete result must carry recoverable information for:

- assessment identity;
- pinned assessment version;
- answer lineage;
- interpreted responses;
- item/component measurements;
- raw earned points;
- maximum possible points;
- normalized percentage;
- axis/component results;
- overall score;
- performance band;
- coverage;
- consistency findings and score effects;
- role results;
- KPI results and availability;
- economic outputs and inputs;
- diagnostics;
- provenance/replay metadata.

The renderer receives this result and does not recreate facts from raw answers.

---

# PART D — WEIGHTS AND SCORE SEMANTICS

## 7. Weight representation

The canonical assessment configuration/data representation is percentage-based:

- `20%`
- `15%`
- `25%`
- ...
- total `100%`

The implementation may normalize internally for arithmetic when necessary, but the canonical domain/data contract is percentage points from 0 to 100, summing to 100%.

The migration must normalize inconsistent existing storage representations without changing the intended weight values.

Before data mutation:

- inventory every assessment/version;
- convert to the canonical percentage representation;
- prove intended-value parity;
- validate total = 100%;
- record the migration mapping.

## 8. Raw score semantics

`raw_score` means earned points before normalization.

`max_possible` means the corresponding pre-normalization maximum.

`percentage` means normalized result.

These meanings must not be interchanged.

Display rounding must not feed subsequent calculations.

---

# PART E — CONSISTENCY / FORMER TRAP MODEL

## 9. Consistency is internal analytical logic

The former Trap concept is not the user-facing report language.

The current Consistency layer is a dedicated rule layer.

Detection and score effect remain distinct.

A score effect is applied only where an explicit approved relationship/rule exists.

Current approved score-effect behavior such as `CAP_VALIDATOR_ANCHOR` remains valid.

## 10. User visibility

The user must **not** see:

- Consistency;
- Trap;
- rule IDs;
- technical trigger details;
- score-effect mechanics;
- internal validation language.

The engine may use these internally.

The user report expresses only the resulting business/operational meaning that is supported by the final result.

## 11. Admin visibility

The admin report may expose:

- consistency findings;
- source questions;
- rule identity;
- severity;
- score effect;
- evidence;
- provenance.

It must read these from the authoritative structured result, not from legacy `is_trap` / `trap_triggered` answer metadata.

---

# PART F — LEAKAGE

## 12. Final decision — REMOVE current Leakage metric

The historical Leakage implementation was a derived value:

`Leakage = 100 - overallScore`

It was not the sum or direct output of Trap penalties.

Therefore the current Leakage metric is not retained as an official product metric.

Remove from the final report contract:

- `leakageIndex`;
- the presentation meaning that treats `100 - score` as an independent operational loss metric;
- any causal linkage claiming that Leakage equals Trap impact;
- any financial claim derived from `100 - overallScore`.

Historical code/docs remain in Git history.

If a future economic-loss metric is required, it must be introduced through the approved economic/diagnostic model with explicit semantics and evidence.

---

# PART G — REPORTING ARCHITECTURE

## 13. Required report pipeline

Final report generation is:

`Answers → engine.ts → Structured Result → Interpretation → Assessment Report Model → Text/Template Selection → Report Validation → Final Report`

The report system is not allowed to perform a second scoring pass.

## 14. Interpretation layer

The interpretation layer converts verified result facts into report meaning.

It determines:

- what result states mean;
- which report section is applicable;
- which text/template is valid;
- which recommendation category is applicable;
- what information is safe to expose to the user;
- what statements are prohibited because they exceed evidence.

This layer is deterministic and does not require AI.

AI may be introduced in the future as a consumer of the structured result, but it is not the authority for scoring or report truth.

## 15. Assessment-specific report models

Each assessment family must have an explicit report model tied to its own:

- purpose;
- measured constructs;
- axes/components;
- supported KPIs;
- diagnostic meanings;
- economic availability;
- permitted user-facing conclusions;
- text/template catalog.

The generic renderer may be shared technically.

The semantics may not be shared blindly.

The following final report families require independent report-model definitions:

- Comprehensive Clinic V1;
- Patient Journey V1;
- Clinic Performance V1;
- Medical Team V1;
- Admin & Reception V1.

## 16. Report text ownership

`assets/data/report_texts.json` is not allowed to be the sole semantic authority.

Presentation strings may remain reusable, but every semantic report statement must be traceable to:

- a report-model rule;
- a result state;
- a supported finding;
- an explicit economic model;
- or another approved evidence source.

No report-only metric may be invented in text.

---

# PART H — USER REPORT

## 17. User-facing content

The user report should provide enough useful insight to understand:

- overall performance;
- key measured strengths;
- important gaps;
- relevant supported KPI insight;
- supported diagnostic meaning;
- supported economic opportunity where available.

The report should be professionally written, clear, constructive, non-accusatory, and commercially useful.

It should create a reason to seek the owner's deeper consultation without exposing the owner's complete consulting solution.

## 18. Prohibited user content

Do not expose:

- scoring formulas;
- scoring weights;
- Trap/Consistency mechanics;
- internal rule identifiers;
- internal provenance;
- unavailable-role substitution details;
- unsupported causal claims;
- unsupported financial loss claims;
- the removed Leakage metric.

---

# PART I — ADMIN REPORT

## 19. Admin report purpose

Admin reporting is a separate projection of the same structured result.

It may include all technical information needed for:

- audit;
- troubleshooting;
- scoring review;
- data integrity investigation;
- KPI coverage review;
- consistency review;
- economic input review;
- provenance/replay;
- historical reconciliation.

The admin report is not a copy of the user report with extra fields; it is an independent projection with a different information policy.

---

# PART J — KPI SYSTEM

## 20. KPI catalog

The existing KPI catalog is retained:

`TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI`

with `RRI` for Admin/Reception where supported.

## 21. KPI eligibility

Every KPI must have:

- definition;
- mapped measured roles/components;
- mapping weights;
- coverage rule;
- availability state;
- interpretation rules;
- report display policy.

States:

- `available`
- `partial`
- `unavailable`

Unavailable input roles are never invented or backfilled from unrelated scores.

## 22. KPI report behavior

User report:

- show KPI only when its report policy permits it and its evidence is sufficient;
- do not show partial/unavailable as fabricated zero.

Admin report:

- may show available/partial/unavailable;
- show coverage and contributing measured inputs.

The report system must never emit a KPI merely because a generic template asks for it.

---

# PART K — ECONOMIC OPPORTUNITY

## 23. EV contract

Economic Opportunity remains separate from the core assessment score.

The established contract is:

- visits are **annual**, not monthly;
- default is **3 visits/year**;
- referral percentage is optional;
- blank referral = unavailable;
- 0% referral = zero;
- EV does not modify the assessment score.

Current model inputs/outputs must be labeled with their units and assumptions.

The user interface, labels, examples, and calculations must match this annual basis.

No monthly-visit wording remains.

---

# PART L — DIAGNOSTICS AND RECOMMENDATIONS

## 24. Diagnostic findings

Diagnostics are derived findings, not a second scoring system.

Each finding must have traceable evidence and, where applicable:

- finding identity;
- affected result dimension;
- severity/priority;
- explanation;
- recommendation category;
- provenance.

The user and admin versions may differ in detail, but both originate from the same structured evidence.

## 25. No unsupported causal language

The system may say:

> "A3 is the lowest measured axis."

when the result proves it.

It may not automatically say:

> "A3 is the cause of your financial loss."

unless a specific approved model/finding proves that causal relationship.

Every existing report statement that makes a causal, financial, or prescriptive claim must be audited and classified before being retained.

---

# PART M — TREND

## 26. Trend validity

A trend comparison requires:

- same assessment family;
- declared compatible assessment versions;
- comparable scoring contract/provenance;
- comparable measured scope.

A numeric difference alone is not sufficient to claim operational improvement or decline.

---

# PART N — LEGACY ENGINE / OLD PATHS

## 27. Historical engine files

The old browser/server engine material remains available through Git history for forensic/reference purposes during migration.

The final repository must not retain competing executable engine identities.

The browser must not execute the old engine as an official scoring path.

## 28. Legacy SQL scorer

`public.calculate_session_score(uuid)` is not authoritative.

It must be dispositioned during implementation after dependency/security verification:

- remove when proven unused and safe to remove; or
- quarantine/retain only when a concrete compatibility requirement exists.

No old path becomes authoritative merely because it exists.

---

# PART O — DATABASE / SECURITY

## 29. Result persistence

`assessment_results` remains the authoritative persisted structured result.

It is server-owned.

The browser has no direct authority to create or modify official results.

## 30. Access control

Before and after database changes verify:

- RLS;
- grants;
- SECURITY DEFINER usage;
- completion RPC permissions;
- admin access;
- public access;
- result read boundaries;
- direct table access;
- Data API exposure.

No frontend hiding is treated as security.

---

# PART P — IMPLEMENTATION WORK PACKAGES

## 31. WP-01 — Freeze and reconcile source inventory

Build an exact inventory of:

- current assessments;
- final content sources;
- current version identities;
- question/option counts;
- axes;
- weights;
- roles;
- KPI mappings;
- interpretation registries;
- consistency rules/pairs;
- EV settings;
- report texts;
- report renderer paths;
- admin renderer paths;
- old engine references;
- persistence functions;
- migrations;
- tests.

Output: reconciled implementation inventory.

## 32. WP-02 — Establish `engine.ts`

Refactor/rebuild the current authoritative scoring path into the canonical `engine.ts` ownership boundary.

Requirements:

- one official scoring entrypoint;
- explicit interpretation version;
- explicit consistency configuration;
- deterministic calculations;
- result construction;
- no report-only scoring.

Reuse sound current modules where they satisfy the contract.

Do not create a second engine.

## 33. WP-03 — Correct configuration semantics

For every final V1 assessment:

- validate percentage weights;
- validate question/option scoring interpretation;
- validate impact;
- validate consistency dependencies;
- validate role mapping;
- validate KPI mapping;
- validate EV configuration.

Where existing values are ambiguous, preserve the visible content and use the approved interpretation contract rather than inventing new answer meaning.

## 34. WP-04 — Result model and persistence

Make the Structured Result complete and authoritative.

Correct persisted score semantics.

Remove duplicate persistence calculations.

Make replay/provenance recoverable.

## 35. WP-05 — Report interpretation engine

Implement the interpretation/report-selection layer.

It must:

- consume Structured Result;
- classify report-relevant states;
- select assessment-specific templates/text;
- enforce permitted claims;
- distinguish user/admin projections.

## 36. WP-06 — Report validation gate

Before final output, validate:

- result/text consistency;
- KPI eligibility;
- coverage;
- unsupported claims;
- consistency visibility rules;
- EV units/assumptions;
- absence of removed Leakage;
- trend comparability;
- template completeness.

A report that fails validation is not finalized.

## 37. WP-07 — Rebuild report text and model linkage

Audit every existing text in `report_texts.json` and related report content.

For each statement:

- identify its evidence source;
- identify which assessment(s) it applies to;
- identify which KPI/result state it requires;
- identify user/admin visibility;
- identify whether it is factual, derived, recommendation, causal, or economic.

Remove or rewrite anything that cannot be justified.

## 38. WP-08 — Assessment V1 reconstruction

For each assessment requiring reset:

1. take the approved corrected content;
2. produce final V1 identity;
3. validate configuration;
4. connect the correct interpretation/configuration;
5. validate report model;
6. validate KPI/EV eligibility;
7. switch family routing;
8. remove superseded old V1 after dependency checks;
9. verify no user-visible V2 identity remains.

Comprehensive Clinic and Patient Journey are the first explicit cases.

## 39. WP-09 — Remove obsolete engine/runtime references

Search every HTML/JS/import/test reference to old engine paths.

Remove dead production references.

Retain only explicitly classified historical/reference fixtures.

Final static verification must show no unintended executable old-engine path.

## 40. WP-10 — Data cleanup

Normalize:

- weight representations;
- score-field semantics;
- obsolete report fields;
- obsolete Leakage outputs.

Do not mutate historical business records without an explicit migration rule.

Apply destructive deletion only where the approved version-reset policy and dependency checks permit it.

## 41. WP-11 — Security/database reconciliation

Verify the final schema and policies after all persistence/version/reset changes.

Check legacy functions and permissions.

Verify no newly introduced direct public access.

## 42. WP-12 — Full verification

Verification must be layered:

### Source/static

- imports;
- ownership;
- forbidden engine paths;
- forbidden Leakage fields;
- report references;
- version naming.

### Unit

- scoring;
- weights;
- interpretation;
- consistency;
- KPI;
- EV;
- diagnostics;
- report selection;
- report validation.

### Integration

- assessment session;
- answer storage;
- completion;
- engine;
- structured result;
- persistence.

### E2E

For each V1 assessment:

`open → answer → save → complete → calculate → persist → produce report`

### Failure/retry

- missing answer;
- malformed answer;
- partial coverage;
- repeated completion;
- concurrent completion;
- stale version;
- invalid configuration.

### Runtime

Verify deployed Edge Function and final public/admin behavior.

---

# PART Q — ACCEPTANCE CRITERIA

## 43. Product acceptance

A user can:

1. open the intended V1 assessment;
2. answer it normally;
3. complete it;
4. receive one authoritative result;
5. receive a report generated from that result;
6. see no Consistency/Trap mechanics;
7. see only supported KPIs;
8. see correct annual EV behavior where applicable;
9. receive no Leakage metric.

## 44. Engineering acceptance

All of the following must hold:

- one `engine.ts` authority;
- no competing executable engine;
- no browser official scoring;
- structured result is authoritative;
- report does not rescore;
- report validation passes;
- user/admin projections are distinct;
- KPI coverage is honest;
- EV is annual;
- weights are canonical percentages;
- raw/max/percentage semantics are correct;
- version identities are final V1;
- obsolete V2 product identities are absent;
- no unsupported causal/financial claims;
- consistency is internally traceable;
- provenance supports replay.

## 45. Closure acceptance

The stage can close only after:

- implementation complete;
- tests pass;
- database/security verification passes;
- deployed artifact verified;
- runtime E2E passes;
- documentation reconciled;
- open risks documented;
- owner has the opportunity to review resulting behavior and alter a decision if necessary.

---

# PART R — ROLLBACK / CHANGE SAFETY

## 46. Reversibility

Where practical:

- code changes are isolated in reviewable commits;
- DB migrations are reversible or have documented recovery;
- result records are not rewritten silently;
- version routing changes are recorded;
- destructive assessment deletion occurs only after dependency verification.

A failed implementation does not justify returning to the superseded plan; it triggers investigation against this contract.

---

# PART S — CURRENT BASELINE AND START POINT

## 47. Current repository baseline

Current `main` was verified at:

`61b34015796eb850527cf362c5f439cc619c4994`

The previous implementation PRs have been formally stopped:

- PR #52 — closed without merge;
- PR #54 — closed without merge.

Their branches are historical/reference only.

PR #53 remains merged history and is not an independent architectural authority.

## 48. Current live data baseline

Verified in Supabase:

- sessions: 0;
- answers: 0;
- scores: 0;
- assessment_results: 0.

This means the implementation can reset current assessment identities without rewriting existing result records.

## 49. First implementation action

The first implementation action is **WP-01 source inventory and reconciliation**, not code mutation.

Only after WP-01 confirms the exact source-of-truth map will implementation of WP-02 onward begin.

---

## 50. Final status

**CHANGE SET:** OWNER APPROVED  
**PREVIOUS IMPLEMENTATION PLAN:** STOPPED / SUPERSEDED  
**IMPLEMENTATION CONTRACT:** ESTABLISHED  
**IMPLEMENTATION:** NOT STARTED  
**PRODUCTION MUTATION:** NOT STARTED  
**NEXT CANONICAL ACTION:** WP-01 source inventory and reconciliation

> Any later owner decision may modify this contract. Such a change must be explicitly recorded and reconciled before affected implementation continues.

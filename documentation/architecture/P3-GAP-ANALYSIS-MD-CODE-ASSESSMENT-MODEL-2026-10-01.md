# P3 Gap Analysis — MD Code Assessment Model vs Current System

**Date:** 2026-10-01  
**Status:** **DESIGNED — OWNER-APPROVED DIRECTIONS / IMPLEMENTATION NOT AUTHORIZED YET**  
**Project:** `core-system-md/clinic-evaluator`

## 1. Purpose

This gap analysis compares the owner-approved **MD Code Assessment Model** and the latest approved guardrails against the verified repository/runtime/database state.

It is a reconciliation artifact, not an implementation authorization.

The five existing assessment contents remain protected. This analysis therefore evaluates how the existing content can be interpreted, scored, reported, stored, and extended without rewriting current question or answer text.

## 2. Evidence basis

Verified evidence used for this analysis:

- Active production scorer: `supabase/functions/assessment-access/score-engine.ts`.
- Active completion path: `assessment-access/index.ts`.
- Browser result rendering: `assets/js/app.js`.
- User report labels/texts: `assets/data/report_texts.json`.
- Live assessment configuration in Supabase.
- Live sessions/scores integrity queries.
- Existing P2 family/version architecture.
- Existing AI Engineering Operating Contract.

## 3. High-level assessment

The current system has a sound structural core:

- server-authoritative scoring;
- pinned assessment versions;
- centralized scoring code;
- axis-level aggregation;
- axis-to-role abstraction;
- immutable assessment versions;
- deterministic-test direction.

The main problem is not that the system lacks an engine. The problem is that the current engine combines several different concepts into a single simplified pipeline and still carries historical representations that are no longer safe as canonical methodology.

The redesign should therefore be **modular reconciliation and replacement of affected scoring layers**, not a rewrite of the entire product.

## 4. Gap classification

### KEEP — preserve as architectural foundations

| Area | Current reality | Decision | Rationale |
|---|---|---|---|
| Server-authoritative official scoring | `complete` calls server `calculateAssessment` | **KEEP** | Correct architectural boundary. |
| Session-pinned assessment version | Session stores assessment type/version | **KEEP** | Required for reproducibility and historical integrity. |
| Assessment family/version model | P2 family + concrete version exists | **KEEP** | Supports future assessment families without changing public identity. |
| Central scorer | `score-engine.ts` is a single active calculation module | **KEEP + modularize** | Correct ownership; internal stages need separation. |
| Axis aggregation concept | Questions roll into axes, axes roll into overall result | **KEEP** | Core concept remains useful across future models. |
| Axis-role abstraction | `axis_roles` decouples role/KPI logic from axis names | **KEEP + refine ontology** | Reusable mechanism for future assessments. |
| Immutable published assessment versions | DB guards and P2 release model | **KEEP** | Protects historical reproducibility. |
| Deterministic fixture direction | Existing parity tests | **KEEP + expand** | Correct testing philosophy, insufficient coverage today. |
| Server-side validation boundary | Stored answer/option integrity is validated before scoring | **KEEP + strengthen config validation** | Needed to protect scoring truth. |

### MODIFY — retain the capability but change its semantics or boundary

| Area | Current gap | Required direction |
|---|---|---|
| Response values | Live options use 0/40/100 without an explicit measurement model | Introduce explicit response/scoring semantics while preserving current visible answers. |
| Impact | Hard-coded 1.5/1/0.5 in engine; all live items are medium | Keep approved baseline but make impact an explicit versioned scoring parameter. |
| Axis weights | Runtime contains both 0–1 and 0–100 scales | Canonical 0–1; validate total = 1.00; migrate configuration only, not question text. |
| Raw score persistence | `raw_score` contains final percentage and `max_possible=100` | Separate earned, maximum, normalized %, weight and weighted contribution. |
| Classification | Q1–Q4 currently named quartiles and reused as grade | Rename semantic concept to performance bands and define exact persistence/display contract. |
| Rounding | Axis scores rounded before overall weighted aggregation | Retain precision until defined output boundary. |
| Configuration validation | Browser has stronger validation than server scorer | Move authoritative validation into server/config publication boundary. |
| KPI mappings | Stored per version but assume broad universal KPI set | Keep version-owned mapping while making KPI availability/coverage explicit. |
| Reporting | UI creates narrative and labels independently from structured result semantics | Introduce structured report data first, then user/admin renderers. |
| Trend | Current trend text assumes previous score and calls any change operational improvement/decline | Make trend an evidence-backed comparison using stored prior result provenance and neutral terminology. |
| Assessment configuration | Live DB is runtime authority while repository JSON also exists | Implement a controlled hybrid source/release process; no silent dual editing. |
| Provenance | `server-score-v1` alone is insufficient | Persist technical engine identity plus scoring contract/config digest. |

### REPLACE — existing implementation is not suitable as canonical methodology

| Area | Current reality | Replacement |
|---|---|---|
| Trap system | Structured trap table contains an invalid historical row; other assessments use option-level `is_trap`; no active Layer B graph | Dedicated rule-based **Consistency / Contradiction Engine** with explicit detection rule, severity, affected dimension, message and optional score effect. |
| Missing-role fallback | Missing roles are filled from average axis score | Coverage-aware KPI calculation; missing inputs are unavailable/partial rather than silently invented. |
| KPI universal defaults | Missing default KPIs are emitted as 0 | KPI registry with substantive availability; absence is represented as unavailable/partial, not zero. |
| EV implementation | Engine EV and interactive endpoint use different formulas | Independent Economic Model subsystem with explicit units, inputs, assumptions, scenario type and one canonical calculation per model. |
| Leakage as 100-score | Current leakage index is simply 100 minus overall score | Treat leakage/quality-risk outputs as distinct derived concepts; only retain this metric if explicitly defined by the final scoring contract. |
| Report-only priority claim | Current UI states that weakest axis requires immediate intervention and gives unsupported improvement language | Diagnostic findings must be generated from scored evidence and approved interpretation rules; user report should motivate consultation, not prescribe intervention. |

### REMOVE / RETIRE — historical or duplicate authority

| Area | Current reality | Direction |
|---|---|---|
| Browser engine as executable authority | Browser reference engine exists for parity | Retain only as frozen reference/test fixture material; not a production calculation authority. |
| Unused `scoring.ts` adapter | Calls nonexistent RPC | Retire after dependency verification and documented disposition. |
| Legacy `calculate_session_score` | Separate legacy average-answer scorer exists but is non-authoritative | Retire/quarantine after a specific compatibility decision and verification. |
| Hard-coded all-role universe inside scorer | Fixed list in `score-engine.ts` | Remove as engine authority; roles should be defined by the assessment/model registry. |
| Hard-coded report labels as semantic truth | Report text file contains methodological claims | Keep presentation copy only; semantic claims must originate from structured result definitions. |

### NEW — capabilities required by the approved MD Code model

| New capability | Why required |
|---|---|
| Assessment item scoring model | Distinguish maturity/capability/experience/outcome/evidence/metric items without changing current item text. |
| Response interpretation layer | Convert selected options to explicit response/scoring values while preserving option labels. |
| Coverage engine | Record measured, missing, applicable and unavailable dimensions. |
| Confidence/evidence metadata | Prevent self-reported results from being presented as stronger evidence than they are. |
| Critical-gate support | Allow future models to prevent critical failures from being hidden by compensatory averaging. |
| Consistency rule registry | Structured contradiction/consistency rules independent from option flags. |
| KPI registry | Define KPI meaning, source roles/components, coverage requirements and availability state. |
| Economic model registry | Support future opportunity models without coupling them to the base score. |
| Structured diagnostic finding model | Store evidence-backed weaknesses, strengths, risks and opportunity findings independently from report prose. |
| Report projection layer | Generate different views from the same result: user-facing vs admin/management. |
| Benchmark model | Separate self-trend, internal comparison and validated external benchmark. |
| Trend model | Preserve result-to-result changes with comparable assessment version/contract information. |
| Reproducibility snapshot | Preserve configuration/contract digest and calculation inputs needed to reconstruct a result. |
| AI-ready structured result | Store machine-readable assessment evidence rather than relying on generated prose. |
| Assessment validation gate | Prevent publication of structurally invalid scoring configurations. |
| Economic unit validation | Prevent dimensional mistakes such as using the same visits variable as both annual flow and LTV frequency. |

## 5. Content protection impact

This redesign does **not** require rewriting the five current assessments.

The existing questions and visible answer labels remain the content source.

The work occurs around them:

`existing question/answer content`
→ `explicit interpretation/scoring configuration`
→ `engine`
→ `structured result`
→ `reports`

Where a current question has no valid semantic configuration for a new capability, the correct action is to mark that capability as unavailable rather than invent new question meaning.

## 6. Current live-data implications

### 6.1 Weight scale inconsistency

Verified production currently contains both:

- fractional weights such as 0.50/0.30/0.20;
- percentage weights such as 35/25/25/15.

The engine can numerically normalize both because it divides by total weight, but the system lacks one canonical semantic representation.

This is a configuration/data-contract gap, not a content gap.

### 6.2 Trap inconsistency

Verified production has:

- five assessments with `has_traps` values that do not match populated trap rules;
- one invalid structured trap row;
- trap-option flags in three assessments;
- zero active Layer B questions;
- zero populated `trap_for` graphs.

Therefore current trap outcomes cannot be represented as a proven canonical methodology across the five assessments.

### 6.2b Historical-session reconstruction finding

A forensic query confirmed that the five completed sessions with no score rows also have **zero stored answer rows**. Their linked lead records contain legacy aggregate score values, but those values do not provide the answer vector or calculation inputs required to deterministically reconstruct the axis-level result under the approved scoring contract.

Therefore the owner-approved instruction to reprocess the five records is subject to an evidence gate:

1. attempt deterministic reconstruction from complete historical inputs;
2. if complete inputs are unavailable, do not fabricate or infer answers;
3. produce a separate retention/deletion decision for each affected legacy record/group;
4. any deletion must be explicit, reversible where practical, and verified.

The legacy lead-level score may be retained as historical metadata only if its provenance and semantic status are explicitly labeled; it must not be presented as a newly recomputed result.

### 6.3 KPI coverage gap

Current mappings request roles not measured by many assessments and the engine fills them with the mean of available axes.

That makes the resulting KPI look complete even where substantive coverage is absent.

The new model requires the system to preserve that distinction.

### 6.4 Score persistence integrity

The live database currently confirms:

- 5 completed sessions with no score rows;
- 123 score rows with `session_id IS NULL`.

These are separate integrity problems.

The five completed sessions require the owner-approved historical reconstruction process.

The 123 orphan rows require a separate forensic reconciliation before any deletion or reassignment. Current evidence shows they are session-less legacy score records with legacy axis labels and stored percentages, including multiple records sharing legacy lead identifiers. This is **strong evidence of historical/seeded data**, but it is not sufficient authorization to delete or reattach them. They must be isolated from authoritative current-session analytics until their provenance and retention policy are documented.

## 7. Reporting gap

The current user interface currently produces several statements that are stronger than the underlying structured evidence supports.

Examples from current runtime/report presentation include:

- treating `100 - overallScore` directly as an operational leakage percentage;
- labeling the weakest axis as requiring immediate intervention;
- stating that it can “close leakage” by a percentage derived from the axis score;
- presenting generic KPIs even when their role inputs are imputed;
- displaying economic outputs whose browser labels and server formulas are not the same contract;
- displaying historical change as “تحسن تشغيلي” or “تراجع في الكفاءة” without a formal trend/benchmark contract.

Under the owner-approved report policy, these must become evidence-backed projections from the result object.

The user report should explain the finding and the business relevance, then create a reason to seek professional consultation.

The admin report may expose the full calculations, data coverage, limitations, inconsistencies and diagnostic detail.

## 8. Economic-model gap

The present economic model has a dimensional inconsistency in the interactive path.

The UI describes visits/month, while the endpoint effectively uses the same `visits` value in both flow and LTV construction.

The browser also collects referral percentage but does not submit it to the endpoint.

This means the current simulator cannot yet serve as a canonical economic model.

The replacement architecture must require each economic model to declare:

- quantity name;
- unit;
- time basis;
- source/input type;
- valid range;
- formula;
- assumptions;
- scenario interpretation;
- output unit;
- confidence/limitations.

## 9. Overall target architecture

The target pipeline is:

`Pinned Assessment Version`
→ `Input Validation`
→ `Response Interpretation`
→ `Item Scoring`
→ `Axis/Component Aggregation`
→ `Coverage + Quality`
→ `Consistency Analysis`
→ `Global / Classification`
→ `Role Translation`
→ `KPI Registry`
→ `Economic Models (optional)`
→ `Diagnostic Findings`
→ `Structured Result Snapshot`
→ `User Report Projection / Admin Report Projection`

Important boundary:

**Reports do not calculate. Reports project already-calculated structured results.**

## 10. Impact on the five current assessments

No assessment becomes invalid merely because the engine is redesigned.

The five current assessments should be treated as migration targets for the new configuration contract:

- preserve all current question text;
- preserve all current answer labels;
- preserve assessment family identity;
- preserve published version identity/history;
- re-express weights in canonical representation;
- explicitly configure scoring metadata;
- repair/reconcile trap configuration without changing visible content;
- validate KPI coverage instead of imputing missing roles silently;
- disable or redesign economic outputs where the model is not yet mathematically valid;
- regenerate report output from structured results.

## 11. Gaps that can be resolved without a new owner decision

Subject to the approved directions, engineering can design and implement:

- modular scorer boundaries;
- server-side configuration validation;
- canonical weight representation;
- structured result contract;
- provenance/digest mechanism;
- deterministic fixture expansion;
- report projection separation;
- AI-ready result structure;
- data-integrity forensic queries;
- migration tooling that preserves content and version lineage.

## 12. Areas still requiring explicit owner decision

The following remain outside the already approved 14-item direction set or require a narrower business/methodology rule before implementation:

### A. Exact response-scoring semantics for the existing 0/40/100 answers

The system may preserve the answers while changing how they are mathematically interpreted, but the exact future model must be frozen before implementing a different response scale or maturity mapping.

### B. Exact consistency rules for each of the five assessments

The architecture is approved as a rule-based consistency layer, but the exact rule graph, triggers, severities and score effects must be derived from evidence and approved methodology rather than invented during coding.

### C. Critical-gate policy

The model supports gates architecturally, but which dimensions are critical and how a gate changes classification/result is a product-methodology decision.

### D. Legacy scoring-path disposition

The repository still contains a non-authoritative legacy RPC and unused adapter. Their final retirement/quarantine policy should be recorded before destructive removal.

### E. Exact economic models

The architecture is approved, but the actual economics contract for each current/future model needs a defined formula and units before exposing monetary figures as official results.

## 13. Gap severity summary

**FOUNDATIONAL ARCHITECTURE:** Strong  
**SCORING CORE:** Functional but semantically under-specified  
**WEIGHTS:** Data-contract gap  
**IMPACT:** Configurably present but not exercised in current data  
**TRAPS/CONSISTENCY:** Major gap / non-canonical  
**KPI:** Major semantic gap due to imputation  
**EV:** Major architectural + dimensional gap  
**REPORTING:** Major provenance/interpretation gap  
**PERSISTENCE:** Major result-semantics gap  
**PROVENANCE:** Partial  
**DATA INTEGRITY:** Major: 5 scoreless completed sessions + 123 orphan score rows  
**AI READINESS:** Foundation exists, structured result layer required  
**FUTURE ASSESSMENTS:** Architecture is viable after configuration contract is strengthened

## 14. Recommended engineering direction

The correct direction is **not** “rewrite the five assessments” and not “patch the existing scorer one issue at a time”.

The recommended sequence is:

**1. Freeze the P3 Scoring Contract**

Define the exact semantics of response interpretation, weights, aggregation, coverage, classification, consistency, KPI availability, economics, rounding and provenance.

**2. Build the structured result contract**

Make one canonical result object the source for persistence, reports, admin analysis and future AI integration.

**3. Refactor the scorer into independent stages**

Keep the existing server authority while separating scoring, consistency, KPI, economics and diagnostics.

**4. Migrate the five existing assessment configurations**

No visible question/answer changes. Only scoring/configuration metadata and engine-facing structures change.

**5. Rebuild reporting from structured results**

User and admin reports become two views of the same factual result.

**6. Reconcile historical data**

Recompute the five scoreless completed sessions where reconstruction is deterministic.

Separately investigate the 123 orphan scores and issue a dedicated data-remediation decision.

**7. Expand verification**

Use deterministic fixtures, boundary tests, configuration-validation tests, persistence integrity tests, report-result consistency tests and runtime E2E.

## 15. Implementation readiness

**Model:** Owner Approved  
**Guardrails:** Owner Approved  
**Gap Analysis:** Completed  
**Detailed Scoring Contract:** Not yet frozen  
**Exact Trap Rules:** Not yet frozen  
**Exact Economic Formulas:** Not yet frozen  
**Critical Gate Rules:** Not yet frozen  
**Legacy Path Disposition:** Not yet frozen  
**Historical Reconciliation:** Investigation required  
**Implementation:** **NOT IMPLEMENTATION-READY**

## 16. Next canonical artifact

The next artifact should be:

**P3 — MD Code Scoring Contract**

It will translate the approved model and this gap analysis into exact, testable contracts without changing the five assessments' visible content.


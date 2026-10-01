# MD Code Assessment Model — Owner-Approved Guardrails

**Date:** 2026-10-01  
**Status:** **OWNER APPROVED — GOVERNING CONSTRAINTS**  
**Project:** `core-system-md/clinic-evaluator`

## 1. Purpose

This record captures the project owner's explicit approval of the MD Code Assessment Model and the additional constraints that govern the next assessment/scoring-engine stage.

This document is a decision record for the methodology boundary. It does **not** authorize implementation of unresolved scoring formulas or architectural decisions.

## 2. Approved model boundary

MD Code is to be developed as a general, extensible diagnostic assessment platform for healthcare facilities, teams, practices, and future assessment models.

The five assessments currently in the system are the **Approved Current Assessment Set** and are valid reference implementations. They are **not** the final catalog and must not be treated as a closed universe.

The central assessment/scoring architecture must therefore support future assessment families and assessment versions without requiring a new special-case scoring engine for each future assessment.

## 3. Current assessment content is protected

For the five currently approved assessments:

- Existing question text must not be rewritten as part of the scoring-engine/model work.
- Existing answer/option text must not be rewritten as part of the scoring-engine/model work.
- Existing assessment wording must not be silently normalized, modernized, shortened, or replaced.
- The scoring/model work may change how existing answers are interpreted **only through explicitly approved scoring configuration and engine rules**.
- Reweighting, normalization, impact configuration, classification thresholds, aggregation, consistency analysis, KPI derivation, and other scoring controls may be redesigned only through the approved decision process.
- Any future content changes to questions or answers are a separate content/methodology decision and are outside this approval.

## 4. Report integrity

Every user-facing report must be derived from the actual assessment result and its recorded indicators.

Reports must not introduce:

- invented indicators;
- unsupported percentages;
- unsupported claims of improvement;
- fabricated benchmarks;
- hidden metrics not produced by the assessment/model;
- economic figures that are not backed by the selected economic model and its inputs.

A narrative statement may interpret a real result, but it must not create a new measurement that the engine did not calculate.

## 5. User-facing communication standard

User-facing reports must:

- remain professional and credible;
- explain weaknesses, gaps, inconsistencies, and errors clearly;
- avoid harsh, accusatory, humiliating, or judgmental language;
- distinguish a detected weakness from a judgment about the person/team/clinic;
- preserve a constructive tone.

The purpose is diagnosis and awareness, not condemnation.

## 6. Commercial role of the user report

The user-facing report is an entry point to consultation/training services, not a replacement for those services.

The report should:

- make the result understandable;
- identify meaningful weaknesses and opportunities;
- communicate why the finding matters;
- create a clear reason to seek professional assessment, consulting, training, or follow-up support.

The report should **not** become an automatic consulting system that presents the full solution, implementation plan, or professional intervention as if the assessment alone had delivered it.

## 7. Admin / management reporting

Administrative and management views are intentionally more transparent and detailed than the public/user report.

They should expose, to the authorized audience and according to the security model:

- the complete result set;
- weak areas and strong areas;
- detected inconsistencies/errors;
- score components;
- coverage and missing-data conditions;
- confidence/evidence indicators where implemented;
- KPI availability and derivation;
- economic-model inputs and outputs where enabled;
- calculation/provenance information needed for audit and management review.

Admin reporting must be factual and explicit even when the user-facing report uses softer professional language.

## 8. AI-readiness and learnability

The system must be designed so that important information is retained as structured, traceable data rather than being lost inside presentation text.

For each material assessment result, the architecture should preserve, where applicable:

- assessment family and version;
- answer selections;
- interpreted response values;
- scoring configuration used;
- axis/component results;
- weights and contributions;
- consistency findings;
- KPI derivations and availability;
- economic model inputs/outputs;
- coverage/missingness;
- confidence/evidence metadata;
- classification;
- diagnostic findings;
- recommendations/recommendation categories;
- provenance and reproducibility identifiers;
- timestamps and relevant session/result lineage.

This requirement prepares the system for future controlled integration with AI systems without making AI an authoritative source of assessment truth.

## 9. Architectural decision authority

Any architectural decision that materially affects:

- domain ownership;
- assessment/scoring semantics;
- data semantics;
- result persistence;
- security boundaries;
- authentication/authorization;
- core workflows;
- integration contracts;
- destructive migrations;
- foundational subsystem replacement;
- or major new dependencies

must be presented to the project owner with:

1. the current verified reality;
2. the affected components;
3. the technical consequences;
4. viable options;
5. the recommended engineering direction;
6. the exact decision required.

Implementation must stop at the decision boundary when an unresolved material owner decision is required.

## 10. Prohibited shortcuts during P3

The following are not authorized by this approval:

- silently editing the five assessment texts or answer texts;
- silently changing the meaning of an answer;
- inventing report-only metrics;
- adding a KPI merely because a report template expects it;
- recomputing historical results without an explicit policy;
- treating the five current assessments as the permanent limit of the platform;
- introducing a semantic engine version ladder as a product assumption;
- deleting legacy scoring paths solely because they appear unnecessary before their disposition is approved;
- changing mathematical scoring rules only because a cleaner implementation is possible.

## 11. Relationship to the engineering operating contract

This decision record operates under `documentation/governance/AI-ENGINEERING-OPERATING-CONTRACT.md`.

The operating sequence remains:

**TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE**

No implementation claim is implied by this record.

## 12. Current P3 status

**Model framework:** Owner Approved  
**Owner guardrails:** Owner Approved  
**Five existing assessment contents:** Protected  
**Scoring semantic contract:** Requires Decision  
**Trap contract:** Requires Decision  
**KPI contract:** Requires Decision  
**Economic opportunity contract:** Requires Decision  
**Persistence/provenance contract:** Requires Decision  
**Assessment configuration ownership:** Requires Decision  
**Implementation:** Not Implementation-Ready until the remaining material decisions are resolved.

## 13. Next canonical action

Produce the P3 gap analysis against the approved MD Code Assessment Model and present the remaining material architecture/scoring decisions as explicit decision records with options and consequences.

No semantic or content mutation is authorized until those decisions are approved.

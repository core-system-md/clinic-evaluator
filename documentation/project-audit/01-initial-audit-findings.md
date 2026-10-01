# Clinic Evaluator — Initial Audit Findings

**Date:** 2026-09-30  
**Repository:** `core-system-md/clinic-evaluator`  
**Audit branch:** `documentation/audit-and-decisions`  
**Baseline:** `main` at `4f3af091b244110192acae78d5de10f87d1c41eb`  
**Supabase project:** `oaqpzaarppccbnepffxx`

## 1. Scope of the initial audit

The initial review covered the repository structure and the principal runtime/admin files, including the assessment engine, public application flow, Supabase client, admin authentication/management, assessment data/configuration, documentation, and tests. The connected Supabase project was also inspected at the schema, policies, functions, Edge Functions, indexes, migrations, and Advisor levels.

This document records **findings, not approved architectural changes**. No finding below is an authorization to implement a redesign. Architectural decisions remain subject to the project owner's approval.

## 2. Positive architectural observations

- A centralized `AssessmentEngine` exists rather than distributing scoring logic across individual assessment pages.
- The Axis Role concept decouples KPI definitions from specific axis names and is a strong basis for reusable assessment definitions.
- The system supports cloud-driven assessment definitions rather than requiring a separate scoring implementation for every assessment.
- Traps/leakage concepts provide a useful mechanism for detecting inconsistencies rather than relying only on raw self-reported scores.
- The repository already separates public assessment behavior from admin behavior, even though the current admin architecture needs further investigation/refactoring.
- The Arabic-first assessment/reporting direction is coherent with the current product domain.

## 3. Findings requiring investigation

### 3.1 Security / authorization

The current Supabase security posture requires immediate investigation before production expansion.

Observed areas include:

- public/anonymous access policies on data that includes lead/session/answer/score information;
- `SECURITY DEFINER` functions exposed through Data API grants;
- functions with mutable `search_path` configuration;
- an admin authentication path that coexists with an older client-side/local-storage approach;
- assessment-user credential data exposed to client-side flows;
- a privileged Edge Function acting as a broad administrative gateway rather than a set of narrowly authorized use cases.

These observations require confirmation of intended threat model and legitimate public flows before deciding which policies should change.

### 3.2 Source of truth / deployment reproducibility

The repository contains assessment/configuration JSON while Supabase also contains live assessment definitions. The current repository does not contain a version-controlled Supabase migration history sufficient to reproduce the live database from Git.

The connected Supabase project reports **zero migrations** in the migration history inspected during this audit.

This creates a source-of-truth and reproducibility question that must be resolved architecturally before changing the schema.

### 3.3 Assessment versioning

The current data model has assessment/version-related fields, but the audit did not find evidence that published assessment definitions are immutable, fully versioned snapshots tied to completed sessions.

This matters because changing a question, option, weight, KPI mapping, trap, or scoring rule can otherwise change the interpretation of historical results.

### 3.4 Submission atomicity / data integrity

The public submission flow performs multiple persistence operations around lead/session/answers/scores. These operations need to be examined as a single business transaction. The current design can potentially leave partially persisted assessment state if a later operation fails.

This requires investigation of the intended failure/retry/idempotency model before choosing between an RPC, Edge Function transaction, or another architecture.

### 3.5 Scoring engine semantics

The scoring engine is conceptually centralized, but the audit found an important semantic issue requiring owner review: missing Axis Roles can be represented through fallback behavior rather than explicitly as unavailable/insufficient data. This can cause a KPI to receive an inferred score from other roles instead of being marked unavailable or normalized over available inputs.

This is a **measurement-model question**, not merely a coding bug. It must be resolved against the intended assessment methodology before changing the engine.

### 3.6 EV model

The current code contains EV calculations with fixed factors and a separate UI-side calculation path. The two paths do not appear to represent one unambiguous financial model.

Before changing this, the business definition of EV must be agreed: annual incremental revenue, patient lifetime value, referral value, retention value, or another defined quantity. The mathematical units and source variables then need to be made explicit.

### 3.7 Admin architecture

The admin code contains a large amount of UI, state, data access, CRUD, import/duplicate, and management behavior in relatively large modules. There are also indications of overlapping/legacy authentication approaches.

This suggests refactoring may be appropriate, but the intended admin threat model and workflows should be documented first.

### 3.8 Frontend structure

Multiple assessment HTML entry points appear to use the same underlying application with different selected assessment identifiers. This may be intentional for SEO/direct links or deployment simplicity. It should therefore not be removed merely because it looks repetitive.

The architectural question is whether these entry points are product requirements or legacy duplication.

### 3.9 Client-side rendering / XSS surface

Dynamic assessment data is inserted into HTML templates. Because assessment content is data-driven, the trust boundary between administrator-authored content and browser-rendered HTML needs to be explicit. Text content should not become executable markup unintentionally.

The correct mitigation depends on the intended content model (plain text versus trusted rich text).

### 3.10 Testing

The existing automated test coverage is much narrower than the importance of the scoring engine and security model. Current tests do not appear to establish a comprehensive contract for scoring, KPI mapping, traps, EV, authorization, persistence, or historical-result invariants.

The appropriate target is not simply a higher test count; the system needs deterministic scoring fixtures, database/integration tests, security tests, and end-to-end tests around critical workflows.

### 3.11 Database performance / policy complexity

The Supabase performance/security inspection identified index and policy areas requiring review, including foreign-key indexing opportunities, unused indexes, and multiple permissive policies. These are secondary to the security/integrity questions but should be addressed as part of database consolidation.

## 4. Important methodological caution

The initial audit intentionally did **not** assume that every unusual implementation is a mistake. Some apparent issues may exist because they solve a product requirement, preserve compatibility with an earlier release, or support a specific operational workflow.

Before modifying any item, the next investigation should answer:

1. What requirement led to the current design?
2. Is that requirement still valid?
3. Which clients/workflows depend on it?
4. What data already exists under the current model?
5. What failure/security scenario is the current design intended to prevent?
6. What alternatives preserve the legitimate requirement with fewer risks?

## 5. Current status

**P0 is an investigation phase.** No architectural redesign described in this document is approved by default.

The project owner has provisionally accepted the overall P0–P5 work roadmap, while retaining explicit approval authority over architectural decisions. Engineering and implementation decisions follow the approved architecture.

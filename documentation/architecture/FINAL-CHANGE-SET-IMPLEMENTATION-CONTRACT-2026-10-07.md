# Final Change Set — Implementation Contract
## 2026-10-07

**Status:** IMPLEMENTATION-READY — NO IMPLEMENTATION STARTED IN THIS CONTRACT CHECKPOINT  
**Authority:** Owner-approved Final Change Set, under the AI Engineering Operating Contract  
**Project:** `core-system-md/clinic-evaluator`  
**Canonical branch:** `main`  
**Canonical baseline commit:** `61b34015796eb850527cf362c5f439cc619c4994`  
**Supersedes:** `documentation/governance/CURRENT-ENGINEERING-RECONCILIATION-WORK-CONTRACT-2026-10-07.md` for execution of this specific correction, while remaining subordinate to the generic `AI-ENGINEERING-OPERATING-CONTRACT.md` and to later explicit owner decisions.

---

# 1. Owner approval and authority boundary

On 2026-10-07 the project owner approved the Final Change Set covering assessment identity, central calculation, Structured Result, KPI/report integrity, Leakage removal, EV, persistence semantics, and final verification.

The owner retains the right to modify any product or methodology decision after observing implementation results.

Therefore:

- this contract is the current engineering execution specification of the approved direction;
- a later explicit owner decision supersedes the affected clause;
- engineering observations do not silently become product decisions;
- implementation must stop at any newly discovered material decision boundary.

Approval of this contract means the approved Change Set is the intended target.

It does **not** itself claim that implementation has started, been tested, deployed, or been verified.

---

# 2. Governing engineering method

Mandatory sequence:

**TRUTH → OWNERSHIP → DECISION → DESIGN → IMPLEMENTATION-READY → IMPLEMENT → VERIFY → DOCUMENT → CLOSE**

Mandatory engineering order:

**UNDERSTAND → VERIFY → RECONCILE → DESIGN → REUSE → EXTEND → IMPLEMENT → INTEGRATE → VALIDATE → DOCUMENT → COMMIT → DEPLOY IF REQUIRED → RUNTIME VERIFY → CLOSE**

No implementation may bypass a material unresolved ownership, security, product, data-semantic, or architecture decision.

---

# 3. Canonical evidence hierarchy

When evidence conflicts:

1. explicit current owner decision;
2. current approved architecture/specification;
3. verified live runtime behavior;
4. repository/database evidence;
5. tests/CI evidence;
6. current documentation;
7. historical documentation;
8. AI assumption.

The contract must always distinguish:

- what the system currently does;
- what the approved target requires;
- what has actually been verified.

---

# 4. Current verified baseline at contract issuance

## 4.1 Repository

Current `main` is:

`61b34015796eb850527cf362c5f439cc619c4994`

It contains the binding engineering reconciliation contract created on 2026-10-07.

The repository still contains historical and superseded P3/P5 artifacts. Their presence is not authority.

## 4.2 Open implementation paths

PR #52 and PR #54 were closed on 2026-10-07 without merge and are now historical/reference paths only.

No implementation may be resumed from either branch.

## 4.3 Live Supabase

Project:

`oaqpzaarppccbnepffxx`

Current read-only verification at contract issuance:

- `assessment-access` is ACTIVE, version 32;
- deployed source digest: `950467bed27b99961ea46177e654be2cacacf4f867ad884549de9d7dc0198edb`;
- `public.assessment_results` exists;
- current `sessions` count = 0;
- current `assessment_results` count = 0.

Therefore there is currently no result population that must be preserved for numeric continuity testing, although database objects and historical tables still require dependency analysis.

## 4.4 Current published assessment reality

At contract issuance the live database contains:

- Admin/Reception V1 — published/active;
- Medical Team V1 — published/active;
- Comprehensive Clinic V1 — archived/inactive;
- Comprehensive Clinic V2 — published/active;
- Patient Journey V1 — published/active;
- Clinic Performance V1 — published/active.

The target of this Change Set is **not** to expose V2 identities to users.

The approved target is to establish the corrected final published assessment definitions under their final V1 identities while preserving the stable family/public identity.

---

# 5. Non-negotiable target architecture

The final runtime must be:

`Assessment Family / Final V1`
→ `Pinned Assessment Definition`
→ `Answers`
→ **single authoritative central assessment engine**
→ `Structured Result`
→ `Report Interpretation / Projection`
→ `User Report or Admin Report`

The report does not calculate.

The browser does not calculate the official result.

Legacy tables/functions do not become competing authorities.

---

## 5.1 Technical ownership and functional naming

The repository must preserve one clear technical owner for each responsibility.

- Production/runtime technical files must be named for their responsibility/function, not for P0–P5, WP-01–WP-n, or another work-plan stage.
- Stage labels may remain in documentation and deliberate traceability artifacts such as stage-specific tests and CI when they serve auditability rather than technical ownership.
- Before creating a new technical file, inspect and verify the existing owner. Repair/refactor by modifying or extending that owner whenever it already owns the responsibility.
- A new technical file is permitted only for a genuinely independent responsibility with an explicit ownership boundary. It must not be a replacement/parallel implementation created merely to avoid modifying the existing owner.
- After extraction or replacement, reconcile all imports, callers, exports, tests, workflows, runtime entrypoints, and deployment references. No abandoned, disabled, dead, or duplicate implementation may remain without an explicitly documented temporary compatibility/reference purpose.
- New database migrations must use functional names. Previously applied migration filenames are migration-history identities and must not be renamed as a cosmetic cleanup; any migration-name reconciliation requires live-history, dependency, and provenance verification.
- P0–P5/WP labels in branch names, PR titles, commits, tests, or CI do not authorize treating the referenced runtime responsibility as a stage-named subsystem.

This is an engineering ownership and technical-debt rule, not a cosmetic naming preference.

# 6. Assessment identity reset

## 6.1 Final identity rule

The five product assessment families remain the same families.

The final corrected published assessment definitions are V1 identities.

This includes the current Comprehensive Clinic V2 target and the superseded Patient Journey V2 implementation material.

The V2 paths are implementation/reference material only.

## 6.2 No user-facing V2 identity

The public stable family slug remains unchanged.

Users must not see:

- V2 as a product label;
- internal migration/version mechanics;
- registry version names;
- implementation-stage terminology.

## 6.3 Versioning safety

Because published assessment definitions are immutable under the P2 model:

- do not mutate a published definition in place;
- construct the final V1 definition safely;
- verify family publication routing;
- migrate references only through the approved lifecycle path;
- remove obsolete published versions only after dependency checks prove that removal is safe.

## 6.4 Historical data rule

Before any assessment-version deletion:

- inspect sessions;
- inspect answers;
- inspect scores;
- inspect `assessment_results`;
- inspect leads;
- inspect family/version references;
- inspect foreign keys, triggers, RPCs, policies and admin/report reads.

The current zero-session/zero-result state reduces, but does not by itself prove, that deletion is safe.

No historical record may be silently rewritten.

---

# 7. Central engine implementation

## 7.1 Canonical file

The approved final technical entrypoint is:

`supabase/functions/assessment-access/engine.ts`

The existing `score-engine.ts` is the source implementation to be consolidated into this final entrypoint.

This is a controlled rename/refactor, not creation of a second engine.

## 7.2 Compatibility of the public internal API

The central function remains conceptually:

`calculateAssessment(client, input)`

so that the completion boundary does not acquire a second scoring interface.

All official calculation remains server-side.

## 7.3 Internal ownership

The engine owns:

- loading the pinned assessment;
- validating configuration and answer integrity;
- resolving interpretation configuration;
- invoking reusable calculation modules;
- applying configured consistency effects;
- calculating global result;
- calculating role/KPI/economic downstream results;
- assembling Structured Result;
- creating persistence-ready projections;
- attaching provenance.

The engine does not contain assessment-specific hard-coded equations.

## 7.4 Existing reusable modules

Reuse the existing calculation modules where they match the approved contract:

- response interpretation;
- profile/component aggregation;
- consistency;
- coverage/criticality;
- Structured Result;
- economic model.

Refactor them only where the current contract is contradicted.

Do not create a second scoring kernel.

---

# 8. Engine identity and provenance

## 8.1 No semantic engine-version ladder

Do not create:

- Engine V2;
- Engine V3;
- P3 Engine;
- P4 Engine;
- P5 Engine.

P0–P5 remain stage labels only.

## 8.2 Technical identity

The Structured Result provenance must carry:

- immutable technical engine identity;
- scoring-contract digest;
- assessment configuration digest;
- assessment family/version;
- interpretation version;
- session/result lineage;
- calculation timestamp.

## 8.3 Existing database compatibility field

The existing `scoring_engine_version` storage field must not be repurposed into a semantic product version ladder.

Until a safe schema rename is independently justified, it may remain as a compatibility field carrying the technical identity value.

No value such as `Engine V2` is permitted.

---

# 9. Interpretation registry ownership

## 9.1 Current problem

The repository contains versioned interpretation registries and historical documents with conflicting status language.

A registry marked non-production cannot simultaneously be treated as a production authority without reconciliation.

## 9.2 Target

For each final V1 assessment:

- exactly one interpretation source is authoritative;
- status is explicitly marked according to its actual production role;
- runtime routing is explicit;
- assessment version and interpretation version are distinct concepts;
- interpretation version is never silently derived from assessment version.

## 9.3 Implementation

Refactor the central engine so that interpretation version is an explicit input/configuration.

Do not rely on:

`interpretationVersion = assessmentVersion`

unless that mapping is explicitly declared for the version.

Historical V2 registries remain reference evidence until all production references are proven obsolete.

---

# 10. Consistency / Trap correction

## 10.1 Architectural rule

Consistency detection and score effect are distinct.

A configured score effect may change the official score.

A detected consistency finding is retained as structured evidence.

## 10.2 Current approved score-effect model

The owner-approved 2026-10-06 reality decision remains authoritative.

Where explicitly configured, a validator anchor may be capped by a declared relationship rule.

Example approved Comprehensive behavior:

`100 → 70`

This is not a generic Trap penalty.

No percentage penalty is inferred from the word Trap.

## 10.3 Old Trap metadata

Fields such as:

- `is_trap`;
- `trap_triggered`;

are not official consistency sources.

They may remain as historical storage until a separate safe disposition is established.

## 10.4 User report

The user-facing report does not expose the internal consistency mechanism.

It may present an approved professional diagnostic consequence when that statement is backed by Structured Result evidence.

## 10.5 Admin report

Admin reporting may expose:

- rule evidence;
- affected questions/components;
- severity;
- score effect;
- review requirement;
- provenance.

All of these must originate from the official Structured Result.

---

# 11. Leakage decision

## 11.1 Historical origin

The original engine produced:

`leakageIndex = 100 - globalScore`

after the Trap penalty stage.

This proves Leakage was a derived inverse of the final overall score.

It was not the sum of Trap penalties.

## 11.2 Target

Remove the current Leakage metric from the official result/report model.

Specifically eliminate:

- `100 - overallScore` as an official metric;
- "نسبة الفاقد التشغيلي" as an official score-derived metric;
- any statement equating Leakage with financial loss;
- any statement equating Leakage with patient leakage;
- any statement treating Leakage as the mathematical result of Traps.

## 11.3 Preservation

Historical documentation and Git history remain intact.

Future economic opportunity must come through a declared economic model.

Future diagnostic opportunity must come through an evidence-backed finding.

---

# 12. Structured Result is the single factual result

## 12.1 Required result domains

The structured result must retain, where applicable:

- identity;
- provenance;
- raw answer selections;
- interpreted response states;
- item/measurement information needed for audit;
- component/axis raw values;
- component/axis normalized scores;
- canonical weights;
- global result;
- classification;
- coverage;
- consistency findings;
- criticality;
- roles;
- KPIs;
- economics;
- diagnostics;
- audit/replay lineage.

## 12.2 Persistence-ready axis semantics

Each persisted score must distinguish:

- raw earned points;
- maximum possible points;
- normalized percentage;
- canonical weight;
- weighted contribution;
- band.

`raw_score` must never be the final percentage by definition.

## 12.3 One source for axis persistence

The current duplicate construction of `axisPersistenceRows` in both the integrated scorer and the outer scoring entrypoint is removed.

Canonical responsibility:

- calculation modules calculate;
- Structured Result preserves the factual score representation;
- `engine.ts` creates the persistence projection from Structured Result exactly once.

No second mathematical recalculation is permitted merely for persistence.

---

# 13. KPI contract

## 13.1 KPI catalog

Retain the approved KPI definitions:

`TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI`

and `RRI` for Admin/Reception when supported.

The catalog is not recreated from scratch.

## 13.2 Coverage rule

A KPI can only use roles actually measured by the assessment.

No role may be invented from:

- overall score;
- unrelated axis;
- average of available axes;
- default value.

## 13.3 KPI states

Every KPI result has:

- `available`;
- `partial`;
- `unavailable`.

A KPI with unsupported inputs is not converted to zero.

## 13.4 User report policy

User reports may show KPI values only when the report model explicitly allows the KPI and its support level is sufficient for that display.

A partial KPI must never be presented in a way that implies full measurement.

## 13.5 Admin report policy

Admin may display:

- value;
- state;
- coverage;
- contributing roles;
- mapping weights;
- provenance.

---

# 14. Report architecture

## 14.1 Canonical separation

The report system is downstream from Structured Result:

**Structured Result → Report Interpretation → Report Projection → Validation → Rendering**

## 14.2 Reuse existing files

Existing:

`assets/data/report_texts.json`

remains the presentation-copy source where appropriate.

It must no longer be the semantic source of scoring truth.

Its legacy claims must be corrected where they contradict the approved model.

## 14.3 New report projection boundary

Create one server-side report projection module only if the existing code has no suitable canonical owner.

Target responsibility:

`supabase/functions/assessment-access/report-projection.ts`

This module is not a scoring engine.

It may:

- select sections;
- format factual values;
- apply audience-specific language;
- choose an approved text template;
- suppress unavailable/unauthorized content;
- validate report invariants.

It may not:

- recompute score;
- recompute KPI;
- recompute economic results;
- infer new metrics;
- infer causality from rank/order alone.

## 14.4 Assessment-specific report configuration

The projection must contain explicit assessment-family report rules for:

- Patient Journey;
- Clinic Performance;
- Medical Team;
- Admin/Reception;
- Comprehensive Clinic.

Each report configuration defines:

- intended sections;
- eligible axis display;
- eligible KPI display;
- diagnostic categories;
- tone;
- EV availability;
- trend availability;
- allowed narrative claims.

No single generic template is allowed to silently define the semantics of all five assessments.

---

# 15. Report content rules

## 15.1 User report may contain

- overall score;
- performance band;
- relevant measured axes/components;
- supported KPI results;
- validated diagnostic findings;
- validated trend;
- supported economic output.

## 15.2 User report must not contain

- internal Trap mechanics;
- internal rule IDs;
- weights or formulas;
- invented metrics;
- unsupported causality;
- unsupported improvement percentages;
- fabricated benchmarks;
- unvalidated monetary figures;
- internal provenance details not intended for public display.

## 15.3 Admin report may additionally contain

- complete KPI state;
- consistency evidence;
- criticality state;
- coverage/missingness;
- calculation components required for audit;
- economic assumptions;
- provenance;
- data-integrity flags;
- historical/legacy source labels.

---

# 16. Report claim classification

Every generated narrative claim must be traceable to one of:

- **FACT** — directly present in Structured Result;
- **DERIVED** — deterministic presentation transformation explicitly allowed by contract;
- **INTERPRETATION** — approved narrative meaning tied to identified evidence;
- **UNAUTHORIZED** — not permitted;
- **DOCUMENTATION-ONLY** — historical/explanatory text not used to generate a factual result.

No report generator may emit an UNAUTHORIZED claim.

---

# 17. Weakest/strongest axis rule

The current UI identifies the weakest and strongest axes.

That ranking may remain a presentation calculation only when it does not alter official scoring and is used as a simple deterministic ordering.

However:

- weakest ≠ financial cause;
- weakest ≠ root cause;
- strongest ≠ guarantee;
- stronger score ≠ improvement without valid comparison.

Any causal statement requires an explicit diagnostic finding.

---

# 18. Trend rule

Trend output is allowed only when:

- same assessment family;
- versions explicitly declared comparable;
- scoring contract compatible;
- measured scope comparable;
- previous and current results are both authoritative.

Otherwise the report must not label the difference as:

- improvement;
- deterioration;
- performance change.

It may show a non-comparative historical value in admin/audit context if the audience model permits.

---

# 19. Economic Opportunity / EV

## 19.1 Canonical model

Retain the approved recursive referral economic model as the canonical economic calculation.

The model is independent of core scoring.

## 19.2 Canonical inputs

The current target model uses:

- average visit value;
- relationship years;
- referral percentage.

Visits are modeled as the fixed approved baseline:

**3 visits/year**

The referral input may be unavailable.

## 19.3 UI correction

The current UI language that says visits/month and multiplies by 12 is legacy behavior and must not remain part of the canonical model.

Update:

- field labels;
- examples;
- explanatory text;
- report text;
- units.

## 19.4 No core-score relationship

EV cannot modify:

- overall score;
- axis score;
- KPI;
- classification.

No financial result is presented as guaranteed revenue.

---

# 20. Assessment configuration and canonical weights

## 20.1 Weight target

Official assessment weight data must use:

**0–1 canonical values with sum 1.00**

Presentation may show percentages.

## 20.2 Implementation procedure

Before migration:

1. inventory all assessment versions;
2. capture stored weights;
3. calculate normalized equivalent;
4. compare expected mathematical result;
5. prove whether normalization currently masks a representation defect;
6. prepare a reversible migration;
7. verify published configuration after migration.

No weight change may be introduced merely because normalization is aesthetically cleaner.

---

# 21. Persistence and database changes

## 21.1 Existing persistence boundary

Reuse the current P4 completion architecture:

- preparation snapshot;
- submission fingerprint;
- completion RPC;
- idempotent completion;
- server-authoritative result persistence.

Do not create a second submission lifecycle.

## 21.2 `assessment_results`

Continue using:

`public.assessment_results`

as the canonical stored result.

The implementation must ensure the stored JSONB result contains the complete factual Structured Result needed for later report projection.

## 21.3 Schema changes

Before any migration:

- inspect the live schema;
- inspect migration history;
- inspect constraints;
- inspect RLS;
- inspect privileges;
- inspect SECURITY DEFINER functions;
- inspect triggers;
- inspect all read/write dependencies.

Only additive/reversible schema work may begin without a separate destructive decision.

---

# 22. Legacy paths

## 22.1 Browser engine

The old browser reference engine is historical/reference/test material only.

Remove all active HTML runtime references to `/engine/engine.js` once replacement verification proves they are dead.

Preserve Git history.

## 22.2 `score-engine-legacy.ts`

Do not use it as a runtime authority.

Do not delete it merely because it is old.

After the final engine passes parity/regression verification and all rollback requirements are satisfied, evaluate whether it can be removed from the active tree.

The preferred final product state is one active engine source, with Git history serving archival needs.

## 22.3 Legacy SQL `calculate_session_score(uuid)`

It remains non-authoritative.

Before removal, verify all references, grants, scheduled jobs, RPC callers, tests, and admin tools.

Only then classify:

- KEEP;
- QUARANTINE;
- REMOVE.

No deletion is justified solely by age.

---

# 23. Browser runtime changes

## 23.1 `assets/js/app.js`

Refactor result handling so the browser:

- does not score;
- does not recalculate KPI;
- does not calculate Leakage;
- does not calculate trend eligibility;
- does not derive financial outputs;
- renders the server-supplied report projection.

## 23.2 HTML assessment pages

Reuse the five existing pages.

Remove only obsolete result/rendering contracts.

Do not change protected question/answer content as part of this scoring/report correction.

## 23.3 Print/PDF

Printing must render the same validated user report projection.

It must not create a second print-specific calculation.

---

# 24. Admin reporting changes

## 24.1 `admin/assessment-manager.js`

Preserve the secure report-read path.

Replace:

- answer-metadata Trap detection;
- weakest-axis causal narrative;
- ad-hoc KPI assumptions.

Use the canonical Structured Result/report projection.

## 24.2 Historical records

Admin must label historical legacy records as historical.

It must not silently make legacy rows appear equivalent to current Structured Results.

---

# 25. Exact implementation sequence

## Step 0 — Contract lock

Create this contract and the supersession record on `main`.

No code implementation in this step.

## Step 1 — Baseline freeze

Capture:

- `main` SHA;
- live Edge Function version/digest;
- live assessment version state;
- relevant schema objects;
- no-session/no-result counts;
- current active runtime references.

Exit: reproducible starting point.

## Step 2 — Dependency graph

Map:

`HTML → app.js → assessment-access/index.ts → engine → calculation modules → DB RPCs`

and:

`Admin → report RPC → assessment_results → report projection`

Identify every current caller of:

- `score-engine.ts`;
- `engine.js`;
- `score-engine-legacy.ts`;
- `calculate_session_score`;
- Trap metadata;
- Leakage;
- KPI fallback;
- EV legacy path.

Exit: no unknown owner for an affected responsibility.

## Step 3 — Engine consolidation

Controlled move:

`score-engine.ts → engine.ts`

Keep `calculateAssessment` as the central entry function.

Update all imports and tests.

Remove duplicate responsibility from the integrated scorer so axis persistence is projected once.

Exit: exactly one active engine entrypoint.

## Step 4 — Result contract correction

Extend Structured Result to preserve the factual information required by persistence/reporting.

Remove `legacyProjection` as a factual parallel result source.

Compatibility response shaping, where temporarily necessary for old UI consumers, must be a pure projection from Structured Result.

Exit: no duplicate score authority.

## Step 5 — Interpretation routing correction

Make interpretation version explicit.

Reconcile registry status.

Make final V1 interpretation routing deterministic.

Exit: assessment version and interpretation version are independently controlled.

## Step 6 — Assessment V1 reconstruction

For each of the five families:

1. establish final V1 definition;
2. preserve approved visible question text;
3. preserve approved visible answer text;
4. attach approved interpretation;
5. attach axes and weights;
6. attach role mapping;
7. attach KPI eligibility/mapping;
8. attach consistency configuration;
9. attach economic configuration;
10. validate before publication.

Comprehensive Clinic and Patient Journey content may be sourced from the superseded V2 artifacts as approved/reference material, but those artifacts are not merged as V2 product identities.

Exit: five final V1 scoreable definitions pass configuration validation.

## Step 7 — Leakage removal

Remove Leakage from:

- Structured Result;
- response shaping;
- public UI;
- report copy;
- admin report metric sections.

Retain only historical/audit references.

Exit: zero runtime official Leakage metric.

## Step 8 — KPI/report projection

Implement one report projection boundary.

Implement five assessment-specific report policies.

Make KPI visibility state-driven.

Exit: every displayed metric/narrative is traceable to Structured Result and report policy.

## Step 9 — EV/UI correction

Keep the canonical economic calculation.

Remove monthly-visit semantics from the interactive report flow.

Exit: UI units match model.

## Step 10 — Browser/admin cleanup

Remove client-side scoring/report recomputation.

Remove obsolete Trap/Leakage rendering.

Remove dead engine.js runtime references.

Move admin report to Structured Result/Projection only.

Exit: no report-side authoritative calculations.

## Step 11 — Persistence/data migration

Only after application verification:

- migrate weights if required;
- migrate final assessment version routing;
- preserve session/result lineage;
- update stored provenance contract;
- remove obsolete version rows only after dependency proof.

Exit: live DB reflects final target with no unsafe data loss.

## Step 12 — Runtime cutover

Deploy only after pre-production tests pass.

Verify deployed Edge Function source and digest.

Verify live completion path.

Exit: runtime is executing final engine and report projection.

## Step 13 — Final verification

Run:

- source/static checks;
- unit tests;
- integrated engine tests;
- Structured Result tests;
- KPI coverage tests;
- report projection tests;
- report claim validation tests;
- persistence transaction tests;
- public realistic E2E;
- protected realistic E2E;
- repeat completion;
- concurrent/duplicate completion;
- security/RLS/grant verification;
- live runtime verification.

Exit: every acceptance invariant is evidenced.

## Step 14 — Closure

Update:

- implementation record;
- runtime/deployment record;
- test evidence;
- migration record;
- report integrity audit;
- superseded-artifact disposition.

Only then may the stage be declared CLOSED.

---

# 26. Required test matrix

At minimum:

### Engine
- all zero;
- all perfect;
- mixed;
- high/medium/low impact;
- each band boundary;
- missing required answer;
- duplicate answer;
- weight validation;
- interpretation-version routing;
- consistency detection without score effect;
- consistency detection with configured score effect;
- repeated consistency rule on same validator;
- no score stacking.

### Structured Result
- full provenance;
- exact axis raw/max/percentage semantics;
- KPI available/partial/unavailable;
- economic unavailable/available;
- diagnostics traceability;
- replay identity.

### Reports
- five assessment families;
- every eligible KPI;
- excluded KPI;
- partial KPI;
- missing coverage;
- weakest/strongest axis wording;
- no unsupported causality;
- no Leakage;
- no Trap internals for user;
- complete admin evidence;
- trend compatibility/incompatibility;
- EV units and assumptions.

### Persistence
- one result per session;
- result immutability after completion;
- idempotent retry;
- concurrent completion serialization;
- correct raw/max/percentage persistence;
- provenance persistence.

### Runtime/security
- anonymous public completion;
- protected completion;
- unauthorized result access rejected;
- direct table access remains closed where required;
- privileged RPC authorization verified.

---

# 27. Acceptance criteria

The implementation is accepted only when all are true:

1. exactly one active server scoring engine exists;
2. browser does not calculate official scores;
3. assessment version is pinned;
4. final published assessment identities are V1;
5. no V2 identity is exposed as the product definition;
6. interpretation routing is explicit;
7. consistency detection/effect are explicit;
8. old Trap metadata is not a result authority;
9. Leakage is absent as an official metric;
10. raw/max/percentage semantics are correct;
11. weights are canonical and valid;
12. unavailable roles are never imputed;
13. KPI state is explicit;
14. every report metric exists in Structured Result;
15. every report claim is policy-allowed and evidence-backed;
16. weakest-axis ranking does not become causal truth;
17. trend claims require compatibility;
18. EV uses the canonical economic model and correct units;
19. user and admin reports are different projections of the same factual result;
20. historical data is not silently rewritten;
21. no legacy function becomes a competing authority;
22. security boundaries remain server-side;
23. live runtime matches the committed implementation;
24. production behavior is verified, not inferred from code.

---

# 28. Rollback / recovery

Rollback must be staged.

### Application rollback
The previous deployed commit remains recoverable from Git history.

### Database rollback
Migrations must be:

- additive where practical;
- independently reversible where safe;
- executed only after pre-migration snapshots/checks.

### Assessment-version rollback
Do not rely on deleting/restoring published versions blindly.

Before final version disposal, verify that no session/result depends on the target rows.

### Result rollback
Never delete valid completed results merely to make a new implementation pass.

---

# 29. Explicit exclusions

This contract does not authorize:

- unrelated Admin editor redesign;
- new assessment families;
- new AI authority;
- product-wide commercialization changes;
- new external dependencies;
- generic multi-tenant redesign;
- content rewriting beyond already-approved correction;
- new semantic engine versions;
- background jobs unrelated to this scope.

---

# 30. Owner review boundary after implementation

The owner may change any product/methodology decision after reviewing:

- numeric outputs;
- report language;
- KPI availability;
- consistency findings;
- EV behavior;
- user experience.

When such a change occurs:

**new owner decision → impact analysis → contract amendment → implementation**

No silent post-result change is permitted.

---

# 31. Final contract status

**Previous implementation plan:** STOPPED / SUPERSEDED  
**Final Change Set:** OWNER APPROVED  
**Implementation contract:** IMPLEMENTATION-READY  
**Code implementation:** NOT STARTED  
**Database mutation for this new plan:** NOT STARTED  
**Deployment for this new plan:** NOT STARTED  
**Runtime verification of the new plan:** NOT STARTED

The next canonical action is **implementation execution against this contract**, after the owner explicitly authorizes execution if separate implementation authorization is required.


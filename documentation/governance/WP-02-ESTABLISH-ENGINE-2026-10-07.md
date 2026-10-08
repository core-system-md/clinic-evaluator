# WP-02 — Establish Canonical `engine.ts`
## 2026-10-07

**Work package:** WP-02 — Establish `engine.ts`  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Branch:** `wp-02/establish-engine-ts-2026-10-07`  
**Status:** PASS — STAGE CLOSED / READY FOR MAIN  
**Stage publication:** YES — merge to `main` after this verification record  
**Production deployment:** NO — production cutover belongs to the final integrated release gate

---

## 1. Scope executed

WP-02 was executed from the reconciled WP-01 inventory only.

The existing authoritative server calculation implementation was consolidated into:

`supabase/functions/assessment-access/engine.ts`

No second scoring kernel was created.

The previous file:

`supabase/functions/assessment-access/score-engine.ts`

was removed from this implementation branch and is preserved only through Git history/reference paths.

---

## 2. Canonical ownership

The canonical engine exposes the existing completion-facing function shape:

`calculateAssessment(client, input)`

The runtime completion entrypoint imports:

`./engine.ts`

The engine owns the calculation boundary and returns the Structured Result plus persistence-ready score rows and provenance.

The former `legacyProjection` parallel factual result was removed from the engine return type.

Legacy-compatible response fields are projected in `assessment-access/index.ts` directly from the Structured Result.

---

## 3. Engine identity

The canonical technical identity is:

`MD_CODE_ASSESSMENT_ENGINE`

No Engine V2/V3 semantic ladder was introduced.

The compatibility database field `scoring_engine_version` receives the same technical identity through the engine provenance path.

The Structured Result provenance is also aligned to this identity.

---

## 4. Explicit interpretation binding

WP-02 removes the previous implicit rule:

`interpretationVersion = assessmentVersion`

The engine now resolves an explicit assessment-version → interpretation-version binding.

Current staged bindings:

| Assessment | Assessment version | Interpretation source | Interpretation version |
|---|---:|---|---:|
| Admin & Reception | 1 | registry v1 | 1 |
| Clinic Performance | 1 | registry v1 | 1 |
| Comprehensive Clinic | 1 | registry v1 | 1 |
| Comprehensive Clinic | 2 | registry v2 | 2 |
| Medical Team | 1 | registry v1 | 1 |
| Patient Journey | 1 | registry v1 | 1 |

This table is a runtime staging map. Final V1 reconstruction remains governed by the later version-reset package and is not performed in WP-02.

---

## 5. Reused calculation modules

The engine reuses the existing internal modules:

- response interpretation;
- profile/component aggregation;
- consistency;
- coverage/criticality;
- economic model;
- Structured Result assembly.

These remain internal implementation modules and do not become competing official engine identities.

---

## 6. Consistency behavior

The existing explicit consistency rule/pair machinery remains the configured internal mechanism.

No generic Trap penalty was introduced.

Structured Result receives consistency evidence and score effects produced by configured relationship rules.

User-facing production response remains free of rule IDs and internal consistency mechanics.

---

## 7. Leakage

WP-02 does not add or preserve Leakage as a factual engine output.

No `100 - overallScore` calculation was introduced by this work package.

Browser/report cleanup that is intentionally outside the WP-02 ownership boundary remains for its dedicated later work packages.

---

## 8. Dedicated WP-02 local contract test environment

A dedicated final-contract harness was added:

`tests/wp-02-contract-local.test.mjs`

and executed through:

`.github/workflows/wp-02-local-contract.yml`

The harness verifies only WP-02 responsibilities and does not import later-stage acceptance criteria.

It covers:

- canonical `engine.ts` ownership;
- absence of `score-engine.ts` as an executable official engine path;
- reference-only classification of `score-engine-legacy.ts`;
- explicit interpretation bindings for the current published fixture families;
- deterministic Structured Result construction;
- required Structured Result/provenance fields;
- absence of `legacyProjection`;
- absence of `leakageIndex` and the historical Leakage formula from the canonical engine;
- browser code not invoking the server engine directly as its scoring implementation.

A first draft of the harness overreached into WP-09 by treating legacy HTML script references as a WP-02 failure. That test was corrected so WP-02 validates scoring authority rather than prematurely performing old-browser-path removal.

---

## 9. Verification evidence

Latest WP-02 branch commit:

`497f35f164025e312eb2081bf79fd37c482c7fb1`

Dedicated local-contract workflow:

**Run 37735469115 — SUCCESS**

Its WP-02 harness, scoring regression, and browser syntax guard completed successfully.

P3 kernel verification for the same commit:

**Run 37735469187**

- P3 isolated kernel: **SUCCESS**
- P4 protected completion disposable-PostgreSQL verification: **SUCCESS**
- Browser runtime syntax: **SUCCESS**
- Full Node baseline: **FAIL**, limited to unrelated pre-existing P5 editor-workspace assertions.

The unrelated baseline failures are:

- inline EV creation missing;
- Draft action branch missing;
- stop-public family-id call missing;
- public back-navigation guard missing.

They are not WP-02 acceptance failures and are not imported into WP-02.

---

## 10. Stage decision

WP-02 acceptance criteria defined by the final contract are satisfied at the implementation/test level.

There is no demonstrated dependency on WP-03 or later work that prevents WP-02 from being published to `main`.

Therefore:

**WP-02 = PASS**

**WP-02 = STAGE CLOSED**

The stage is published to `main` by merging this branch.

This is a source-stage publication only. It does not imply production Edge Function deployment. The current production Edge Function remains on the old deployed artifact until the final integrated release gate.

---

## 11. Production boundary

Live production was not mutated by WP-02.

The production Edge Function remains the existing deployed artifact until final release.

No production database migration, assessment-version rewrite, or Edge Function cutover was performed as part of this stage.

---

## 12. Next canonical action

After WP-02 is merged into `main`, the next work package is:

**WP-03 — Correct configuration semantics**

WP-03 must start from the new `main` state produced by the successful WP-02 stage and continue with the same independent local contract-test → verify → publish-to-main → close discipline.

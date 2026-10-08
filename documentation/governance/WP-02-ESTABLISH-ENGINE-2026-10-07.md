# WP-02 — Establish Canonical `engine.ts`
## 2026-10-07

**Work package:** WP-02 — Establish `engine.ts`  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Branch:** `wp-02/establish-engine-ts-2026-10-07`  
**Status:** IMPLEMENTED — CODE/CI VERIFICATION PASSED; PRODUCTION CUTOVER DEFERRED  
**Production mutation:** NO  
**Production deployment:** NO

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

The canonical engine now exposes the existing completion-facing function shape:

`calculateAssessment(client, input)`

The runtime completion entrypoint imports:

`./engine.ts`

The engine owns the calculation boundary and returns the Structured Result plus persistence-ready score rows and provenance.

The former `legacyProjection` parallel factual result was removed from the engine return type.

Legacy-compatible response fields are now projected in `assessment-access/index.ts` directly from the Structured Result.

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

This table is intentionally a runtime staging map. The final Comprehensive V1 correction and any Patient Journey corrected-definition reset remain governed by WP-03/WP-08 and must not be inferred early.

---

## 5. Reused calculation modules

The engine reuses the existing internal modules:

- response interpretation;
- profile/component aggregation;
- consistency;
- coverage/criticality;
- economic model;
- Structured Result assembly.

These modules remain internal implementation modules. They do not become competing official engine identities.

---

## 6. Consistency behavior

The existing explicit consistency rule/pair machinery remains the configured internal mechanism.

No generic Trap penalty was introduced.

Structured Result receives the resulting consistency evidence and score effect produced by the configured relationship rules.

User-facing production response remains free of rule IDs and internal consistency mechanics.

---

## 7. Leakage

WP-02 does not add or preserve Leakage as a factual engine output.

No `100 - overallScore` calculation was introduced by this work package.

The remaining report/browser cleanup is a later contract work package and remains open until WP-05–WP-07/WP-09 verification.

---

## 8. Static/source verification performed

Verified on the WP-02 branch:

- `engine.ts` exists.
- `score-engine.ts` is absent from the WP-02 branch.
- `score-engine-legacy.ts` remains present only as historical/reference material and is not the completion import.
- `assessment-access/index.ts` imports `./engine.ts`.
- `legacyProjection` is absent from the canonical engine and completion path.
- explicit interpretation binding exists.
- Structured Result engine provenance uses `MD_CODE_ASSESSMENT_ENGINE`.
- the engine no longer emits the old P3 production identity strings.
- test fixtures were updated to pass interpretation version explicitly.

GitHub compare confirms the engine change is a rename/refactor of the former scorer rather than a new second kernel.

---

## 9. Production verification boundary

Live Supabase was re-read after the code changes.

Current production remains:

- Edge Function: `assessment-access`
- status: ACTIVE
- deployed version: 32
- deployed source digest: `950467bed27b99961ea46177e654be2cacacf4f867ad884549de9d7dc0198edb`

The live function still imports `./score-engine.ts`.

Therefore:

**WP-02 has not been deployed to production.**

No production database mutation was made.

---

## 10. Verification checkpoint

The WP-02 branch was verified through GitHub Actions run `37734003629` after the WP-02 fixture correction.

Verified successfully:

- P3 isolated kernel + ownership + production-contract + parity tests: **SUCCESS**.
- P4 protected completion disposable-PostgreSQL verification: **SUCCESS**.
- Browser runtime syntax check: **SUCCESS**.

The P3 isolated run completed with the full selected kernel/ownership/contract/parity set passing.

The repository-wide Node baseline remains **RED** on four pre-existing P5 editor-workspace assertions:

- inline EV creation missing;
- Draft action branch missing;
- stop-public family-id call missing;
- public back-navigation guard missing.

These failures are outside WP-02 and are not to be fixed by importing later WP work into this branch.

A direct local execution from the current assistant runtime was not possible because the execution container has no outbound GitHub network access; therefore the GitHub-hosted execution above is recorded as CI verification evidence, not mislabeled as local execution.

Production deployment remains intentionally deferred. No Supabase production mutation or Edge Function cutover was performed.

### Remaining verification boundary

Before production release, the integrated release point must additionally verify the deployed artifact against the tested source and perform runtime Edge Function verification. This is deliberately deferred until the contract sequence reaches the appropriate integrated release gate.

---

## 11. Material follow-up risks for the next work packages

### Interpretation registry status

The packaged V1 registry currently declares an implementation-authoritative/non-production status. WP-03 must reconcile its actual authority/status before production cutover.

### Version reset

The explicit Comprehensive V1 and Patient Journey final-definition resets must be handled in WP-08 after dependency verification. WP-02 deliberately does not rewrite or delete live assessment identities.

### Historical engine reference

`score-engine-legacy.ts` remains during the staged implementation and is not an official production entrypoint. Its final disposition belongs to WP-09 after static dependency verification.

---

## 12. Next canonical action

After review of this WP-02 evidence, the next contract work package is:

**WP-03 — Correct configuration semantics**

No production deployment is authorized merely by completion of this branch.

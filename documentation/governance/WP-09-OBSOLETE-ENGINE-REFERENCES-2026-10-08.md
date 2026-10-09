# WP-09 — Obsolete Engine / Runtime References
## 2026-10-08

**Repository:** `core-system-md/clinic-evaluator`  
**Scope:** Remove obsolete executable/runtime references to the superseded browser engine path while preserving explicitly classified historical/reference material.

## Contract boundary

The governing Final Implementation Contract defines WP-09 as:

- search every HTML/JS/import/test reference to old engine paths;
- remove dead production references;
- retain only explicitly classified historical/reference fixtures;
- do not recreate `/engine/engine.js`;
- do not turn the legacy scorer into a runtime authority.

The contract separately states that `score-engine-legacy.ts` must not be deleted merely because it is old. Its removal is a later evaluation after parity/regression and rollback requirements are satisfied.

## Verified pre-change state

On `main` commit `4623494b581ed77bf59daf165bd35650960dd9aa`:

- all five assessment HTML pages contained `<script src="/engine/engine.js"></script>`;
- `engine/engine.js` did not exist in the repository;
- `supabase/functions/assessment-access/index.ts` already imported the canonical `./engine.ts`;
- no active runtime import of `score-engine-legacy.ts` was identified;
- `score-engine-legacy.ts` remained only as compatibility/reference material and is not the authoritative engine.

## Implementation

Removed the stale browser engine script reference from:

1. `patient-journey.html`
2. `clinic-performance.html`
3. `medical-team-assessment.html`
4. `admin-reception-assessment.html`
5. `comprehensive-clinic-assessment.html`

Added:

- `tests/wp-09-obsolete-engine-references.test.mjs`
- `.github/workflows/wp-09-obsolete-engine-references.yml`

The dedicated test proves:

- no assessment HTML page references `/engine/engine.js`;
- no assessment HTML page references `AssessmentEngine`;
- the removed browser engine file is absent;
- `assessment-access/index.ts` imports only `./engine.ts`;
- active runtime source contains no obsolete `score-engine*.ts` import;
- the preserved legacy scorer is explicitly marked reference-only.

## Explicit non-actions

WP-09 does **not**:

- delete `supabase/functions/assessment-access/score-engine-legacy.ts`;
- remove the non-authoritative SQL `calculate_session_score(uuid)`;
- modify Supabase Production;
- deploy the Edge Function;
- alter assessment content/version routing;
- modify report/EV/scoring semantics belonging to later packages.

These remain separate contract boundaries.

## Verification

**Status:** PASS — DEDICATED CI VERIFIED.

Required command:

`node --test tests/wp-09-obsolete-engine-references.test.mjs`

CI workflow:

`.github/workflows/wp-09-obsolete-engine-references.yml`

## Production boundary

No production database mutation.  
No production Edge Function deployment.

## Verification result

Dedicated GitHub Actions run **37762105060** completed successfully.

Job **113260773915**:
- checkout: SUCCESS
- Node 22 setup: SUCCESS
- `npm ci`: SUCCESS
- `node --test tests/wp-09-obsolete-engine-references.test.mjs`: SUCCESS

The dedicated WP-09 contract test therefore passed on head:

`2771467bd6c181a1e618df0a45b37a9d267811d8`

## Production boundary

No production database mutation.  
No production Edge Function deployment.

## Stage decision

**WP-09 = PASS**  
**WP-09 = STAGE CLOSED**  
**WP-09 = IMPLEMENTED / VERIFIED / DOCUMENTED**

Final publication/merge to `main` remains the publication step for this stage; no WP-10 implementation is included.


## Follow-up — legacy parity fixture ownership, 2026-10-09

The historical WP-09 implementation correctly retained the legacy implementation at that time. The focused functional-ownership remediation moves its exact source to `tests/reference/score-engine-legacy.ts`; the copy under `supabase/functions/assessment-access/` is removed. `tests/server-scoring-parity.test.js` continues to execute the reference implementation, preserving the parity check without keeping a second implementation in the Edge Function source tree.

This follow-up does not deploy an Edge Function or mutate Production. The updated ownership and WP-09 tests are the verification boundary; status remains NOT VERIFIED until CI succeeds.

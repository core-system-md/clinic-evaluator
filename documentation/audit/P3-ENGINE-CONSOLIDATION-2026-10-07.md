# P3 — Authoritative Engine Consolidation & Legacy Path Disposition
## 2026-10-07

**Status:** CLOSED / DEPLOYED / RE-VERIFIED 2026-10-07

Repository: `core-system-md/clinic-evaluator`
Branch: `fix/p3-unify-authoritative-engine-2026-10-07`
Base: `1687d61bdf02a5158766e8fe895ded4782bb2a0e`

### 1. Verified contract basis

P3 requires one authoritative server scoring implementation and requires every legacy calculation path to have an explicit disposition. The owner-approved model also requires versioned interpretation/configuration, structured result provenance, and no assessment-specific scoring engine.

### 2. Authoritative engine correction

The production scoring entrypoint is now:

`assessment-access/index.ts` → `score-engine.ts`

`score-engine.ts` contains the former production P3 runtime composition and exports `calculateAssessment`. Its calculation stages remain composed from the reusable P3 modules and versioned registries.

No assessment family is hard-coded as a separate scoring engine.

### 3. Legacy implementation disposition

The previous implementation that occupied `score-engine.ts` was preserved unchanged as:

`score-engine-legacy.ts`

It exports `calculateLegacyAssessment` and is explicitly marked compatibility/reference-only. It is not imported by the production entrypoint.

The obsolete `scoring.ts` adapter was verified unused and retired because it referenced the nonexistent `complete_assessment_with_server_scoring` RPC.

The database function `public.calculate_session_score(uuid)` remains non-authoritative and restricted to `service_role`; no production completion path uses it. It is retained as a compatibility/legacy database path and is not an official scoring authority.

The browser scoring implementation remains reference/test material only.

### 4. Version routing correction retained

The production engine continues to pass the pinned assessment interpretation version into the scorer. Version-specific interpretation registry selection and the matching configuration digest remain aligned.

### 5. Content and methodology boundary

No question text, option text, assessment weights, or approved P3 scoring semantics were changed by this consolidation.

### 6. Verification correction\n\nThe first CI run exposed that the canonical consistency-pair artifact still reflected its pre-v2 empty state while the implementation registry carried the approved v2 relationships. The canonical artifact was synchronized to the implementation-authoritative 52-pair set before the next verification run.\n\n### 7. Verification and deployment

P3 isolated kernel, engine ownership, production contract, parity, and P4 protected-completion checks passed on the merged PR. The repository full Node baseline audit still reports four pre-existing P5 editor-workspace assertions; those are outside this P3 correction and remain explicitly reported, not masked.

PR #53 was merged to `main` at `2c8341f6199e4c2f00a1c18946f401d9b8c6a800`.

Supabase `assessment-access` was deployed as version **32** with `verify_jwt=false`. Deployment SHA256: `950467bed27b99961ea46177e654be2cacacf4f867ad884549de9d7dc0198edb`.

Live source was re-read after deployment and verified to route production completion through `./score-engine.ts` → `calculateAssessment`. The legacy scorer is not the production entrypoint, and the removed P3 production adapter is absent from the deployed function source.

A read-only database verification confirmed the published assessment-version state remained unchanged; no production assessment content or result data was modified by this consolidation.

### 8. Closure boundary

The repair must pass:
- engine-ownership regression test;
- legacy browser-parity test against the explicitly named compatibility scorer;
- P3 production contract suite;
- existing P3/version-routing CI;
- repository checks for absence of the retired adapter from the production path.

Production deployment must be verified after the repair branch is merged/approved; this record does not claim live deployment from this branch.

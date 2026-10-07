# P3 — Authoritative Engine Consolidation & Legacy Path Disposition
## 2026-10-07

**Status:** IMPLEMENTED IN REPAIR BRANCH — VERIFICATION PENDING

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

### 6. Verification required

The repair must pass:
- engine-ownership regression test;
- legacy browser-parity test against the explicitly named compatibility scorer;
- P3 production contract suite;
- existing P3/version-routing CI;
- repository checks for absence of the retired adapter from the production path.

Production deployment must be verified after the repair branch is merged/approved; this record does not claim live deployment from this branch.

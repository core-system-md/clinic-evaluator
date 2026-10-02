# P3 — Implementation-Ready Record
## 2026-10-02

**Status:** IMPLEMENTATION-READY  
**Scope:** pre-production readiness only  
**Production activation:** not authorized by this record  
**Canonical design/status document:** `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`

## 1. Gate result

Gate A — documentation/source reconciliation: **CLOSED**.  
Gate B — methodology decisions: **CLOSED**.  
Gate C — historical/data reconciliation: **CLOSED**.  
Gate D — integrated P3 design: **CLOSED**.  
Gate E — pre-implementation verification: **CLOSED**.  
Gate F — Implementation-Ready review: **CLOSED**.

Therefore the P3 project state is:

**P3 — IMPLEMENTATION-READY**

This means the agreed P3 design, implementation boundary, verification package, persistence/provenance contract, migration/rollback approach, and production-boundary requirements are sufficiently defined to begin implementation after explicit owner approval.

## 2. Canonical execution path

The single non-production integration entry is:

`p3-integrated-scorer-v1.mts`

Canonical flow:

`selected option identity
→ response interpretation
→ measurement
→ component/profile aggregation
→ axis scores
→ approved overallScore
→ consistency
→ criticality/coverage
→ roles/KPIs
→ economics
→ Structured Result`

No second P3 scoring kernel remains on the integration branch.

The superseded `p3-score-engine.mts` duplicate was removed from the integration branch. Production `score-engine.ts` remains untouched.

## 3. Frozen methodology

The following are closed and must not be changed during implementation:

- `raw_score` is earned raw points before normalization.
- Canonical axis weights are 0–1 and sum to 1.00.
- Impact baseline is High=1.5, Medium=1.0, Low=0.5.
- No internal rounding.
- Missing/unavailable is not zero.
- No role imputation.
- Q1–Q4 are performance bands, not statistical quartiles.
- Consistency is analytical in V1 and has scoreEffect=NONE.
- Criticality is separate from score and never inferred from axis name or low score.
- Economics is separate from `overallScore`.
- `overallScore` is the existing product score concept and is computed from valid measured axes using the existing canonical weights; unavailable axes are excluded from numerator and denominator.
- No component weights, consistency penalty, criticality penalty, zero-fill, or imputation are permitted.

## 4. Configuration authority

The P3 response interpretation registry is frozen at:

- 93 questions
- 305 options
- unique option IDs
- one axis assignment per question
- no pending scale identifiers
- numeric freeze: `frozen-by-owner-scale-rule; no-global-remap`

The five published families and axis weight sets are represented by the deterministic fixture:

`tests/fixtures/p3-current-published-config-v1.json`

The fixture is based on verified live published configuration and is a verification artifact, not production configuration.

## 5. Verification evidence

Hosted GitHub Actions run **37020179328** passed:

- **P3 isolated kernel:** success
- **Full Node test suite (baseline audit):** success

The integrated suite covers:

- all five published families through one path;
- unavailable-axis exclusion without zero-fill;
- role/KPI partial and unavailable semantics;
- RRI scope;
- economics blank/0%/20%/50%/invalid cases;
- economics independence from overallScore;
- consistency as a non-penalty analytical signal;
- criticality as a separate non-numeric signal;
- unknown question/option rejection;
- Structured Result provenance and pinned identity.

Existing contract suites also pass:

- `tests/p3-gate-e-contract.test.mjs`: 11/11 locally;
- `tests/p3-overall-score-projection.test.mjs`: 5/5 locally.

Current-family live configuration was verified read-only at 93 questions / 22 axes / 305 options, with each family's axis weights summing to 1.00 within numeric precision tolerance.

## 6. Historical boundary

Historical reconciliation remains unchanged:

- fully replayable current sessions are suitable for shadow replay;
- sessions without reliable answer-level evidence remain legacy;
- sessionless legacy answers/scores are not attached by inference;
- no historical overwrite or deletion is part of P3 implementation readiness.

Deterministic shadow replay evidence exists for the current replayable Admin/Reception and Patient Journey sessions and is explicitly not an equivalence proof against the legacy score.

## 7. Persistence/provenance contract

The future additive production schema is defined as:

Session fields:
- `interpretation_version integer`
- `scoring_contract_version text`
- `assessment_config_digest text`

Structured result table:
- `public.assessment_results`
- one row per session via unique `session_id`
- pinned assessment/version identity
- interpretation/scoring/config provenance
- calculation timestamp
- result status
- Structured Result JSON

Current production verification confirms the existing `sessions` types and the absence of these P3 fields/table.

The migration is additive and must not backfill interpretation versions where the producing interpretation cannot be proven.

## 8. Security and production boundary

Current production verification confirms:

- `anon/public` have no table-level SELECT/INSERT privilege on `sessions`, `answers`, or `scores`;
- `authenticated` retains authorized SELECT access to existing answer/score surfaces;
- current public/anon RLS policies on legacy tables remain a known hygiene item but do not create direct table privileges;
- browser code is not the official score authority;
- P3 result persistence must remain server-authoritative;
- the future `assessment_results` table must use explicit RLS and explicit grant control rather than relying on platform defaults.

The P3 implementation must not depend on the upcoming platform-wide Data API default change. Table exposure must be explicit in the migration.

## 9. Migration and rollback

Migration approach:

A. Additive schema only.  
B. Shadow/dual calculation for new sessions.  
C. Controlled P3 production cutover only after deployment-stage acceptance.  
D. Historical behavior remains unchanged unless separately approved.

Rollback is runtime routing rollback:

- route completion back to legacy scorer;
- preserve P3 result rows;
- preserve provenance;
- do not drop the additive schema;
- do not rewrite legacy history.

Transactional persistence tests, production adapter tests, cutover tests, rollback exercises, and post-cutover verification remain deployment-stage acceptance criteria. Their deferred state is not an unresolved design decision.

## 10. Explicitly excluded from Implementation-Ready completion

The following have not occurred and must not be inferred from this gate:

- no production Edge Function deployment;
- no production schema migration;
- no public P3 cutover;
- no historical rewrite;
- no deletion of legacy records;
- no change to published question/option semantics;
- no change to the live legacy scorer.

## 11. Owner approval boundary

This record closes the design/readiness process only.

**Next authorized state:** owner approval may authorize Implementation.

Until that explicit approval is given, the production scorer, production schema, and public completion path remain unchanged.

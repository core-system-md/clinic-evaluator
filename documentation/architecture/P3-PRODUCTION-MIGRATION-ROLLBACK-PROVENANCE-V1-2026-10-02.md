> **P3 DOCUMENT STATUS:** Supporting design/evidence record. This document is **not the canonical P3 stage-status authority**. For the current reconciled state, open `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`. Historical/closure wording in this document must be interpreted through that canonical record.

# P3 — Production Migration / Rollback / Provenance V1
## 2026-10-02

**Status:** implementation-authoritative design; non-production.

## 1. Objective

Define the smallest additive production change required to activate P3 without redefining historical data or creating a hidden second scoring path.

## 2. Provenance requirements

For every newly completed P3 session/result, the persisted provenance must include:

- `assessment_type_id`
- `assessment_version`
- `interpretation_version`
- `scoring_engine_version`
- `scoring_contract_version`
- `assessment_config_digest`
- `calculation_timestamp`
- input lineage / answer source

### Historical rule

Existing legacy sessions may keep:
- `assessment_version`
- `scoring_engine_version`

but **must not be backfilled with `interpretation_version=1`** unless that version can be proven to be the interpretation that produced the historical result. A nullable interpretation field is therefore required during migration.

## 3. Persistence design

The production migration should be additive:

### A. Session provenance columns

Add nullable fields to `public.sessions`:

- `interpretation_version integer`
- `scoring_contract_version text`
- `assessment_config_digest text`

New P3 completions populate these fields.
Existing legacy rows remain unchanged/null where evidence is absent.

### B. Structured Result store

Add a dedicated result table, provisionally:

`public.assessment_results`

Minimum fields:

- `id uuid primary key`
- `session_id uuid unique references sessions(id)`
- `assessment_type_id uuid`
- `assessment_version integer`
- `interpretation_version integer`
- `scoring_engine_version text`
- `scoring_contract_version text`
- `assessment_config_digest text`
- `calculated_at timestamptz`
- `result_status text`
- `result jsonb`
- `created_at timestamptz`

The result row is the persisted P3 Structured Result; `scores` remains the legacy compatibility surface during migration and is not silently reinterpreted.

## 4. Write policy

P3 production completion should:

1. validate session-pinned assessment version;
2. resolve stored answer option identities against that exact version;
3. resolve interpretation version;
4. calculate the P3 Structured Result;
5. persist provenance + result atomically;
6. preserve legacy result data until the historical/display migration decision is explicit.

No client/browser code may become a scoring authority.

## 5. Migration strategy

### Phase A — additive schema
Create the new columns/table and access controls only.

### Phase B — shadow/dual calculation
For newly completed sessions, calculate P3 in shadow mode while keeping legacy result persistence unchanged.

Store P3 result separately; do not replace legacy values yet.

### Phase C — production cutover
After deterministic, current-data, and shadow evidence gates pass, route official completion scoring to P3 V1.

At cutover:
- `sessions.scoring_engine_version = P3_SCORER_V1`
- `sessions.interpretation_version = 1`
- `sessions.scoring_contract_version = P3_AGGREGATION_V1`
- `sessions.assessment_config_digest = deterministic digest of the exact assessment/interpretation configuration used`

### Phase D — historical policy
Handle old sessions according to the already-frozen reconciliation policy:
- replayable → P3 shadow only first;
- incomplete → preserve legacy;
- unreconstructable → preserve audit record;
- no automatic overwrite.

## 6. Rollback strategy

Rollback is primarily a **runtime routing rollback**, not destructive schema rollback.

If P3 production verification fails:

1. route completion back to the legacy `calculateAssessment` path;
2. continue serving already stored P3 result rows as non-legacy/versioned artifacts;
3. do not delete P3 results;
4. do not rewrite legacy history;
5. retain provenance showing which engine produced each result.

Schema rollback should not drop data merely to disable the runtime path. Additive schema remains until a separately approved cleanup.

## 7. Required gates before production

- all P3 contract tests green;
- shadow replay evidence green;
- current-data source limitations documented;
- migration SQL reviewed against actual schema;
- RLS/access policy verified;
- structured-result persistence tested transactionally;
- session provenance persistence tested;
- rollback routing tested;
- production adapter tested against all five assessment families;
- owner decision on historical presentation/compatibility behavior recorded.

## 8. Explicit non-goals

This document does not:
- create or apply the production migration;
- change production scorer routing;
- backfill historical interpretation versions;
- rewrite legacy scores;
- decide a historical display policy;
- enable P3 in the public completion path.

## 9. Migration-file discipline

When schema work is authorized, generate the migration through the Supabase CLI migration workflow rather than inventing a migration filename here. Review the generated diff, run security/performance advisors, verify migration history, then execute the controlled deployment.


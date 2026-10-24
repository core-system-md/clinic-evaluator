# D-14 — Production Migration Impact Inventory and Forward-Only Repair Design

**Date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Scope:** Read-only inventory of the three Production migrations applied on 2026-10-09 without the owner's approval, followed by repair design only.  
**Status:** Inventory evidence collected; one concrete compatibility defect routed to C-02. No Production mutation performed.

## Executive result

The live migration ledger confirms all three versions are applied, in order:

1. `20261009164918 / canonical_axis_weights`
2. `20261009164951 / structured_result_authority`
3. `20261009170228 / reconstruct_final_assessment_versions`

The live schema and content match the main intended postconditions of the first and third migrations: the current assessment versions are published V1 records, family pointers target the current records, and every current assessment's axis weights sum to 100 percentage points. The two Structured Result RPCs introduced by the second migration exist and are granted to `service_role`; the deployed `assessment-access` Edge Function is version 35 and imports `engine.ts` and calls the `*_from_result` RPCs. No current API-name mismatch was found in this inspection.

One concrete cross-migration contract defect remains: the reconstructed assessment content contains 57 options with value 70, while the live `answers_answer_value_compat_check` permits only `0, 1, 2, 3, 4, 5, 40, 100`. The existing answer-save function writes `options.option_value` into both `answers.option_value` and `answers.answer_value`. A choice of 70 therefore fails the current `answers.answer_value` CHECK constraint. This is the already-planned C-02 fix; it is not implemented by D-14.

## Evidence and boundaries

### 1. Migration ledger and source

The Supabase migration ledger returned all three migration versions as applied. The exact source files are on `main`:

- [20261009164918_canonical_axis_weights.sql](https://github.com/core-system-md/clinic-evaluator/blob/main/supabase/migrations/20261009164918_canonical_axis_weights.sql)
- [20261009164951_structured_result_authority.sql](https://github.com/core-system-md/clinic-evaluator/blob/main/supabase/migrations/20261009164951_structured_result_authority.sql)
- [20261009170228_reconstruct_final_assessment_versions.sql](https://github.com/core-system-md/clinic-evaluator/blob/main/supabase/migrations/20261009170228_reconstruct_final_assessment_versions.sql)

This is read-only inspection. No migration was applied, replayed, reverted, or edited.

### 2. Migration-by-migration impact

#### A. `20261009164918_canonical_axis_weights`

**Source behavior**
- Replaces `public.p2_assert_draft_version()` to permit the narrowly scoped, transaction-local canonical weight conversion while retaining published-structure guards.
- Checks that the three targeted V1 families' axis weights sum to 1 before conversion.
- Converts the 12 targeted axis rows from fractional weights to percentage points by multiplying by 100.
- Asserts the target totals equal 100 and that 12 rows were normalized.

**Current live observations**
- `clinic-performance`: 3 axes, total weight 100.
- `medical-team-assessment`: 4 axes, total weight 100.
- Patient Journey's former V1 identity was later removed and rebuilt by migration C below; current `patient-journey-v1-final`: 5 axes, total weight 100.
- The other current assessment records also total 100.

**Assessment**
- Current weight representation is consistent with the 0–100 contract.
- No forward repair to weights is indicated by this inventory.
- The original Patient Journey row targeted by this migration no longer exists because migration C replaced its identity; current-state checks are against the replacement record, not the deleted row.

#### B. `20261009164951_structured_result_authority`

**Source behavior**
- Replaces `complete_p4_public_assessment_from_result(...)` and `complete_p4_assessment_from_result(...)`.
- Validates the structured result identity, provenance, shape, axis uniqueness, and measured-axis ranges.
- Persists legacy score rows as projections of the supplied structured result, inserts `assessment_results`, and updates the lead/session/access state; the protected path also increments assessment-user usage.
- Deletes existing `scores` for the session before inserting the structured-result projection.
- Revokes execution from `PUBLIC`, `anon`, and `authenticated`, and grants execution to `service_role`.

**Current live observations**
- Both `*_from_result` functions exist; their current ACLs show execution for `postgres` and `service_role`, not `anon` or `authenticated`.
- The older `complete_p4_public_assessment_session(...)` and `complete_p4_assessment_session(...)` functions also remain present; this migration did not drop them.
- Deployed Edge Function `assessment-access` is version 35. Its source imports `./engine.ts` and calls `complete_p4_assessment_from_result` / `complete_p4_public_assessment_from_result`.
- Therefore this inspection found no current Edge Function/RPC-name mismatch. It does not constitute an end-to-end submission test.

**Assessment**
- No additional compensating change is supported by the observed function/API state.
- Keep the old RPCs' retirement decision separate; do not remove them as part of D-14.

#### C. `20261009170228_reconstruct_final_assessment_versions`

**Source behavior**
- Runs in one transaction and checks that each of three old assessment-type IDs has no sessions, linked answers, assessment results, leads, access grants, historical snapshots, assets, or non-`TRAP_*` insight mappings.
- Clears affected family pointers, disables user triggers on the reconstruction tables, removes the old options/questions/axes/traps/insight mappings/assets and three old assessment-type identities, then reconstructs final V1 content from approved source payloads.
- Removes the obsolete Comprehensive V2 product identity, points each family to its reconstructed current V1, validates the two current V1 family records, and restores triggers before commit.
- The old IDs correspond to Comprehensive V1, Comprehensive V2, and Patient Journey V1. The WP-08 harness and governance record document these identities and the approved content contracts.

**Current live observations**
- The three old IDs are absent.
- Both family pointers match the current published V1 records.
- Current reconstructed records:
  - Comprehensive Clinic: `comprehensive-clinic-assessment-v1-final`, 36 questions, 152 options, 6 axes, axis weights total 100.
  - Patient Journey: `patient-journey-v1-final`, 25 questions, 96 options, 5 axes, axis weights total 100.
- No Comprehensive V2 product identity remains in `assessment_types`.
- The current live totals are zero rows in `leads`, `sessions`, `answers`, `scores`, `assessment_results`, `assessment_session_access`, and `historical_snapshots`.
- The live database has no rows for the three deleted IDs across the migration's dependency-check tables.
- The reconstructed records currently have no associated rows in `traps`, `insights_mapping`, or `assessment_assets`; consistency behavior is represented by the version-scoped registry and approved contract artifacts.

**Assessment**
- Current routing/content counts and weight postconditions are satisfied by the read-only queries.
- The migration's precondition guards are present in source; the applied migration ledger and successful current state are consistent with the transaction having completed. The live database cannot reveal exact counts of deleted child content after the fact. Do not invent historical deletion counts or infer causality for the separately recorded historical lead/session/answer deletion.
- The change removed the old V1/V2 database identities and child content; approved artifacts and Git history remain the available source evidence. Do not restore old versions or repeat deletion without a separately justified decision.

## Cross-migration contract defect — route to C-02

The live constraint definition is:

`answers_answer_value_compat_check: answer_value IN (0, 1, 2, 3, 4, 5, 40, 100)`

The final Comprehensive and Patient Journey options contain respectively 36 and 21 options with `option_value = 70` (57 total). The existing answer-save migration `20261003082558_20261003090000_p4_submission_foundation.sql` writes the selected option's value into both `option_value` and `answer_value`. Thus selecting one of those 70-valued options violates the live CHECK constraint. Current `answers` is empty, so this inventory does not claim a current failed row or a live reproduction of the error.

### Forward-only repair design (not executed)

C-02 should add 70 to the accepted compatibility set while preserving legacy values. Candidate constraint contract:

`answer_value IN (0, 1, 2, 3, 4, 5, 40, 70, 100)`

Before producing the migration, C-02 must:
1. Reconfirm the live constraint name and definition.
2. Check existing rows for values outside the proposed set.
3. Create a new forward-only migration; do not edit any applied migration.
4. Test constraint replacement and inserts for `0, 40, 70, 100` plus retained legacy values on disposable PostgreSQL.
5. Assert unsupported values still fail and the answer-save RPC can persist a 70-valued option.
6. Verify no data rewrite is needed; current `answers` count is zero.
7. Obtain explicit owner approval before any Production execution.

No Production DDL, data write, migration-history change, Edge Function deployment, or Cloudflare change is authorized by this D-14 inventory.

## Verification limitations

- All live database observations above were read-only SQL/catalog queries or Supabase migration/function metadata.
- No submission E2E test was run in Production.
- Current zero-row counts do not prove what exact records existed before the three migrations.
- The migration ledger establishes applied versions, not owner authorization; this report preserves the owner's statement that the three migrations were not approved.
- No compensating migration was authored or applied in D-14. The 70-value defect is specified for C-02.

## D-14 decision

**Inventory:** complete for the three specified migration files and the relevant live contract.  
**Compensating repair design:** one concrete forward-only constraint correction identified and assigned to C-02.  
**Production status:** unchanged by this work; no mutation performed.  
**Next step:** review this report and implement C-02 as a separate bounded work package. Do not execute any Production repair without explicit approval.

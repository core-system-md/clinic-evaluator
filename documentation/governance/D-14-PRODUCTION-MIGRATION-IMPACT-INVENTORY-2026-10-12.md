# D-14 — Production Migration Impact Inventory and Forward-Only Repair Design

**Date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Scope:** Read-only inventory of the three Production migrations applied on 2026-10-09, their impact, and a forward-only repair design.  
**Owner authorization clarification (2026-10-19):** The owner explicitly confirms that all three migrations listed below were previously approved and that the approval existed at the time of execution. The apparent absence of approval evidence is a documentation/reconciliation defect; it must not be described as an unapproved Production change. This current confirmation is recorded as owner direction, and does not pretend to reconstruct or replace the original contemporaneous evidence.  
**Status (reconciled 2026-10-19):** Historical migration-impact inventory complete. The owner’s explicit confirmation resolves the authorization-record discrepancy. The value-70 finding below is historical and was subsequently repaired and closed under C-02; it is not open work for D-14/WP-11. No Production mutation was performed by this inventory.

## Executive result

The live migration ledger confirms all three versions are applied, in order:

1. `20261009164918 / canonical_axis_weights`
2. `20261009164951 / structured_result_authority`
3. `20261009170228 / reconstruct_final_assessment_versions`

The live schema and content match the main intended postconditions of the first and third migrations: the current assessment versions are published V1 records, family pointers target the current records, and every current assessment's axis weights sum to 100 percentage points. The two Structured Result RPCs introduced by the second migration exist and are granted to `service_role`; the deployed `assessment-access` Edge Function is version 35 and imports `engine.ts` and calls the `*_from_result` RPCs. No current API-name mismatch was found in this inspection.

At the time of this read-only inventory, the cross-migration contract defect was recorded as 57 options with value 70 against the then-observed `answers_answer_value_compat_check` set `0, 1, 2, 3, 4, 5, 40, 100`. The later authoritative handoff and reconciliation matrix record C-02 as CLOSED: the Production value-70 persistence/scoring path was exercised and the compatibility constraint includes 70. This paragraph is preserved as a historical observation, not a claim about the current constraint or an open defect. Do not reopen C-02 absent new regression evidence and explicit owner direction.

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

## Historical cross-migration compatibility finding — C-02 later closed

**Historical observation from the 2026-10-12 inventory:** the then-live constraint definition was:

`answers_answer_value_compat_check: answer_value IN (0, 1, 2, 3, 4, 5, 40, 100)`

The reconstructed Comprehensive and Patient Journey content then contained 36 and 21 options with `option_value = 70` respectively (57 total). The answer-save function writes the selected option value to both `answers.option_value` and `answers.answer_value`, so that historical constraint would reject value 70. At the time of observation, `answers` was empty; this inventory did not claim a reproduced failed Production row.

**Current disposition:** the authoritative current handoff and reconciliation matrix record C-02 as **CLOSED**. Production value-70 persistence/scoring was verified, and the compatibility constraint was repaired to accept 70. This D-14 report preserves original evidence and the historical constraint/design; it does not assert that the old constraint remains live. Do not restart, rerun, or reopen C-02 without new regression evidence and explicit owner direction.

### Original forward-only repair proposal — superseded by C-02 closure

The proposal below records the design considered when this inventory was written. It is retained for audit history only and is superseded by the later C-02 implementation and closure. The proposed contract was:

`answer_value IN (0, 1, 2, 3, 4, 5, 40, 70, 100)`

The original plan required reconfirming the then-live constraint and existing values, adding a forward-only migration (not editing an applied migration), testing retained and unsupported values in disposable PostgreSQL, and exercising the answer-save RPC. Its approval gate applied before the subsequent Production execution; the current project record now treats the C-02 repair as completed and owner-authorized. This inventory itself did not apply DDL, write data, change migration history, deploy Edge, or change Cloudflare.

No new Production change is authorized by this historical design. The current C-02 status and evidence are governed by the current handoff and matrix, not by the original “repair required” wording retained above.

## Verification limitations

- All live database observations above were read-only SQL/catalog queries or Supabase migration/function metadata.
- No submission E2E test was run in Production.
- Current zero-row counts do not prove what exact records existed before the three migrations.
- The migration ledger establishes applied versions, not authorization by itself. The owner explicitly confirmed on 2026-10-19 that all three migrations were approved before execution; the earlier contrary statement in this report was a documentation error and is superseded by this clarification.
- No compensating migration was authored or applied in D-14. The 70-value defect is specified for C-02.

## D-14 decision

**Inventory:** complete for the three specified migration files and the relevant live contract.  
**Compensating repair design:** a forward-only constraint correction was proposed in the original inventory and was subsequently implemented and closed under C-02; no D-14 repair remains active.  
**Production status:** unchanged by this work; no mutation performed.  
**Authorization disposition (2026-10-19):** The owner confirms prior approval for all three historical migrations. No new approval is required for those already-executed changes, and no rollback or re-execution is authorized or indicated merely to address the documentation defect.  
**Remaining technical finding:** no D-14/C-02 value-70 repair remains open in the current status register. C-02 is closed. Reopen only if new regression evidence and explicit owner direction justify it. The owner’s confirmation concerns the three already-executed 2026-10-09 migrations only; it does not authorize unrelated Production mutation.

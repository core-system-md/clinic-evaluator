# C-02 — Answer value 70 compatibility repair

**Date:** 2026-10-13  
**Repository:** `core-system-md/clinic-evaluator`  
**Supabase project:** `oaqpzaarppccbnepffxx`  
**Status:** Implementation candidate prepared on an isolated branch; verification is pending CI execution.  
**Production mutation:** Not performed and not authorized.

## Finding

The current compatibility constraint allows `0,1,2,3,4,5,40,100`, while current reconstructed assessment content includes 57 options with value 70. The answer-save contract writes the selected option value to `answers.answer_value`; therefore 70 must be accepted without dropping existing supported values.

## Change prepared

- New forward-only migration: `supabase/migrations/20261013110000_c02_allow_answer_value_70.sql`.
- It checks that the expected constraint exists and aborts if any existing non-null answer value is outside the intended compatibility set.
- It replaces only `answers_answer_value_compat_check` with `0,1,2,3,4,5,40,70,100`.
- Existing applied migrations are unchanged.
- A disposable PostgreSQL harness seeds legacy values, applies the new migration, verifies all supported values including 70, confirms the option/answer value pair persists, and verifies unsupported value 99 is rejected.
- A Node source-contract test and dedicated PostgreSQL GitHub Actions workflow are included.

## Verification state

- Production constraint re-confirmation and row inspection: **NOT VERIFIED in this C-02 run**; the prior D-14 read-only inventory recorded the old constraint and zero answer rows. No production query/write was used to execute this migration.
- Local PostgreSQL execution: **NOT RUN**; this execution environment has no `psql` or Docker binary.
- Node test: pending execution after branch files are committed.
- Disposable PostgreSQL workflow: pending PR CI.
- Actual deployed answer-save RPC E2E: **NOT VERIFIED**; the harness models the constraint-facing insert contract and does not claim to execute the complete production RPC dependency graph.

## Safety and closure

No Supabase Production DDL/data write, migration application, migration-history change, Edge Function deployment, or Cloudflare Pages action was performed. Do not apply this migration to Production without separate explicit owner approval. C-03 must not start until the C-02 PostgreSQL CI passes, all verification limitations are recorded, and this package is reviewed and closed.

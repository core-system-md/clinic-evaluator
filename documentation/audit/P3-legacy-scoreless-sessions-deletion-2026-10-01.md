# P3 — Deletion of Non-Recomputable Scoreless Sessions

**Date:** 2026-10-01  
**Status:** Executed and verified

## Owner direction

The five completed sessions identified during the P3 forensic audit were deleted because:

- each session had zero stored answer rows;
- each session had zero stored score rows;
- deterministic recomputation was therefore impossible;
- retaining them would preserve records that could not serve as authoritative assessment results.

The owner explicitly directed deletion rather than retention as historical assessment records, unless a concrete engineering dependency required retention. No such dependency was identified before deletion.

## Deleted session IDs

- `5e1c1d38-f862-4927-ab56-ca4c094d8cfb`
- `2a48708e-f8fd-47bd-b39d-e005c17c1fd8`
- `b0e069ef-d4f6-44fb-9c97-00aacd6709c7`
- `18fc2c0e-af8d-4505-b3fa-5b264576527b`
- `7af9846d-aafc-4f72-abb5-0e8ec58ecae9`

## Referential behavior

The database schema was checked before deletion.

The following session-dependent tables reference `public.sessions(id)` with `ON DELETE CASCADE`:

- `answers`
- `scores`
- `historical_snapshots`
- `assessment_session_access`

The linked lead records were not targeted by this deletion.

## Execution

A direct deletion of the five exact session IDs was executed against Supabase production.

All five requested session IDs were returned by the deletion statement.

## Verification

Post-deletion verification showed:

- total sessions remaining: **30**;
- dependent answer rows for the deleted session IDs: **0**;
- dependent score rows for the deleted session IDs: **0**.

## Boundary

This deletion does **not** authorize deletion of the separate 123 score rows with `session_id IS NULL`. Those remain a separate forensic/data-retention issue.

It also does not decide the final scoring methodology. The five-session cleanup is a data-integrity action based on missing source evidence.

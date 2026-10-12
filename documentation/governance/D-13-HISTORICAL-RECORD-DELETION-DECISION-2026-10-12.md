# D-13 — Historical Record Deletion Decision and Execution Record

**Record date:** 2026-10-12  
**Repository:** `core-system-md/clinic-evaluator`  
**Work item:** D-13 — historical record deletion  
**Status:** **OWNER DECISION RESOLVED; DELETION EXECUTED (historical record)**

## Authoritative correction

The owner has confirmed that the decision to delete the historical records was already made and the deletion was already executed. Earlier handoff wording that treated the decision as unresolved was incorrect. This record supersedes that mistaken status; it does not authorize any new deletion, restoration, or cleanup.

## Historical evidence preserved as reported

| Entity / event | Recorded value |
|---|---:|
| Leads inserted | 606 |
| Leads deleted | 517 |
| Leads live | 0 |
| Sessions inserted | 285 |
| Sessions deleted | 309 |
| Answers deleted | 3,773 |
| Autovacuum observed on leads / sessions / answers / scores | 2026-10-05 19:00 UTC |

These are transcribed from the existing audit notes and owner clarification. The figures are preserved as recorded; this document does not infer reconciliation semantics for counts where deleted exceeds inserted, and it does not claim a new live-database verification of these historical numbers.

## Required handling

- Do not ask the owner to decide this deletion again.
- Do not recreate, restore, re-delete, or otherwise mutate these historical records as part of D-13.
- Do not infer that deletion was caused by a particular migration unless separate evidence establishes that causal link.
- Preserve this record as a historical decision/execution fact. Any new data-retention or recovery proposal is a separate work item and requires its own evidence and authorization.
- Keep the broader production release state independent: documenting this decision does not close the unrelated D-09 asset exposure gate, D-14 migration-impact review, or the overall release.

## Verification boundary

This change is documentation-only. No Supabase SQL was run, no Production data was read or written for this documentation update, no migration was applied, and no deployment was initiated.

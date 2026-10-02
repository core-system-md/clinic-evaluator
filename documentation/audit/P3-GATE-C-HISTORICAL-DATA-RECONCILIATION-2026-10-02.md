# P3 — Gate C Historical Data Reconciliation Evidence
## 2026-10-02

**Status:** Evidence record — non-production  
**Purpose:** document what the current production data can and cannot support, without changing any data.

## 1. Current verified state

A read-only review of Supabase project `oaqpzaarppccbnepffxx` confirms:

- **15 completed sessions** have score rows but **zero answers linked to the session**.
- They are distributed as:
  - Clinic Performance: 5 sessions, 3 score rows each.
  - Medical Team: 4 sessions, 4 score rows each.
  - Patient Journey: 6 sessions, 5 score rows each.
- These sessions were completed between **2026-07-07 and 2026-08-09**.
- Because their answer vectors are not present under the session, the answer-level evidence needed for a reliable P3 recomputation is missing.

## 2. Sessionless answers

There are **12 answer rows with no session_id**.

All 12 are dated **2026-07-08**.

Their stored values are:
- 1 → 5 rows
- 3 → 2 rows
- 5 → 5 rows

These rows are older lead-level records, not authoritative answers for a pinned assessment session.

They must not be converted into P3 answers by guessing a session or a meaning for the old numeric values.

## 3. Sessionless scores

There are **123 score rows with no session_id**.

Verified characteristics:
- 31 distinct lead IDs;
- 5 distinct axis IDs;
- all dated **2026-07-08**;
- none has a null lead_id.

They are therefore a separate legacy data group with no direct session/result lineage.

They must not be attached to sessions by inference.

## 4. Disposition

| Data group | Current ability to recompute P3 | Current disposition |
|---|---|---|
| 15 completed sessions with scores/no answers | No reliable answer-level reconstruction from session data | Preserve as legacy; no rewrite |
| 12 sessionless answers | No safe session linkage | Preserve; exclude from authoritative P3 result lineage |
| 123 sessionless scores | No safe session linkage | Preserve; exclude from authoritative P3 result lineage |

## 5. Important distinction

These 15 sessions are **not** the five legacy scoreless sessions that were previously targeted and are already verified absent.

No destructive action is implied by this record.

## 6. Rules applied

- No answer is inferred.
- Missing answer data is not treated as zero.
- Old score rows are not treated as P3 scores.
- No historical result is silently rewritten.
- No legacy record is deleted or reassigned by this evidence record.

## 7. What remains

The historical migration policy remains:

1. Recompute only where the complete historical inputs are available and deterministic.
2. Preserve legacy results where those inputs are missing.
3. Record any future migration explicitly with source, target, reason and provenance.
4. Make a separate owner-approved decision before any destructive cleanup.

**Production impact: none.**

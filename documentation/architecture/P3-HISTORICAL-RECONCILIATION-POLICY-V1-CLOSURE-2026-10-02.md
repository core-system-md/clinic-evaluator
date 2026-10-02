> **P3 DOCUMENT STATUS:** Supporting design/evidence record. This document is **not the canonical P3 stage-status authority**. For the current reconciled state, open `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`. Historical/closure wording in this document must be interpreted through that canonical record.

# P3 — Historical Reconciliation Policy V1
## 2026-10-02

**Status:** implementation-authoritative, non-production.

Historical reconciliation is a separate operation from rebuilding the scorer.

### Non-destructive policy

1. Legacy results are never overwritten automatically.
2. Replayable sessions are first computed as **P3 shadow results** and compared with legacy values.
3. Sessions without complete answer-level source remain **LEGACY_PRESERVE**.
4. Sessions lacking sufficient lineage are **UNRECONSTRUCTABLE**.
5. Missing historical answers are never inferred as zero.
6. Legacy trap penalties are not reactivated during comparison.
7. A numerical delta between legacy and P3 is a comparison artifact until an explicit migration is approved.

### Current Supabase disposition

Read-only evidence on 2026-10-02:
- Admin Reception: 1 completed / 1 fully answered → REPLAYABLE candidate
- Clinic Performance: 5 completed / 0 fully answered → LEGACY_PRESERVE
- Medical Team: 4 completed / 0 fully answered → LEGACY_PRESERVE
- Comprehensive Clinic: 0 completed → UNRECONSTRUCTABLE for session-level reconciliation
- Patient Journey: 7 completed / 1 fully answered → REPLAYABLE candidate

All completed sessions currently carry an assessment version and legacy scoring-engine version, but that alone does not recreate missing answers.

### Production gate

No historical migration is authorized by this policy. Before production migration, replay evidence, legacy-vs-P3 diff, owner display decision, rollback artifact, versioned migration, and post-migration verification must all exist.

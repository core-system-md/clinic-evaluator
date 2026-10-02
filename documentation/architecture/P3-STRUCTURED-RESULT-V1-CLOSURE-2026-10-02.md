> **P3 DOCUMENT STATUS:** Supporting design/evidence record. This document is **not the canonical P3 stage-status authority**. For the current reconciled state, open `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`. Historical/closure wording in this document must be interpreted through that canonical record.

# P3 — Structured Result V1 Closure
## 2026-10-02

**Status:** implementation-authoritative, non-production.

The structured-result builder now assembles the outputs of interpretation, aggregation, consistency, criticality, and coverage into one deterministic internal contract.

### V1 invariants
- score calculation happens upstream; this layer does not recalculate;
- assessment version and interpretation/scoring versions are pinned;
- raw response identity and source option value are retained for audit;
- profile is the primary measurement output;
- overall composite remains null;
- unavailable roles/KPIs remain unavailable with null values;
- economics remains `NOT_COMPUTED`;
- criticality is emitted as structured diagnostics and never subtracts score;
- consistency findings are preserved as findings;
- replay inputs are explicit.

### Production boundary
No production scorer, schema, published content, or historical result was changed.

> **P3 DOCUMENT STATUS:** Supporting design/evidence record. This document is **not the canonical P3 stage-status authority**. For the current reconciled state, open `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`. Historical/closure wording in this document must be interpreted through that canonical record.

# P3 — Criticality & Coverage V1 Closure
## 2026-10-02

**Status:** implementation-authoritative, non-production.

### Frozen V1 coverage semantics
- Coverage denominator is only applicable items in the same component/layer/assessment scope.
- Interpreted semantic-only/evidence-only responses count as interpreted coverage.
- Missing is not zero.
- Unsupported is not zero.
- Coverage status is structural in V1:
  - `NOT_MEASURED`: no interpreted coverage;
  - `PARTIAL`: some but not all applicable items interpreted;
  - `FULL`: all applicable items interpreted and supported;
  - `UNSUPPORTED`: an answered response lacks required numeric support;
  - `ADEQUATE`: reserved until empirical threshold calibration.
- V1 uses `STRUCTURAL_V1_UNCALIBRATED`; no arbitrary 50%/80% threshold is introduced.

### Frozen V1 criticality semantics
- Criticality states are independent of score.
- Critical findings remain visible and set `reviewRequired`.
- When a critical domain has incomplete coverage, status becomes `UNVERIFIED` rather than safe/normal.
- Full coverage preserves the strongest represented critical state.
- Criticality never becomes a multiplier or penalty.

### Production boundary
No production scorer, schema, content, or historical result was changed.

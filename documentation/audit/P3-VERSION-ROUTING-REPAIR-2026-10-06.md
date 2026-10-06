# P3 — Version Routing Repair
## 2026-10-06

Status: CLOSED

Confirmed defect:
- Version 2 configuration could enter the provenance digest while the integrated scorer defaulted to interpretation version 1.

Repair:
- Integrated scorer now receives the assessment interpretation version explicitly.
- Scorer resolves against the matching versioned interpretation registry.
- Configuration digest uses the same registry and schema version actually routed to scoring.
- Unsupported interpretation versions are rejected.

Verification:
- P3 kernel and contract CI passed after the repair.
- Version 2 regression coverage passed.
- Production `assessment-access` deployed as version 30.
- Deployed scorer, integrated scorer and production adapter content exactly matched main.
- No existing P3 result rows were present, so no stored result required migration or recalculation.

Scope:
- No assessment content changed.
- No KPI methodology changed.
- No new scoring engine introduced.
- P5 proceeds from the repaired main baseline.

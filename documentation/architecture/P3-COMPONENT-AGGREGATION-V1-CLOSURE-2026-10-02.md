> **P3 DOCUMENT STATUS:** Supporting design/evidence record. This document is **not the canonical P3 stage-status authority**. For the current reconciled state, open `documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md`. Historical/closure wording in this document must be interpreted through that canonical record.

# P3 — Component Aggregation & Profile Construction V1
## 2026-10-02

**Status:** implementation-authoritative, non-production.

### Frozen V1 aggregation contract

1. The primary component in the response interpretation registry is the aggregation boundary.
2. A bucket is the exact tuple:
   `componentCode + primaryConstruct + measurementLayer`.
3. Mixed layers such as `P/M`, `P/E`, and `M/X` are preserved as exact buckets. They are **not duplicated** into multiple numeric dimensions automatically.
4. Each question contributes at most once to a bucket.
5. Numeric aggregation accepts only `DIRECT_ANCHOR` items that are answered, score-eligible, and have an explicit positive `anchorMax`.
6. Current registry numeric anchors use `anchorMax = 100`.
7. Numeric items use **equal item weighting (V1)**. No `impact`, trap, criticality, or consistency multiplier is applied.
8. Coverage counts answered, interpretable responses. Semantic-only/evidence-only responses count as interpreted coverage but do not become numeric zero.
9. Missing, unsupported, or non-numeric response states are not converted to zero.
10. No component weights are introduced.
11. No axis/overall composite is produced by NEXT-02; `overallComposite = null`.
12. Performance, maturity, evidence, digital capability, consistency, criticality, and development signals remain distinct channels.

### Numeric scale boundary

V1 freezes the **aggregation mechanism**, not a universal response remapping. Existing item-level anchors in the registry remain authoritative for this version. A future scale change must be versioned at interpretation level and verified before activation.

### Empirical current-data check

Current Supabase data contains:
- 93 questions / 305 options
- five families: 11/33, 9/45, 12/44, 36/108, 25/75
- all 93 question rows currently have `impact = medium`
- option values currently range from 0 to 100 and none are null

These facts support using equal item weighting for V1 and keeping source option values separate from interpretation semantics, but they do not by themselves prove that every future scale choice is empirically calibrated.

### Production boundary

No production scorer, schema, question text, option text, or historical result is changed by this stage.

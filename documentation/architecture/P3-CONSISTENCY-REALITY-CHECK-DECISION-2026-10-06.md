# P3 — Consistency Reality-Check Scoring Decision
## 2026-10-06

**Status:** OWNER-APPROVED METHODOLOGY DECISION — implementation-authoritative for the shared P3 consistency layer
**Scope:** shared scoring engine behavior; no question/option content change in this record
**Owner decision:** consistency may affect numeric scoring only through an explicit, item-level contradiction rule.

## 1. Decision

The P3 consistency layer is upgraded from signal-only detection to **explicit reality-check scoring**.

The principle is:

`selected option → response interpretation → consistency comparison → effective anchor → axis aggregation → overallScore`

A consistency finding does **not** automatically reduce a score.

A numeric score effect exists only when all of the following are true:

1. the relationship is explicitly declared for the same assessment family and pinned assessment version;
2. both items are answered and interpretable;
3. the validator is an eligible `DIRECT_ANCHOR` measurement;
4. the validator satisfies the rule's high-state condition;
5. the target satisfies the rule's explicit contradiction condition;
6. the rule explicitly declares a score effect.

## 2. Score-effect rule

The reusable score effect is a **cap on the validator's effective anchor**, not a penalty multiplier.

The rule declares the replacement ceiling explicitly. The engine does not invent a value.

For the approved Comprehensive Clinic design, the intended example is:

`100 → 70`

when a designated high-state claim is contradicted strongly enough by its designated comparison item.

The engine therefore supports:

- `NONE` — analytical finding only;
- `CAP_VALIDATOR_ANCHOR` — reduce the validator's effective anchor to the rule-declared ceiling.

The ceiling is configuration-owned and may differ between assessment families/items. The engine must never assume that 70 is universal.

## 3. Why this is not a generic penalty

This mechanism is not the legacy trap penalty and must not reuse the legacy `is_trap` or impact multipliers.

It is a **reality-consistency correction** applied to a specific claimed state when another explicitly related answer materially conflicts with it.

Therefore:

- no percentage penalty is multiplied onto the axis;
- no score is reduced merely because an answer is marked as a trap;
- no score is reduced because technology is present;
- no score is reduced because a response appears sophisticated;
- no contradiction is inferred from unrelated questions;
- no cross-assessment comparison is allowed.

## 4. Multiple contradictions

A validator may participate in more than one explicit score-effect relationship.

Score effects are **not stacked as repeated penalties**.

The engine evaluates all matched caps for the same validator and applies one effective cap:

`effectiveAnchor = min(originalAnchor, matchedDeclaredCaps...)`

This is deterministic and prevents order-dependent scoring.

## 5. Missing, unsupported, and contextual inputs

Missing or unsupported inputs do not create score-effect findings.

Contextual/provider-dependent responses do not become lower numeric scores merely because they are contextual.

A rule may identify them as a review condition, but only an explicitly declared score-effect rule can change the validator's numeric anchor.

## 6. Separation of concerns

The following remain unchanged:

- frozen axis weights;
- equal item weighting within the existing numeric aggregation boundary;
- no zero-fill for missing data;
- no role imputation;
- criticality remains separate from numeric score;
- evidence gaps do not become numeric zero;
- measurement capability is not treated as an observed outcome;
- the legacy scorer and legacy trap logic are not reused by this mechanism.

## 7. Reuse across the five assessments

This is a **shared P3 engine rule**, not a Comprehensive Clinic-specific scoring implementation.

Each assessment/version activates it only through its own explicit relationship mapping.

Therefore:

- the engine is common;
- rule semantics are declarative;
- question-pair relationships are assessment/version scoped;
- the downgrade ceiling is item/rule configuration;
- an assessment with no approved score-effect pairs keeps its existing numeric result unchanged.

This allows the same kernel to support the other four assessments without forcing identical question logic or identical scales.

## 8. Provenance

Because a score-effect relationship can change the numeric result, the active consistency rule set and assessment-scoped relationship mapping are part of the calculation identity.

The production configuration digest must include:

- consistency rule-registry version;
- assessment-scoped consistency mappings;
- declared score-effect configuration.

The scoring contract version must change when this behavior is active so that a result cannot be mistaken for a pre-reality-check calculation.

## 9. Backward-safety boundary

This decision does **not** change:

- published question text;
- published option text;
- live option values;
- axis weights;
- historical results;
- legacy data;
- database schema.

The first implementation stage changes only the shared scoring capability and its executable tests. Score-effect mappings are activated separately only after their item-level semantics are verified.

## 10. Acceptance contract

A compliant implementation must prove all of the following:

1. an explicit contradiction can change `100` to the declared mature anchor (e.g. `70`);
2. the same rule with no contradiction leaves `100` unchanged;
3. a weak/ambiguous signal leaves the score unchanged;
4. missing/unanswered target leaves the score unchanged;
5. a non-`DIRECT_ANCHOR` validator cannot be numerically downgraded;
6. two matched caps are applied once, deterministically;
7. no legacy trap or impact penalty is invoked;
8. axis weights remain exactly unchanged;
9. the effective score reaches axis and overall aggregation before classification;
10. the rule/mapping identity is included in the calculation provenance/digest.

## 11. Supersession

This decision supersedes only the earlier **consistency-specific** statements that treated all P3 consistency findings as `scoreEffect=NONE`.

Earlier V1 consistency artifacts remain preserved as historical evidence. They are not deleted or silently rewritten.

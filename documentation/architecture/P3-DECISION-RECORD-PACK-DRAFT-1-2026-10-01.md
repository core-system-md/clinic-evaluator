# P3 — Decision Record Pack — Draft 1

**Date:** 2026-10-01  
**Status:** **DECISIONS REQUIRED — NO PRODUCTION SEMANTIC CHANGES**

This pack closes the remaining methodology decisions identified by:

- MD Code Assessment Model — Owner Guardrails
- P3 Gap Analysis
- P3 MD Code Scoring Contract — Draft 1

The purpose is to make the remaining decisions explicit and small enough for owner approval.

---

# DR-01 — Current Response Scoring

## Verified reality

All five published assessments currently use option values:

`0 / 40 / 100`

The current server scorer treats these values directly as percentage-like response points.

## Recommended decision

For the current five published assessment versions:

**Keep direct scoring exactly as:**

`0 → 0`

`40 → 40`

`100 → 100`

No hidden reverse scoring, normalization, or maturity conversion is introduced.

This is a compatibility decision, not a claim that 0/40/100 is the universal future MD Code measurement model.

## Owner decision

**Approve / Reject**

---

# DR-02 — Consistency / Trap Methodology

## Verified reality

Current production is not methodologically coherent:

- only one structured trap exists;
- that trap references generic `Q1/Q2/A1` identifiers and is not aligned with the current admin-reception graph;
- multiple assessments contain `is_trap` option flags;
- no active Layer-B question graph exists;
- the server scorer has a separate structured-trap mechanism.

Therefore the existing trap behavior cannot be accepted as a canonical five-assessment methodology.

## Recommended decision

Replace the historical "Trap" concept with:

**Consistency Rules**

A consistency rule has:

`rule_id + evidence_items + trigger + severity + affected_component + effect + explanation`

Detection and score effect are independent.

### Default effect

For the first migration of the five assessments:

**Detection-only unless an explicit rule is approved to affect score.**

Reason: this prevents an undocumented historical trap from silently changing customer scores.

### Penalty support

The engine will support penalties, but no penalty is active until a rule is explicitly defined and validated.

## Owner decision

**Approve / Reject**

---

# DR-03 — Critical Gates

## Recommended decision

Do not activate critical gates in the first P3 scoring migration.

The engine supports them structurally for future assessment versions.

Reason:

The current five assessments do not have a sufficiently documented critical-failure methodology to justify overriding a compensatory score.

## Owner decision

**Approve / Reject**

---

# DR-04 — KPI Availability and Mapping

## Verified reality

All five current assessment versions contain broad KPI mappings referencing roles that they do not measure.

Examples include:

- patient-journey mappings requesting ADMIN, SCHEDULING, COORDINATION and RECEPTION;
- clinic-performance mappings requesting ADMIN, SCHEDULING, COORDINATION, RECEPTION, LOYALTY and CONVERSION;
- medical-team mappings requesting ADMIN, SCHEDULING, COORDINATION and RECEPTION.

The current engine hides this gap by filling missing roles from available-role averages.

## Recommended decision

For P3:

1. Keep the KPI registry.
2. Remove silent missing-role substitution.
3. A KPI is **available** only when its declared substantive inputs are measured.
4. A KPI may be **partial** only under an explicitly declared minimum-coverage rule.
5. Otherwise it is **unavailable**.
6. Never emit an unavailable KPI as zero.
7. Do not invent new role mappings solely to increase KPI coverage.
8. Existing KPI mappings are treated as **legacy configuration requiring validation**, not as automatically approved methodology.

## Practical consequence

Several current KPI cards will become unavailable or partial until their mappings are substantively validated.

That is intentional and prevents phantom metrics.

## Owner decision

**Approve / Reject**

---

# DR-05 — KPI Minimum Coverage

## Recommended baseline

For a KPI with declared input roles:

- **available:** all required inputs are measured;
- **partial:** at least 50% of declared input weight is measured, and the KPI definition permits partial calculation;
- **unavailable:** less than 50% measured, or a mandatory input is absent.

For partial KPIs, normalize over the actually available declared weights and mark the result `partial`.

## Important

This is a technical default, not a universal psychometric rule.

If a KPI has a mandatory role, its definition may override the generic 50% rule and require that role.

## Owner decision

**Approve this baseline / specify another rule**

---

# DR-06 — Economic Opportunity

## Verified reality

Current interactive EV has a mismatch between its displayed input semantics and calculation semantics.

The referral input is collected by the UI but is not used by the endpoint.

The endpoint also uses the visit-frequency input in more than one economic role.

Therefore the current formula cannot be accepted as canonical.

## Recommended decision

For P3:

**Disable monetary output as an authoritative assessment result until the economic model is explicitly frozen.**

The architecture remains enabled for future economic models.

A future model must explicitly define:

- value per event;
- event frequency;
- time basis;
- customer lifespan;
- margin/profit treatment;
- referral contribution;
- scenario assumptions;
- output currency/unit.

No revenue figure is presented as an official result until this contract is approved.

## Owner decision

**Approve / Reject**

---

# DR-07 — Economic Model Baseline for Future Use

This is intentionally separated from DR-06.

## Recommended future baseline

Use an explicit CLV-like structure rather than the current ambiguous formula:

`Economic Base = value_per_event × events_per_period × active_periods`

Then explicitly apply:

- margin factor, if relevant;
- scenario factor;
- opportunity factor derived from a declared score component.

Referral should only enter the model if its exact unit and causal interpretation are defined.

The model must never reuse a single input under two incompatible time meanings.

## Owner decision

**Approve baseline / request another model**

---

# DR-08 — Legacy Scoring Path

## Verified reality

The repository/runtime still contains:

- legacy `public.calculate_session_score`;
- unused `assessment-access/scoring.ts`.

Neither is the authoritative production scoring path.

## Recommended decision

Quarantine first, delete later.

1. Mark both explicitly non-authoritative.
2. Add tests proving production completion does not call them.
3. Search repository/database dependencies.
4. Retain temporarily for historical compatibility analysis.
5. Remove only after dependency verification and a documented cleanup commit.

This avoids destructive removal while P3 is still being finalized.

## Owner decision

**Approve / Reject**

---

# DR-09 — Five Scoreless Completed Sessions

## Verified reality

The five completed sessions have:

- no score rows;
- zero stored answer rows.

Their linked lead records contain legacy aggregate score information, but not the answer vector required for deterministic recomputation.

## Recommended decision

Treat them as **non-recomputable under current evidence**.

Do not:

- fabricate answers;
- infer axis scores;
- run the new scorer against incomplete data;
- silently replace historical lead-level scores.

Retain them temporarily as legacy historical records with an explicit non-authoritative status.

Then create a separate migration decision for retention/deletion after forensic review.

Deletion is not automatic.

## Owner decision

**Approve / Reject**

---

# DR-10 — 123 Orphan Score Rows

## Verified reality

There are 123 `scores` rows with no `session_id`.

They cannot participate in authoritative session analytics.

## Recommended decision

Quarantine from authoritative analytics.

Then investigate:

- provenance;
- creation period;
- lead association;
- whether they belong to pre-session architecture;
- whether equivalent session/result data exists elsewhere.

No automatic reassignment.

No automatic deletion.

## Owner decision

**Approve / Reject**

---

# DR-11 — Weight Migration

## Verified reality

Current configurations contain both fractional and percentage-style weights.

The engine currently compensates numerically by dividing by the sum.

## Recommended decision

Canonical runtime representation:

`0.00 ≤ weight ≤ 1.00`

with:

`Σ weights = 1.00`

Migration changes configuration representation only.

It does not change question/answer content.

For example:

`35/25/25/15 → 0.35/0.25/0.25/0.15`

## Owner decision

**Approve / Reject**

---

# DR-12 — Performance Bands

## Recommended decision

Keep:

- Q1 < 25
- Q2 ≥ 25 and < 50
- Q3 ≥ 50 and < 75
- Q4 ≥ 75

but rename the semantic concept everywhere from:

**Quartile**

to:

**Performance Band**

No claim of statistical quartiles is made.

## Owner decision

**Approve / Reject**

---

# DR-13 — Precision and Rounding

## Recommended decision

Use full precision internally.

Persist sufficient precision for replay.

Round only at presentation/output boundaries.

Never feed a rounded display value into a later calculation.

## Owner decision

**Approve / Reject**

---

# DR-14 — Provenance

## Recommended decision

Every authoritative result stores/references:

- family;
- assessment version;
- technical engine identity;
- scoring-contract digest;
- assessment-config digest;
- calculation timestamp;
- session;
- structured result snapshot.

The engine identity is technical provenance, not a product semantic version.

## Owner decision

**Approve / Reject**

---

# DR-15 — Structured Result as Single Source for Reports

## Recommended decision

All user/admin reports consume the same structured result.

Differences are presentation/authorization/detail only.

Neither report type may calculate a new official metric.

User-facing output:

- factual;
- professional;
- non-accusatory;
- consultation/training oriented.

Admin output:

- more transparent;
- calculation/coverage details;
- data-quality flags;
- consistency evidence;
- provenance.

## Owner decision

**Approve / Reject**

---

# DR-16 — Current Five Assessment Content

## Recommended decision

Absolute content freeze during P3 engine migration:

- no question text changes;
- no answer text changes;
- no deletion of current published questions;
- no replacement of current visible options.

Any future content redesign becomes a new assessment version/product decision.

## Owner decision

**Approve / Reject**

---

# 4. Recommended approval bundle

To minimize unnecessary back-and-forth, the following can be approved as one bundle:

**Approve DR-01, DR-02, DR-03, DR-04, DR-06, DR-08, DR-09, DR-10, DR-11, DR-12, DR-13, DR-14, DR-15, DR-16.**

Two items intentionally require a more specific choice:

### DR-05

Accept the proposed 50% KPI coverage baseline, or provide another threshold.

### DR-07

Accept the proposed future economic-model baseline, or specify another economic methodology.

---

# 5. Important boundary

Approval of this pack does **not** authorize production implementation by itself.

After approval:

1. update the scoring contract from Draft 1 to Frozen Contract;
2. produce the exact migration/configuration plan for the five assessments;
3. produce deterministic fixtures;
4. produce the historical-data reconciliation record;
5. then issue the implementation-ready checkpoint.

No production semantic change should occur before that checkpoint.

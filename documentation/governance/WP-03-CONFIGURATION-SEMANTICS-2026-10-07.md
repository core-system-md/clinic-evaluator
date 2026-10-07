# WP-03 — Correct Configuration Semantics
## 2026-10-07

**Work package:** WP-03 — Correct configuration semantics  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Branch:** `wp-03/correct-configuration-semantics-2026-10-07`  
**Status:** IMPLEMENTED — VERIFICATION / DEPLOYMENT NOT CLOSED  
**Production mutation:** NO  
**Production deployment:** NO

---

## 1. Scope

WP-03 establishes runtime configuration validation and prepares the canonical data representation required by the final contract.

The work was based on fresh reconciliation against the live Supabase project after WP-01.

---

## 2. Verified live configuration

Current live assessment definitions contain:

- 6 assessment versions across 5 families, including archived Comprehensive Clinic V1.
- 129 questions total.
- 457 options total.
- Every question is required in the current live definitions.
- Current question metadata uses `impact=medium` and `layer=A` across the live definitions.

All option identities used by the current interpretation registries were rechecked against live data:

- V1 registry coverage: exact question/option key coverage.
- Comprehensive V2 registry coverage: exact question/option key coverage.
- Option ID matches: exact.
- Source option values match: exact.
- Axis-code mapping matches: exact.

No interpretation drift was found in these fields.

---

## 3. Weight reconciliation

The live axis weights are semantically correct but are stored in two representations:

| Storage style | Current families/versions |
|---|---|
| Percentage points | Admin & Reception V1; Comprehensive Clinic V1; Comprehensive Clinic V2 |
| Fractions | Clinic Performance V1; Medical Team V1; Patient Journey V1 |

Each definition normalizes to a total of 100 percentage points.

WP-03 therefore prepares the approved normalization:

- `0.50 → 50`
- `0.35 → 35`
- `0.30 → 30`
- `0.25 → 25`
- `0.20 → 20`
- `0.15 → 15`
- `0.10 → 10`

The migration refuses mixed representations inside one assessment definition and refuses invalid weights.

**The migration is not applied to production in WP-03.**

---

## 4. Engine enforcement

`engine.ts` now:

1. normalizes legacy fraction weights only as a migration bridge;
2. validates that canonicalized axis weights are positive and total 100 percentage points;
3. validates full interpretation coverage for every question/option in the runtime assessment;
4. validates option identity, source option value, and axis mapping against the interpretation registry;
5. validates every measured axis has an explicit role mapping;
6. validates KPI identifiers, role/weight mappings, and KPI weight totals;
7. preserves RRI as Admin & Reception-only;
8. validates EV mapping weights and requires EV mappings when the simulator is enabled;
9. validates consistency pairs against known question codes, matching relationship rules, and duplicate-pair conditions.

These checks fail closed rather than silently falling back to an alternate interpretation.

---

## 5. Canonical test fixture

`tests/fixtures/p3-current-published-config-v1.json` now represents axis weights in percentage points, matching the final domain contract.

A dedicated WP-03 contract test validates:

- percentage weight representation;
- total = 100 per family;
- KPI mapping totals;
- RRI scope;
- engine invariants;
- migration guards.

---

## 6. Interpretation authority status

The V1 interpretation registry remains declared in its existing repository state:

`implementation-authoritative-non-production`

WP-03 does not invent a new authority/status label. Production cutover must not occur until the registry authority status is explicitly reconciled with the final contract.

The Comprehensive V2 registry remains the current implementation path for the currently published corrected V2 definition; the final V1 reset remains a WP-08 responsibility.

---

## 7. Production safety

No live Supabase mutation was performed by this WP.

The live `assessment-access` Edge Function remains the previously deployed version and still imports the previous production path.

Therefore WP-03 has not changed production behavior.

---

## 8. Verification boundary

Source-level checks and live read-only configuration reconciliation have been completed.

Full runtime test execution and deployment verification remain open because the implementation has not yet been deployed and the available GitHub workflow-status interface did not return a completed run for the new branch.

WP-03 is therefore not marked closed.

---

## 9. Next canonical action

After WP-03 review, proceed to:

**WP-04 — Result model and persistence**

WP-04 must reconcile persisted score semantics, Structured Result completeness, duplicate persistence calculations, and replay/provenance before any production cutover.

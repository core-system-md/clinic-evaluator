# WP-03 — Correct Configuration Semantics
## 2026-10-08

**Work package:** WP-03 — Correct configuration semantics  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Base:** `main` at `dc00a4cdf4014fa9edc76e6c3133303bda3fe668` (WP-02 closed state)  
**Branch:** `wp-03/correct-configuration-semantics-2026-10-08`  
**Status:** PASS — STAGE CLOSED / READY FOR MAIN  
**Production database mutation:** NO

---

## 1. Scope

WP-03 reconciles configuration semantics without changing approved question content.

Verified domains:

- axis weight representation;
- question/option interpretation semantics;
- impact/layer metadata;
- axis-to-role mapping;
- KPI mapping coefficients and KPI scope;
- EV capability versus EV mappings;
- consistency rule/pair dependencies.

---

## 2. Reconciled configuration truth

Current live Supabase inventory contains six assessment versions:

- Admin & Reception V1 — 11 questions / 33 options / 4 axes;
- Clinic Performance V1 — 9 / 45 / 3;
- Comprehensive Clinic archived V1 — 36 / 108 / 6;
- Comprehensive Clinic staged V2 — 36 / 152 / 6;
- Medical Team V1 — 12 / 44 / 4;
- Patient Journey V1 — 25 / 75 / 5.

All current questions report `impact = medium`, `layer = A`, and `is_required = true` in the live configuration.

Option source values are confined to the approved scales observed in the source inventory:

- V1 families: 0 / 40 / 100;
- Comprehensive staged V2: 0 / 40 / 70 / 100.

The interpretation registries remain the semantic authority for scoring meaning. Source `option_value` is treated as source/audit data rather than a universal scoring rule.

---

## 3. Canonical axis weights

The final contract requires canonical percentage points from 0 to 100, with each assessment's axis weights summing to 100.

The current live database had two storage conventions:

- percentage points (for example 35.00);
- fractional coefficients (for example 0.35).

The intended values are identical, but the representation was inconsistent.

The canonical target is:

| Assessment | Canonical axis weights |
|---|---|
| Admin & Reception V1 | 35 / 25 / 25 / 15 |
| Clinic Performance V1 | 50 / 30 / 20 |
| Comprehensive Clinic V1 | 20 / 20 / 20 / 15 / 15 / 10 |
| Comprehensive Clinic staged V2 | 20 / 20 / 20 / 15 / 15 / 10 |
| Medical Team V1 | 35 / 30 / 20 / 15 |
| Patient Journey V1 | 20 / 15 / 25 / 25 / 15 |

For the three currently fractional V1 families, the migration maps each value deterministically:

`fraction × 100 = canonical percentage point value`

No scoring intent is changed.

---

## 4. Migration safety

Migration:

`supabase/migrations/20261008090000_canonical_axis_weights.sql`

is fail-closed.

Before conversion it verifies that the targeted family weight sums are the expected fractional representation.

It then converts only those targeted V1 family rows.

After conversion it verifies:

- the targeted families sum to 100 percentage points;
- the expected twelve axis rows were normalized;
- the transaction remains atomic.

No production execution was performed in this stage.

---

## 5. Dedicated WP-03 test environment

Node contract suite:

`tests/wp-03-configuration-semantics.test.mjs`

Disposable PostgreSQL harness:

`tests/wp-03-axis-weight-migration-harness.sql`

Workflow:

`.github/workflows/wp-03-local-contract.yml`

The Node suite verifies canonical weights, interpretation anchors, semantic layers, role mappings, KPI normalization/scope, EV annual basis, and version-scoped consistency dependencies.

The PostgreSQL suite executes the actual conversion pattern against a disposable database fixture and verifies exact postconditions.

---

## 6. Verification

Latest dedicated workflow:

**WP-03 configuration contract — Run 37739494944**

- WP-03 configuration semantics: **SUCCESS**
- WP-03 disposable PostgreSQL migration contract: **SUCCESS**

The earlier WP-03 run was intentionally rejected after it exposed two test-assumption defects. Those were test-harness defects, not product defects:

1. The semantic-layer assertion listed only three observed layers despite the registry containing the complete approved layer set.
2. The EV assertion expected `evMappings` in a fixture that intentionally did not contain that field.

Both were corrected, then the full dedicated WP-03 gate passed.

---

## 7. Stage decision

WP-03 acceptance is satisfied within its own work-package boundary.

The later report, version-reset, obsolete-runtime, and final-release stages do not block this stage.

**WP-03 = PASS**

**WP-03 = STAGE CLOSED**

The successful branch is published to `main`.

---

## 8. Production boundary

The migration file is committed for the eventual production database release, but production was not mutated during WP-03.

Production execution remains part of the final controlled rollout after all source stages have been integrated and the final deployment gate is satisfied.

---

## 9. Next canonical action

**WP-04 — Result model and persistence**

WP-04 starts from the newly published WP-03 `main` state and continues with its own dedicated contract-local verification before publication.

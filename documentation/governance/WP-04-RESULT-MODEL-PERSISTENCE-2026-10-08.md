# WP-04 — Result Model and Persistence
## 2026-10-08

**Work package:** WP-04 — Result model and persistence  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Base:** `main` at `8550b982d5c933c0948e42d70265b43685d990c5`  
**Branch:** `wp-04/result-model-persistence-2026-10-08`  
**Status:** PASS — STAGE CLOSED / READY FOR MAIN  
**Production mutation:** NO

## 1. Objective

Make the Structured Result the sole factual persistence authority while preserving the existing database tables as projections/compatibility storage.

## 2. Implementation

The Structured Result now carries axis-level:

- axis identity;
- raw earned points;
- maximum possible points;
- normalized percentage;
- canonical normalized weight;
- weighted contribution;
- measured/unavailable status.

The engine passes source axis names into the result.

A pure persistence projector maps only the Structured Result into compatibility `scores` rows. It does not read answers, re-score, or recreate measurements.

The assessment completion entrypoint now sends a single factual result payload to the canonical completion functions.

New completion functions:

- `public.complete_p4_assessment_from_result(..., p_result jsonb)`
- `public.complete_p4_public_assessment_from_result(..., p_result jsonb)`

These validate the Structured Result, enforce session/assessment identity and pinned version, project persistence fields from it, and persist the exact result JSONB in `assessment_results`.

The previous P4 completion functions remain unchanged for later controlled disposition. WP-11 will handle final security/database reconciliation.

## 3. Persistence authority controls

The new persistence boundary validates:

- schema version and production status;
- session and assessment identity;
- pinned assessment version;
- interpretation version;
- engine/contract/config provenance;
- non-empty input lineage;
- required structured result sections;
- axis uniqueness;
- measured axis raw/max/percentage/weight/weighted score validity;
- rejection of internal engine-only `resolvedSelections`;
- rejection of internal `axisPersistenceRows`.

Lead score fields, session provenance, compatibility score rows, and protected usage consumption are all projections of the Structured Result transaction.

Protected completion is idempotent through the session lock/completed-state branch; the disposable PostgreSQL harness proves usage is consumed once and the result row is unique.

## 4. Dedicated WP-04 contract environment

Node contract suite:

`tests/wp-04-structured-result-persistence.test.mjs`

Disposable PostgreSQL harness:

`tests/wp-04-structured-result-persistence-harness.sql`

Workflow:

`.github/workflows/wp-04-local-contract.yml`

The Node gate proves the result contract and ownership model. The PostgreSQL gate executes the real migration/function SQL against PostgreSQL 17 and verifies protected completion, retry idempotency, public completion, persistence projection, and tamper rejection.

## 5. Verification result

Latest dedicated WP-04 run:

**Run 37741449245 — SUCCESS**

- Structured Result authority suite: **SUCCESS**
- Disposable PostgreSQL persistence gate: **SUCCESS**

Supporting stage checks for the same commit:

- WP-02 contract-local: **SUCCESS**
- WP-03 configuration contract: **SUCCESS**
- Broader P3 kernel workflow: contains the known unrelated pre-existing P5 baseline failures; it is not the WP-04 acceptance gate.

## 6. Production boundary

No production database migration was executed.

No production Edge Function was deployed.

The canonical source changes are ready to enter `main`; final production deployment remains reserved for the final integrated release stage.

## 7. Stage decision

All WP-04 acceptance criteria are satisfied within its independent work-package boundary.

**WP-04 = PASS**

**WP-04 = STAGE CLOSED**

Publish this stage to `main`, then start WP-05 from the resulting `main`.

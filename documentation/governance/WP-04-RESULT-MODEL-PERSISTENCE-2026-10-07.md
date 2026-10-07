# WP-04 — Result Model and Persistence
## 2026-10-07

**Work package:** WP-04 — Result model and persistence  
**Governing contract:** `documentation/governance/FINAL-IMPLEMENTATION-CONTRACT-2026-10-07.md`  
**Branch:** `wp-04/result-model-persistence-2026-10-07`  
**Status:** IMPLEMENTED — VERIFICATION / DEPLOYMENT NOT CLOSED  
**Production mutation:** NO  
**Production deployment:** NO

## 1. Structured Result authority

The Structured Result remains the single factual result object produced by the canonical `engine.ts` path.

It now carries recoverable provenance and measurement information for:

- item-level interpreted response lineage;
- axis raw score;
- axis maximum possible;
- normalized percentage;
- weighted contribution;
- canonical percentage-point axis weight;
- performance grade;
- roles and KPI projections;
- economic inputs and outputs;
- consistency/criticality findings;
- replay metadata.

The result builder now rejects invalid axis measurement shapes instead of silently accepting partial numeric state.

## 2. No duplicate persistence calculation

The persistence-ready `scores` projection is derived from `structured.scores.axes`.

The persistence layer therefore does not recalculate raw score, maximum, percentage, grade, or weighted contribution from answers a second time.

The database-side validation trigger only compares persisted rows with the Structured Result; it does not calculate an independent score.

## 3. Database guard

Migration:

`supabase/migrations/20261007130000_wp04_validate_structured_result_projection.sql`

adds a server-side validation trigger for `assessment_results`.

The trigger verifies:

- result identity;
- result status/schema;
- provenance equality;
- required Structured Result sections;
- measured/unavailable axis shape;
- exact projection between `assessment_results.result.scores.axes` and `public.scores`;
- canonical percentage-point weight ↔ persisted fractional weight projection;
- one persisted row per measured result axis.

No scoring formula exists in this trigger.

The migration is staged only and has not been applied to production.

## 4. Weight semantics

Final contract semantics are now explicit:

- Structured Result axis weights = percentage points (for example 35);
- `public.scores.weight` remains the persistence fractional projection (for example 0.35).

The engine performs the internal arithmetic using the fractional normalization, while the authoritative result exposes the canonical percentage-point representation.

## 5. Economic semantics corrected

The final contract says:

- visits are annual;
- default = 3 visits/year;
- referral input is optional;
- blank referral = unavailable;
- 0% referral = zero economic opportunity;
- economic opportunity does not modify the core assessment score.

The economic model was corrected accordingly.

The model now distinguishes baseline patient value from **incremental referral opportunity**:

`opportunity(referral) = basePatientValue / (1 - referral/100) - basePatientValue`

Therefore 0% produces zero opportunity while preserving the baseline value as a separate quantity.

The interactive endpoint now honors the explicit annual visit count; blank defaults to 3 rather than silently ignoring the client input.

## 6. Required-answer integrity correction

The engine previously compared answer question UUIDs against required question codes during completeness validation.

That mismatch was corrected by mapping runtime question IDs to their canonical question codes before evaluating missing required questions.

## 7. Verification boundary

Read-only live reconciliation confirmed the current production database still has no result records and no live scoring data to migrate.

The deployed Edge Function remains the previously published artifact and was not changed by WP-04.

Full local test execution was not claimed because no local repository clone is available in the environment. CI execution remains the authoritative runtime test boundary before merge/deployment.

## 8. Remaining follow-up

- Reconcile the interpretation registry authority status before production cutover.
- Complete report interpretation/validation and remove legacy report semantics.
- Complete final V1 reconstruction and legacy engine/path cleanup.
- Run layered verification in the final environment.

## 9. Next canonical action

**WP-05 — Report interpretation engine**

# P3 — Gate B Decision Closure Record
## 2026-10-02

**Status:** Design decision record — non-production
**Canonical status source:** documentation/architecture/P3-CANONICAL-STATE-AND-WORKPLAN-2026-10-02.md

## 1. Owner decisions now recorded

### KPI
The existing KPI catalog and mapping weights are adopted as the P3 starting basis:
TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI, with RRI for Admin/Reception.

The existing weights remain the mapping basis.

A role that is not actually measured by the current assessment is not filled with another value. There is no fallback-to-average behavior.

Internally, KPI availability is tracked as available/partial/unavailable.

For the user-facing final assessment report, missing roles are not discussed and a KPI that cannot be supported is not shown as a fabricated zero.

### Result shape
The final result keeps the existing multi-dimensional profile and the existing `overallScore` / `معدل الكفاءة العام` aggregate result.

`overallScore` is secondary to the detailed profile; no new “summary number” concept is being introduced.

The open scoring work is only to define how the existing `overallScore` is constructed under P3.

### Response scales
The previously agreed rule is confirmed:
- the number of answer choices does not decide the scale;
- meaning of the answer states decides how they are represented;
- there is no global conversion of all three/four/five-option questions;
- 0/30/50/80/100 is used only where the five actual states form a coherent maturity progression;
- Clinic Performance Q4/Q5/Q6 retain 0/0/40/100/100;
- Medical Team Q2c9f29 uses the design correction 100/40/40/0;
- visible question/answer content is unchanged.

### Economic input behavior
The economic section keeps the referral-percentage input.
- There is no default referral percentage.
- When the user enters a referral percentage, it affects the resulting economic value.
- The default visit count is 3 visits per year.
- The visit unit in the new contract is annual, not monthly.

The mathematical effect is now owner-approved: each referred patient is assumed to have the same annual visits (3), visit value, relationship years, and referral percentage as the originating patient. Referral value therefore propagates recursively across downstream generations. For `r = referral_percentage / 100`, `0 ≤ r < 1`: `BasePatientValue = average_visit_value × 3 × relationship_years`; `EconomicValue = BasePatientValue / (1 - r)`. Blank referral remains unavailable; explicit 0% produces no referral contribution. This is an Economic Opportunity calculation only and never changes `overallScore`.

### Consistency and criticality
The current V1 rule is confirmed:
- consistency findings are signals;
- they do not automatically reduce the score;
- criticality remains separate from the score;
- a critical finding is surfaced for review;
- no automatic penalty or gate is introduced unless a future version explicitly declares one.

## 2. What is now closed
The following are no longer open owner decisions:
- KPI catalog and mapping basis;
- removal of fallback/imputation;
- user-report treatment of missing roles;
- existing `overallScore` / `معدل الكفاءة العام` retained as the secondary aggregate result; exact P3 construction remains open;
- question-count-independent scale selection;
- the previously recorded Q2c9f29 correction;
- economic visit default and referral-input behavior at the business level;
- V1 consistency and criticality behavior.

## 3. Only remaining Gate B decisions

### Decision A — existing overallScore
The system already has `overallScore`, displayed to users as **معدل الكفاءة العام**.

What remains to be frozen for P3:
Which measured dimensions/components participate in this existing aggregate and how the canonical weights are applied.

Unavailable or unsupported dimensions must not be converted into invented values.

### Decision B — referral percentage — CLOSED
The system keeps the referral percentage input.

Business meaning is fixed: it represents the expected number of new patients attributable to one patient's recommendation, expressed as a percentage of one patient. There is no default; blank means unavailable, while an entered 0% means explicit zero. When supplied, it affects economic value only and does not change the assessment score.

The approved monetary model is recursive: every referred patient is assumed to carry the same visits/year, visit value, relationship years, and referral percentage. Therefore the economic value is a geometric series. For `r = referral_percentage / 100`, `0 ≤ r < 1`: `EconomicValue = BasePatientValue / (1-r)`, where `BasePatientValue = average_visit_value × 3 × relationship_years`.

## 4. Non-production boundary
This record changes documentation only.

It does not:
- change questions or options;
- change Supabase data;
- change the production scorer;
- apply a migration;
- rewrite historical results;
- delete legacy records.

## 5. Next work
After Decision A is closed:
1. finalize component/profile aggregation;
2. complete historical-data reconciliation;
3. integrate the single P3 result path;
4. complete the pre-Implementation-Ready verification package;
5. issue the Implementation-Ready record.

No production implementation is authorized by this document.

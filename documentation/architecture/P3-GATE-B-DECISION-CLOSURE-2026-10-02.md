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
The final result has a multi-dimensional profile plus one optional summary number.

The summary number is secondary. It does not replace the detailed profile.

The exact equation for that summary number remains the only open scoring decision in this area.

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

The exact mathematical effect of the referral percentage is still open and must not be invented in code.

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
- profile + optional summary direction;
- question-count-independent scale selection;
- the previously recorded Q2c9f29 correction;
- economic visit default and referral-input behavior at the business level;
- V1 consistency and criticality behavior.

## 3. Only remaining Gate B decisions

### Decision A — summary number
The system will show one optional summary number next to the detailed profile.

What still needs to be decided:
Which measured parts of the profile are allowed to enter that number, and with what weights?

The number must not erase dimensions that are unavailable or unsupported.

### Decision B — referral percentage
The system keeps the referral percentage input.

What still needs to be decided:
What exactly does the percentage describe, and how should it change the resulting monetary value?

Until this is fixed, the system must not create a made-up monetary effect.

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
After Decisions A and B are closed:
1. finalize component/profile aggregation;
2. complete historical-data reconciliation;
3. integrate the single P3 result path;
4. complete the pre-Implementation-Ready verification package;
5. issue the Implementation-Ready record.

No production implementation is authorized by this document.

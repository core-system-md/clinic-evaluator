# P3 — NEXT-08 Shadow Replay Results
## 2026-10-02

**Status:** audit evidence; non-production; no historical mutation.

## Replayable sessions

### 1. Admin Reception
Session: `9d1a5240-fe3b-485a-956c-e44138544f90`

- Stored answers: 11/11
- Legacy overall: 0%
- P3 overall composite: null by contract

P3 profile:
| Component | Layer | Coverage | P3 % |
|---|---|---:|---:|
| C04 Continuity & Follow-up | P | 100% | 0 |
| C04 Continuity & Follow-up | P/M | 100% | 0 |
| C05 Access, Scheduling & Flow | M | 100% | 0 |
| C05 Access, Scheduling & Flow | P | 100% | 0 |
| C05 Access, Scheduling & Flow | P/M | 100% | 0 |
| C07 Resilience & Team Coordination | M | 100% | 0 |
| C07 Resilience & Team Coordination | P/M | 100% | 0 |
| C08 Data Governance & Information Continuity | M | 100% | 0 |
| C16 Accountability & Governance | E/M | 100% | 0 |

### 2. Patient Journey
Session: `0c64e5c1-90db-4f99-8798-918c07afda5c`

- Stored answers: 25/25
- Legacy overall: 44%
- P3 overall composite: null by contract

P3 profile:
| Component | Layer | Coverage | P3 % |
|---|---|---:|---:|
| C01 Clinical Communication & Trust | P | 100% | 20 |
| C02 Understanding & Decision Support | P | 100% | 70 |
| C02 Understanding & Decision Support | P/K | 100% | 0 |
| C03 Privacy & Professional Conduct | P/K | 100% | 20 |
| C04 Continuity & Follow-up | M | 100% | 100 |
| C04 Continuity & Follow-up | P | 100% | 100 |
| C04 Continuity & Follow-up | P/M | 100% | 55 |
| C05 Access, Scheduling & Flow | P | 100% | 100 |
| C05 Access, Scheduling & Flow | P/M | 100% | 20 |
| C08 Data Governance & Information Continuity | P/M | 100% | 0 |
| C10 Measurement, Evidence & Learning | E | 100% | 40 |
| C12 Conversion & Consultative Commercial Process | P | 100% | 50 |
| C13 Retention, Loyalty & Referral | P/M | 100% | 40 |
| C15 Patient Experience & Feedback | E | 100% | 40 |
| C15 Patient Experience & Feedback | P | 100% | 40 |

## Reconciliation interpretation

The P3 result is intentionally **not** reduced to a single delta against the legacy overall score. The legacy result is an aggregate of the former axis/scoring model; P3 produces construct-specific profile dimensions and disables an overall composite in V1.

Therefore:
- Admin Reception legacy 0% and P3 all-zero layers are numerically aligned for this particular all-option-0 response set, but this is not evidence of general parity.
- Patient Journey legacy 44% cannot be mathematically subtracted from the P3 profile as though they were the same construct.
- The replay proves deterministic execution and semantic divergence, not equivalence.

## Data and safety observations

- All replayed stored answers resolved to current option identities.
- Stored answer values matched source option values.
- No database row was updated.
- No legacy score was overwritten.
- No historical snapshot was created.
- No production scorer was changed.

## Decision gate

This evidence is sufficient to close the **shadow replay execution gate**.

It is **not** sufficient to authorize production scorer replacement because the migration still requires:
1. explicit owner decision on historical display/compatibility behavior;
2. versioned rollback and migration artifacts;
3. production adapter integration;
4. production-path verification;
5. confirmation of interpretation-version persistence/provenance for future replay.


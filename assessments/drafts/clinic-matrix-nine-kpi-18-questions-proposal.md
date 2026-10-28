# Clinic Matrix — 18-question / 9-axis design proposal

Status: **Owner-approved preliminary design with wording edits; not final approval or publication authorization.**

## Scope
- 18 situational questions across 9 proposed axes.
- Each question has four options with internal anchors 0, 40, 70, and 100, each used once.
- Arabic and English question/option text are supplied separately.
- This file is a design proposal only. It is not the canonical V1 import file and must not replace the published V1 artifact.

## Owner-approved wording principles
- Reduce answer-key leakage by avoiding direct references to job authority, role boundaries, or management instructions where the situation itself can measure judgment.
- Keep options plausible and distinguish them by the quality and likely outcome of the response.
- Do not make the highest-scoring option systematically longer or more polished.
- Preserve clinical safety: staff must not make unsupported clinical suitability claims or guarantee outcomes.

## Axis proposal
| Code | Axis | Weight |
|---|---|---:|
| A1 | COMMUNICATION | 11.12% |
| A2 | TRUST | 11.11% |
| A3 | RECEPTION | 11.11% |
| A4 | CONVERSION | 11.11% |
| A5 | RETENTION | 11.11% |
| A6 | SCHEDULING | 11.11% |
| A7 | LOYALTY | 11.11% |
| A8 | ADMIN | 11.11% |
| A9 | COORDINATION | 11.11% |
| **Total** | | **100.00%** |

These axis weights are provisional design values, not a verified production scoring contract.

## KPI priorities and scoring status
The nine KPI candidates are TFI, TAP, PRP, PLI, PSI, NPI, EVI, TCI, and RRI. **Their priority order and the official axis-to-KPI weighting/binding have deliberately not been encoded or asserted as approved.** Do not publish or use this proposal for production scoring until the owner decides KPI priorities and the mapping is reconciled with the repository's official reporting/scoring contract.

## Version and production safety
- Published V1 remains unchanged and must be treated as immutable.
- This proposal has no interpretation-registry binding, no new release, no database change, and no deployment.
- Option IDs are proposal-local identifiers; they have not been registered against the official interpretation registry.
- No pass/fail threshold, proficiency band, or calibrated cut-off is introduced.

## Validation performed on this proposal artifact
- 9 axes.
- 18 required questions.
- 72 options.
- Every question uses 0 / 40 / 70 / 100 exactly once.
- Axis weights sum to 100%.
- Structural validation only; this does not establish scorer parity, report compatibility, psychometric validity, or production readiness.

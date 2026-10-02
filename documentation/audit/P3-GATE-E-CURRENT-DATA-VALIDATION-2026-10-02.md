# P3 — Gate E Current Data Validation
## 2026-10-02

**Status:** Read-only verification evidence — non-production  
**Project:** `oaqpzaarppccbnepffxx`

## 1. Published assessment configuration

A live read-only query verified the five published assessment families:

| Assessment | Questions | Axes | Options | Weight sum |
|---|---:|---:|---:|---:|
| Admin/Reception | 11 | 4 | 33 | 1.00 |
| Clinic Performance | 9 | 3 | 45 | 1.00 |
| Comprehensive Clinic | 36 | 6 | 108 | 1.00 |
| Medical Team | 12 | 4 | 44 | 1.00 |
| Patient Journey | 25 | 5 | 75 | 1.00 |

Totals:
- 93 questions
- 22 axes
- 305 options

## 2. Question integrity relevant to P3

The live check found:
- no published question without an axis assignment;
- no published question outside the current `impact = medium` baseline;
- option IDs are unique within the P3 registry;
- the P3 registry now contains an axis code for every question and no pending scale identifiers.

## 3. Weight boundary

The existing assessment-axis weights are already normalized to a sum of 1.00 in every current published family (with storage representations differing between fractional and percentage-style values).

P3 therefore uses the existing axis weights as the global `overallScore` dimension weights after canonical 0–1 normalization.

No replacement weights were introduced.

## 4. Data lineage boundary

The previously established Gate C evidence remains unchanged:
- 15 completed sessions have score rows but no linked answer rows;
- 12 answer rows are sessionless;
- 123 score rows are sessionless;
- the five previously deleted scoreless sessions remain absent.

No historical row was changed during this validation.

## 5. Conclusion

Current published configuration supports deterministic question → axis linkage and canonical axis weighting for the approved `overallScore` projection.

This evidence closes the **configuration-validation subtask** of Gate E.

It does not close integrated runtime verification, persistence/provenance verification, or production cutover verification.

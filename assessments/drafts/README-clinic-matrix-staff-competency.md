# Clinic Matrix Staff Competency — Draft implementation

Status: implementation draft for owner review. Do not publish or deploy as part of this change.

## Assessment design
- Public key: `clinic-matrix-staff-competency`, version 1.
- Six axes, two required situational questions per axis (12 questions total).
- Weights: A1 20%, A2 15%, A3 15%, A4 20%, A5 20%, A6 10% (sum 100%).
- Option anchors: 0 / 40 / 70 / 100. More than one response may receive a high score only when each response demonstrates the required patient-centred and ethical practice.
- Arabic and English fields must contain actual language-specific content; the English fields are not copies of the Arabic text.
- Draft anchor review corrected clear contradictions where coercive, misleading, non-consensual, or clinically overreaching responses had been assigned high scores. The scoring remains provisional pending owner review.
- No pass/fail cutoff or novice/advanced label is defined.
- Critical professional-conduct responses are surfaced as separate review flags and do not independently subtract score.

## Files
- Canonical admin-import draft: `assessments/drafts/clinic-matrix-staff-competency.v1.json`
- Interpretation registry: `supabase/functions/assessment-access/clinic-matrix-staff-competency-interpretation-draft.json`
- Official engine/scorer bindings: `engine.ts` and `response-scorer.mts`
- Import identity compatibility migration: `20261027120000_clinic_matrix_stable_option_identity.sql`
- Structural and binding tests: `tests/clinic-matrix-staff-competency.test.js`
- Assessment-specific scoring-pipeline E2E: `tests/clinic-matrix-staff-competency-e2e.test.mjs` (included in the P3 kernel CI command)

## Scoring
The registry is the scoring authority; the source `option_value` is retained for audit/legacy compatibility and is not the official interpretation source. Each option has a fixed UUID so the canonical import and the registry resolve the same identity. Axis scores should be derived by the official Structured Result pipeline; reporting must not independently recalculate them. The scoring pipeline receives the full configured question-code set so omitted answers remain visible in coverage rather than disappearing from the denominator. An axis with no answered eligible items is unavailable, not zero.

## Owner review before publication
Review Arabic wording, clinical/ethical appropriateness, translation quality, all option anchors, and the three separate critical-conduct flags (Q6 option D: overstepping role; Q8 option A: withholding updated cost; Q10 option B: promising a guaranteed result). This draft does not set a performance threshold. Confirm that the existing reporting surface presents axis/overall scores and critical flags correctly before publication.

## Safety boundary
The assessment-specific scoring-pipeline E2E passed in GitHub Actions P3 kernel verification: all three Clinic Matrix cases passed (full Structured Result path, separate critical-conduct flags, and missing/unknown option behavior); the kernel job reported 98 passed and 0 failed tests. This is not a browser-to-database submission E2E or a production verification. No database migration was applied, no production records were created, no assessment was published, and no deployment was initiated by preparing these files. The migration is staged for review only.

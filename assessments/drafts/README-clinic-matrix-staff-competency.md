# Clinic Matrix Staff Competency — Implementation and design record

## Production recovery — 2026-10-28

- Production V1 is published under release `33def0a3-086c-4861-bcc2-2b185769e293` for family `14637c94-36cd-429c-bd3c-9adc18253a89` and assessment `0485d166-e628-4171-9cac-e87c18752d71`.
- A post-publication description edit caused the submission runtime-digest mismatch. The exact pre-edit description was restored; the recomputed canonical configuration digest now equals the stored and verified release digest, and the interpretation registry digest also matches.
- Database migration `20261028131555_prevent_attested_published_config_mutations` is applied and prevents in-place edits to digest-projected configuration fields on a currently pinned published version. Negative tests for assessment metadata, axis text, question text, and option text all passed.
- The deployed Edge runtime contains the target-specific interpretation binding and `REPORT_MODELS` entry. Existing session `c0fa94cf-88aa-4fe6-b5b3-7dd1facd545f` completed at `2026-10-28 13:22:18 UTC`; Production Structured Result `01cd2c0c-1907-4284-ae51-f6dbc6d7f3ee` is persisted with all 12 answers and `FULL` coverage. Overall score is 66.5 with six measured axes. TFI is unavailable and economics are `NOT_COMPUTED`; neither should be fabricated in the user report. No new session or answer replay is needed.
- Scoring anchors remain provisional. The current shared projection emits global Q1–Q4 performance bands; those bands must not be described as calibrated for Clinic Matrix. The public report renderer was updated on `main` to show a neutral `نتيجة وصفية أولية` label, disclose that the anchors/bands are not calibrated, and suppress Q1–Q4 stage colors for this family only. This is a presentation-only change: no scoring, stored result, release digest, or Edge bundle was altered. The cache-busted page deployment is still being verified; do not claim the updated presentation is live until its exact Cloudflare deployment succeeds.
Status: Production V1 is published as of 2026-10-28. The scoring/content design notes below remain provisional; see the current Production recovery section before relying on runtime state.

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
The assessment-specific scoring-pipeline E2E passed in GitHub Actions P3 kernel verification before the current content corrections: all three Clinic Matrix cases passed (full Structured Result path, separate critical-conduct flags, and missing/unknown option behavior); that kernel job reported 98 passed and 0 failed tests. This is not a browser-to-database submission E2E or production verification. Historical Production snapshot as of 2026-10-27 (superseded by the 2026-10-28 Production recovery above): the assessment was still a draft with 6 axes, 12 questions, and 48 options; the option UUIDs were preserved. The import-identity migration is recorded as applied. The English question/option fields and clearly inconsistent ethical scoring anchors were corrected in source and applied to the existing draft by migration `20261027114146_clinic_matrix_draft_content_correction` (ledger identity verified). Post-migration checks confirm 12 English question fields and 48 English option labels are distinct from their Arabic counterparts; all 48 stable option UUIDs remain intact. At the time of that snapshot, the assessment was still `draft`; no release existed and nothing was published. The verified publication and current Edge binding are recorded above.

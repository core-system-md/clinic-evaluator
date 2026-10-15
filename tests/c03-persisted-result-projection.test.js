const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { projectCompletionResponse, ensureAssessmentSlug } = require('../supabase/functions/assessment-access/report-interpretation.mjs');

const edge = fs.readFileSync('supabase/functions/assessment-access/index.ts', 'utf8');

function persistedResult(slugMissing = true) {
  const result = {
    schemaVersion: 'P3_STRUCTURED_RESULT_V1',
    status: 'PRODUCTION',
    identity: {
      sessionId: 'session-1',
      assessmentFamilyId: 'family-1',
      assessmentTypeId: 'type-1',
      assessmentVersion: 1,
    },
    provenance: {
      scoringEngineVersion: 'engine-v1',
      scoringContractVersion: 'contract-v1',
      assessmentConfigDigest: 'digest',
    },
    scores: {
      overallScore: 70,
      axes: [{ axisCode: 'A1', axisNameAr: 'الثقة', axisNameEn: 'Trust', score: 70, percentage: 70, status: 'measured' }],
    },
    classification: { bandCode: 'Q3' },
    kpis: [],
    economics: { status: 'NOT_COMPUTED', output: null },
  };
  if (!slugMissing) result.provenance.assessmentSlug = 'clinic-performance';
  return result;
}

test('persisted result projection can recover missing assessmentSlug from resolved family context', () => {
  const persisted = persistedResult(true);
  assert.throws(() => projectCompletionResponse(persisted), /No approved report model/);
  const recovered = ensureAssessmentSlug(persisted, 'clinic-performance');
  assert.equal(recovered.provenance.assessmentSlug, 'clinic-performance');
  assert.equal(projectCompletionResponse(recovered).userReport.overall.value, 70);
  assert.equal(persisted.provenance.assessmentSlug, undefined, 'recovery must not mutate persisted payload');
});

test('persisted result projection preserves an existing family slug', () => {
  const persisted = persistedResult(false);
  const recovered = ensureAssessmentSlug(persisted, 'patient-journey');
  assert.equal(recovered.provenance.assessmentSlug, 'clinic-performance');
  assert.doesNotThrow(() => projectCompletionResponse(recovered));
});

test('every stored-result projection path supplies resolved assessment family context', () => {
  assert.match(edge, /async function resolvePersistedAssessmentSlug\(/);
  assert.match(edge, /ensureAssessmentSlug\(/);
  assert.match(edge, /projectCompletionResponse\(await resolvePersistedAssessmentSlug\(storedResult\.result, session\.assessment_type_id\), await getPreviousAssessmentSessionData\(session\)\)/);
  assert.equal(
    [...edge.matchAll(/projectCompletionResponse\(await resolvePersistedAssessmentSlug\(structured, session\.assessment_type_id\), previousSessionData\)/g)].length,
    2,
    'both completed and already-prepared completion branches must recover family context',
  );
});

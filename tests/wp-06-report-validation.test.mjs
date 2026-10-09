import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const interpretationModule = await import('../assets/js/report-interpretation.js');
const interpretation = interpretationModule.default || interpretationModule;
const validationModule = await import('../assets/js/report-validation.js');
const validation = validationModule.default || validationModule;

function resultFixture(overrides = {}) {
  return {
    schemaVersion: 'P3_STRUCTURED_RESULT_V1',
    status: 'PRODUCTION',
    identity: {
      resultId: 'r-1',
      assessmentFamilyId: 'family-1',
      assessmentTypeId: 'type-1',
      assessmentVersion: 1
    },
    provenance: {
      assessmentSlug: 'clinic-performance',
      scoringEngineVersion: 'MD_CODE_ASSESSMENT_ENGINE',
      scoringContractVersion: 'FINAL-IMPLEMENTATION-CONTRACT-2026-10-07',
      assessmentConfigDigest: 'digest-1'
    },
    classification: { bandCode: 'Q3' },
    scores: {
      overallScore: 72,
      axes: [
        { axisCode: 'A1', axisNameAr: 'محور 1', axisNameEn: 'Axis 1', percentage: 60, status: 'measured' },
        { axisCode: 'A2', axisNameAr: 'محور 2', axisNameEn: 'Axis 2', percentage: 84, status: 'measured' }
      ]
    },
    kpis: [
      { kpiCode: 'TFI', status: 'available', value: 70 },
      { kpiCode: 'NPI', status: 'partial', value: 50 }
    ],
    economics: {
      status: 'COMPUTED',
      output: { value: 1500, assumptions: { visitsPerYear: 3, referralPercentage: 0 } }
    },
    coverage: { coverageStatus: 'FULL', coverageRatio: 1 },
    consistency: { findings: [] },
    ...overrides
  };
}

test('WP-06 validates a clean user projection against Structured Result', () => {
  const structured = resultFixture();
  const report = interpretation.projectUserReport(structured, null, 'clinic-performance');
  assert.deepEqual(validation.validateUserReport(structured, report), { ok: true, issues: [] });
});

test('WP-06 rejects factual mismatch and ineligible KPI', () => {
  const structured = resultFixture();
  const report = interpretation.projectUserReport(structured, null, 'clinic-performance');
  report.overall.value = 71;
  report.kpis.push({ code: 'NPI', value: 50 });
  const result = validation.validateUserReport(structured, report);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(x => x.code === 'OVERALL_MISMATCH'));
  assert.ok(result.issues.some(x => x.code === 'KPI_INELIGIBLE'));
});

test('WP-06 fails closed on incompatible trend', () => {
  const structured = resultFixture();
  const previous = {
    assessmentFamilyId: 'other-family',
    assessmentVersion: 1,
    scoringEngineVersion: structured.provenance.scoringEngineVersion,
    scoringContractVersion: structured.provenance.scoringContractVersion,
    assessmentConfigDigest: structured.provenance.assessmentConfigDigest,
    overallScore: 60
  };
  const report = interpretation.projectUserReport(structured, previous, 'clinic-performance');
  assert.equal(report.trend.status, 'unavailable');
  assert.equal(validation.validateUserReport(structured, report).ok, true);
});

test('WP-06 preserves annual economic semantics and rejects tampering', () => {
  const structured = resultFixture();
  const report = interpretation.projectUserReport(structured, null, 'clinic-performance');
  assert.equal(report.economicOpportunity.visitsPerYear, 3);
  assert.equal(report.economicOpportunity.referralPercentage, 0);
  report.economicOpportunity.visitsPerYear = 30;
  const result = validation.validateUserReport(structured, report);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(x => x.code === 'ECONOMIC_ANNUAL_VISITS'));
});

test('WP-06 blocks prohibited internal user language', () => {
  const structured = resultFixture();
  const report = interpretation.projectUserReport(structured, null, 'clinic-performance');
  const result = validation.validateUserReport(structured, report, 'نتيجة Leakage داخل التقرير');
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(x => x.code === 'PROHIBITED_LANGUAGE'));
});

test('WP-06 admin projection retains audit evidence', () => {
  const structured = resultFixture();
  const report = interpretation.projectAdminReport(structured, null, 'clinic-performance');
  const result = validation.validateAdminReport(structured, report);
  assert.deepEqual(result, { ok: true, issues: [] });
});

test('WP-06 renderer is wired through interpretation and validation, not browser scoring', () => {
  const app = fs.readFileSync('assets/js/app.js', 'utf8');
  assert.match(app, /MDReportValidation\.assertValidUserProjection/);
  const edge = fs.readFileSync('supabase/functions/assessment-access/index.ts', 'utf8');
  assert.match(edge, /userReport/);
  assert.match(edge, /safeStoredResult/);
  assert.doesNotMatch(edge, /structuredResult:\s*storedStructured/);
  assert.doesNotMatch(edge, /structuredResult:\s*structured/);
  assert.doesNotMatch(app, /100\s*[-−]\s*res\.overallScore/);
  assert.doesNotMatch(app, /calculate.*score/i);
  assert.doesNotMatch(app, /this\.engine/);
});

test('WP-06 assessment pages load both report layers before app.js', () => {
  const pages = [
    'admin-reception-assessment.html',
    'clinic-performance.html',
    'comprehensive-clinic-assessment.html',
    'medical-team-assessment.html',
    'patient-journey.html'
  ];
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    const interpretationAt = html.indexOf('/assets/js/report-interpretation.js');
    const validationAt = html.indexOf('/assets/js/report-validation.js');
    const appAt = html.indexOf('/assets/js/app.js');
    assert.ok(interpretationAt >= 0 && validationAt >= 0 && appAt >= 0, page);
    assert.ok(interpretationAt < appAt && validationAt < appAt, page);
  }
});

test('WP-06 user transport returns a projected report rather than raw Structured Result', () => {
 const edge = fs.readFileSync('supabase/functions/assessment-access/index.ts', 'utf8');
 assert.match(edge, /projectCompletionResponse\(storedStructured, null\)\.userReport/);
 assert.match(edge, /safeStoredResult/);
 assert.match(fs.readFileSync('assets/js/report-validation.js','utf8'), /assertValidUserProjection/);
});

test('WP-06 frontend retains only temporary compatibility with the previous Edge payload shape', () => {
 const app = fs.readFileSync('assets/js/app.js', 'utf8');
 assert.match(app, /Rolling-deploy compatibility only/);
 assert.match(app, /legacyStructured/);
 const edge = fs.readFileSync('supabase/functions/assessment-access/index.ts', 'utf8');
 assert.doesNotMatch(edge, /structuredResult:\s*storedStructured/);
 assert.doesNotMatch(edge, /structuredResult:\s*structured/);
});

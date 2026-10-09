const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function createAppContext(cryptoApi = { randomUUID: () => 'generated-attempt-key' }) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="view-assessment"></div>
    <div id="view-loading"></div>
    <div id="view-results"></div>
    <div id="view-lead-form"></div>
    <div id="question-container"></div>
    <div id="progress-fill"></div>
    <div id="progress-text"></div>
    <button id="btn-prev"></button>
    <button id="btn-next"></button>
  </body></html>`, { url: 'http://localhost/' });

  const context = vm.createContext({
    console,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    location: dom.window.location,
    URLSearchParams: global.URLSearchParams,
    crypto: cryptoApi,
  });

  context.window.window = context.window;
  context.window.document = dom.window.document;
  context.window.localStorage = dom.window.localStorage;
  context.window.sessionStorage = dom.window.sessionStorage;
  context.window.console = console;
  context.window.fetch = context.fetch;
  context.window.setTimeout = global.setTimeout;
  context.window.clearTimeout = global.clearTimeout;
  context.window.setInterval = global.setInterval;
  context.window.clearInterval = global.clearInterval;

  const source = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'app.js' });
  const ClinicEvaluatorApp = vm.runInContext('ClinicEvaluatorApp', context);

  return { ClinicEvaluatorApp, document: dom.window.document, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage };
}

test('P4 shared attempt key is stable across app instances and can be cleared', () => {
  const { ClinicEvaluatorApp, localStorage } = createAppContext();
  const first = new ClinicEvaluatorApp();
  const second = new ClinicEvaluatorApp();
  first.currentAssessmentKey = 'patient-journey';
  second.currentAssessmentKey = 'patient-journey';

  const keyA = first.getSharedAttemptKey();
  const keyB = second.getSharedAttemptKey();

  assert.equal(keyA, 'generated-attempt-key');
  assert.equal(keyB, keyA);
  assert.equal(localStorage.getItem('assessment_attempt_key_patient-journey'), keyA);

  first.clearSharedAttemptKey();
  assert.equal(localStorage.getItem('assessment_attempt_key_patient-journey'), null);
});

test('P4 start flow works when crypto.randomUUID is unavailable', async () => {
  const bytes = new Uint8Array(16);
  bytes.fill(7);
  const cryptoApi = {
    getRandomValues: (target) => {
      target.set(bytes);
      return target;
    },
  };
  const { ClinicEvaluatorApp, localStorage } = createAppContext(cryptoApi);
  const app = new ClinicEvaluatorApp();

  app.currentAssessmentKey = 'patient-journey';
  app.assessment = {
    id: 'assessment-version-1',
    requires_login: false,
    questions: [{ id: 'Q1', options: [{ label: 'A' }] }],
  };
  app.assessmentUuid = 'assessment-version-1';
  app.metadata = {
    name: 'Test User',
    email: 'test@example.invalid',
    phone: '000',
    clinic: 'Test Clinic',
    country: 'JO',
    specialty: 'general',
    years: '1',
    team: '1',
  };
  app.showLoadingGlobal = () => {};
  app.renderQuestion = () => {};
  app.updateProgress = () => {};
  app.updateNavButtons = () => {};

  const calls = [];
  app.assessmentAccessRequest = async (action, data) => {
    calls.push({ action, data });
    if (action === 'issue_public_access') return { token: 'opaque-token' };
    if (action === 'start_session') {
      assert.match(data.attempt_key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      return {
        session_id: 'session-1',
        lead_id: 'lead-1',
        expires_at: new Date(Date.now() + 600000).toISOString(),
      };
    }
    throw new Error('Unexpected action: ' + action);
  };

  await app.startAssessmentFlow();

  assert.equal(app.currentSessionId, 'session-1');
  assert.equal(app.currentLeadId, 'lead-1');
  assert.equal(calls.map((call) => call.action).join(','), 'issue_public_access,start_session');
  assert.match(localStorage.getItem('assessment_attempt_key_patient-journey'), /^[0-9a-f-]{36}$/);
});

test('P4 keyboard answer waits for server persistence before advancing', async () => {
  const { ClinicEvaluatorApp, document } = createAppContext();
  const app = new ClinicEvaluatorApp();
  app.questions = [{
    id: 'Q1',
    options: [
      { value: 0 },
      { value: 40 },
    ],
  }];
  app.currentQuestionIndex = 0;

  const assessmentView = document.getElementById('view-assessment');
  assessmentView.classList.remove('hidden');

  let resolveSave;
  let nextCalls = 0;
  let saveCalls = 0;

  app.updateProgress = () => {};
  app.saveAnswerToServer = async () => {
    saveCalls += 1;
    await new Promise((resolve) => {
      resolveSave = resolve;
    });
  };
  app.goNext = () => {
    nextCalls += 1;
  };
  app.showError = () => {};

  app.setupKeyboardShortcuts();

  document.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'b' }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(saveCalls, 1);
  assert.equal(nextCalls, 0);
  assert.equal(app.answers.Q1.index, 1);

  resolveSave();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(nextCalls, 1);
});

test('P4 completed result is restored from the server-projected user report', () => {
  const { ClinicEvaluatorApp } = createAppContext();
  const app = new ClinicEvaluatorApp();
  app.currentSessionId = 'session-1';
  app.assessment = { version: 1 };

  const row = {
    userReport: {
      audience: 'user',
      assessment: { familyId: 'family-1', version: 1, purpose: 'test' },
      overall: { value: 82.5, bandCode: 'Q3', label: 'مرحلة النمو' },
      axes: [{ code: 'A1', nameAr: 'الثقة', percentage: 80, status: 'measured' }],
      kpis: [{ code: 'TFI', value: 76 }],
      economicOpportunity: null,
      trend: { status: 'unavailable', reason: 'no_comparison' },
      coverage: { status: 'FULL', ratio: 1 }
    },
    assessment_version: 1,
    interpretation_version: 1,
    scoring_engine_version: 'MD_CODE_ASSESSMENT_ENGINE',
    scoring_contract_version: 'FINAL_IMPLEMENTATION_CONTRACT-2026-10-07',
    assessment_config_digest: 'digest',
    calculated_at: '2026-10-03T08:00:00Z',
  };

  const projected = app.projectStoredResult(row);

  assert.equal(projected.overallScore, 82.5);
  assert.equal(projected.classification, 'Q3');
  assert.equal(projected.axisScores.A1, 80);
  assert.equal(projected.kpis.TFI, 76);
  assert.equal(projected.userReport.audience, 'user');
  assert.equal('structuredResult' in projected, false);
  assert.equal(projected.already_completed, true);
  assert.equal(projected.session_id, 'session-1');
});

test('P4 rolling deployment can project the previous Edge Function stored-result shape', () => {
  const { ClinicEvaluatorApp, document } = createAppContext();
  document.defaultView.MDReportInterpretation = require('../assets/js/report-interpretation.js');
  const app = new ClinicEvaluatorApp();
  app.currentSessionId = 'session-legacy';
  app.currentAssessmentKey = 'clinic-performance';
  app.assessment = { version: 1 };
  app.previousSessionData = null;
  const row = {
    result: {
      schemaVersion: 'P3_STRUCTURED_RESULT_V1',
      status: 'PRODUCTION',
      identity: { assessmentFamilyId: 'family-1', assessmentVersion: 1, assessmentTypeId: 'type-1' },
      provenance: { assessmentSlug: 'clinic-performance', scoringEngineVersion: 'MD_CODE_ASSESSMENT_ENGINE', scoringContractVersion: 'FINAL_IMPLEMENTATION_CONTRACT-2026-10-07', assessmentConfigDigest: 'digest' },
      classification: { bandCode: 'Q3' },
      scores: { overallScore: 82.5, axes: [{ axisCode: 'A1', axisNameAr: 'الثقة', axisNameEn: 'Trust', percentage: 80, status: 'measured' }] },
      kpis: [{ kpiCode: 'TFI', status: 'available', value: 76 }],
      economics: { status: 'NOT_COMPUTED' },
      coverage: { coverageStatus: 'FULL', coverageRatio: 1 }
    },
    assessment_version: 1
  };
  const projected = app.projectStoredResult(row);
  assert.equal(projected.overallScore, 82.5);
  assert.equal(projected.userReport.audience, 'user');
  assert.equal('structuredResult' in projected, false);
});

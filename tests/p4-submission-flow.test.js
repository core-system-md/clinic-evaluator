const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

function createAppContext() {
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
    crypto: {
      randomUUID: () => 'generated-attempt-key',
    },
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

test('P4 completed result is restored from stored Structured Result', () => {
  const { ClinicEvaluatorApp } = createAppContext();
  const app = new ClinicEvaluatorApp();
  app.currentSessionId = 'session-1';
  app.assessment = { version: 1 };

  const row = {
    result: {
      schemaVersion: 'P3_STRUCTURED_RESULT_V1',
      identity: { assessmentVersion: '1' },
      scores: {
        overallScore: 82.5,
        axes: [{ axisCode: 'A1', score: 80 }],
      },
      classification: { bandCode: 'Q3' },
      kpis: [{ kpiCode: 'TFI', value: 76, status: 'available' }],
    },
    assessment_version: 1,
    interpretation_version: 1,
    scoring_engine_version: 'P3_SCORER_V1',
    scoring_contract_version: 'P3_AGGREGATION_V1',
    assessment_config_digest: 'digest',
    calculated_at: '2026-10-03T08:00:00Z',
  };

  const projected = app.projectStoredResult(row);

  assert.equal(projected.overallScore, 82.5);
  assert.equal(projected.classification, 'Q3');
  assert.equal(projected.axisScores.A1, 80);
  assert.equal(projected.kpis.TFI, 76);
  assert.equal(projected.already_completed, true);
  assert.equal(projected.session_id, 'session-1');
});

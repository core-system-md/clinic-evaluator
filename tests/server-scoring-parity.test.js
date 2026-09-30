const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');

async function loadBrowserEngine() {
  const source = fs.readFileSync(path.join(__dirname, '../engine/engine.js'), 'utf8');
  const context = { console, Map, Set, Math, Object, Array, JSON };
  vm.createContext(context);
  vm.runInContext(source, context);
  return vm.runInContext('AssessmentEngine', context);
}

function fixture() {
  return {
    assessment_types: {
      parity: {
        axes: [
          { id: 'A1', name_ar: 'محور 1', name_en: 'Axis 1', weight: 2 },
          { id: 'A2', name_ar: 'محور 2', name_en: 'Axis 2', weight: 1 }
        ],
        questions: [
          { id: 'Q1', axis_id: 'A1', text: 'Q1', layer: 'A', impact: 'high', options: [{ label: '0', value: 0 }, { label: '100', value: 100 }] },
          { id: 'Q2', axis_id: 'A1', text: 'Q2', layer: 'A', impact: 'medium', options: [{ label: '0', value: 0 }, { label: '100', value: 100 }] },
          { id: 'Q3', axis_id: 'A2', text: 'Q3', layer: 'A', impact: 'low', options: [{ label: '0', value: 0 }, { label: '100', value: 100 }] },
          { id: 'Q4', axis_id: 'A2', text: 'Q4', layer: 'A', impact: 'medium', options: [{ label: '0', value: 0 }, { label: '100', value: 100 }] }
        ],
        traps: [
          { name: 'Consistency', message_ar: 'رسالة', question_id: 'Q2', validates: 'Q1', target_axis: 'A1', penalty_base: 15, penalty_max: 35 }
        ],
        axis_roles: { A1: 'TRUST', A2: 'COMMUNICATION' },
        kpi_mappings: { TFI: { TRUST: 0.4, COMMUNICATION: 0.6 } },
        ev_mappings: { TRUST: 0.5, COMMUNICATION: 0.5 },
        simulator: { enabled: true }
      }
    }
  };
}

function toServerShape(config) {
  const a = config.assessment_types.parity;
  return {
    axes: a.axes.map((x) => ({ code: x.id, name_ar: x.name_ar, name_en: x.name_en, weight: x.weight })),
    questions: a.questions.map((x) => ({
      code: x.id,
      axis_id: x.axis_id,
      layer: x.layer,
      impact: x.impact,
      options: x.options.map((o) => ({ value: o.value }))
    })),
    traps: a.traps,
    axis_roles: a.axis_roles,
    kpi_mappings: a.kpi_mappings,
    ev_mappings: a.ev_mappings,
    simulator: a.simulator
  };
}

test('server scorer stays behaviorally equivalent to browser engine', async () => {
  const BrowserEngine = await loadBrowserEngine();
  const { calculateAssessment } = await import(pathToFileURL(
    path.join(__dirname, '../supabase/functions/assessment-access/score-engine.ts')
  ).href);

  const testCases = [
    { name: 'all perfect', answers: { Q1: 100, Q2: 100, Q3: 100, Q4: 100 } },
    { name: 'trap divergence', answers: { Q1: 100, Q2: 0, Q3: 40, Q4: 100 } },
    { name: 'mixed baseline', answers: { Q1: 40, Q2: 100, Q3: 0, Q4: 40 } }
  ];

  for (const testCase of testCases) {
    const config = fixture();
    const browser = new BrowserEngine(config, {});
    const browserResult = browser.evaluate(testCase.answers, 'parity', { flow: 25, ltv: 1500 });
    const serverResult = calculateAssessment(toServerShape(config), testCase.answers, { flow: 25, ltv: 1500 });

    assert.deepEqual(serverResult.axisScores, browserResult.axisScores, testCase.name + ' axis scores');
    assert.equal(serverResult.overallScore, browserResult.overallScore, testCase.name + ' overall score');
    assert.equal(serverResult.classification, browserResult.classification, testCase.name + ' classification');
    assert.deepEqual(serverResult.kpis, browserResult.kpis, testCase.name + ' KPIs');
    assert.deepEqual(serverResult.evSimulator, browserResult.evSimulator, testCase.name + ' EV');
    assert.deepEqual(serverResult.traps, browserResult.traps, testCase.name + ' traps');
  }
});

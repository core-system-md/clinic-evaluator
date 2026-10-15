const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'supabase/functions/assessment-access/engine.ts',
  'utf8',
);
const digestSource = fs.readFileSync(
  'supabase/functions/assessment-access/assessment-config-digest.mjs',
  'utf8',
);

function fixture() {
  return {
    runtime: {
      family: { id: 'family-1', slug: 'clinic-performance' },
      assessment: {
        id: 'type-1', slug: 'clinic-performance--v1', config_version: 1,
        title_ar: 'أداء العيادة', title_en: 'Clinic performance', description: 'fixture',
        question_count: 1, axis_count: 1, has_traps: true, has_ev_simulator: false,
        axis_roles: { A1: 'TRUST' }, kpi_mappings: { TFI: { A1: 1 } }, ev_mappings: { x: 1 },
      },
      axes: [{
        id: 'axis-1', code: 'A1', weight: 100, title: 'Trust', title_ar: 'الثقة',
        description: 'axis description', display_order: 1,
      }],
      questions: [{
        id: 'question-1', code: 'Q1', axis_id: 'axis-1', question_text: 'Question',
        question_text_ar: 'السؤال', question_type: 'select', display_order: 1,
        is_required: true, impact: 'medium', layer: 'A', trap_for: null,
      }],
      options: [{
        id: 'option-1', question_id: 'question-1', option_index: 0, option_value: 70,
        label: 'Yes', label_ar: 'نعم', is_trap: false, display_order: 1,
      }],
      traps: [{
        name: 'trap-1', message: 'message', message_ar: 'رسالة', question_id: 'question-1',
        validates: 'Q1', target_axis: 'A1', penalty_base: 1, penalty_max: 2,
      }],
    },
    interpretationRegistry: {
      schemaVersion: 'REGISTRY_V2',
      entries: [{
        assessmentSlug: 'clinic-performance', interpretationVersion: 2, questionCode: 'Q1',
        optionIndex: 0, semanticStateKey: 'direct_anchor', semanticState: 'measured',
      }],
    },
    interpretationVersion: 2,
    consistencyRuleRegistry: {
      schemaVersion: 'CONSISTENCY_RULES_V1',
      rules: [{ ruleCode: 'R1', threshold: 1 }],
    },
    consistencyPairRegistry: {
      schemaVersion: 'CONSISTENCY_PAIRS_V1',
      pairs: [{
        assessmentSlug: 'clinic-performance', assessmentVersion: '1',
        relationshipType: 'validation', validatorQuestionCode: 'Q1', targetQuestionCode: 'Q2',
      }],
    },
  };
}

async function digest(input) {
  const { buildAssessmentConfigProjection, canonicalizeAssessmentConfig, sha256Hex } =
    await import('../supabase/functions/assessment-access/assessment-config-digest.mjs');
  return sha256Hex(canonicalizeAssessmentConfig(buildAssessmentConfigProjection(input)));
}

test('C-03 digest includes presentation, scoring, option, trap, and runtime policy fields', () => {
  const requiredFields = [
    'titleAr: runtime.assessment.title_ar',
    'versionSlug: runtime.assessment.slug',
    'titleEn: runtime.assessment.title_en',
    'description: runtime.assessment.description',
    'declaredQuestionCount: runtime.assessment.question_count',
    'declaredAxisCount: runtime.assessment.axis_count',
    'hasTraps: runtime.assessment.has_traps',
    'hasEvSimulator: runtime.assessment.has_ev_simulator',
    'axisRoles: runtime.assessment.axis_roles',
    'kpiMappings: runtime.assessment.kpi_mappings',
    'evMappings: runtime.assessment.ev_mappings',
    'displayOrder: Number(axis.display_order)',
    'description: axis.description',
    'text: question.question_text',
    'textAr: question.question_text_ar',
    'type: question.question_type',
    'trapFor: question.trap_for',
    'label: option.label',
    'labelAr: option.label_ar',
    'isTrap: option.is_trap',
    'displayOrder: Number(option.display_order)',
    'traps: [...(runtime.traps || [])]',
  ];

  for (const field of requiredFields) {
    assert.ok(digestSource.includes(field), `configuration digest projection is missing: ${field}`);
  }
});

test('C-03 digest loads trap and option configuration from the pinned assessment', () => {
  assert.match(
    source,
    /from\("traps"\)[\s\S]*?\.eq\("assessment_type_id", assessmentTypeId\)/,
  );
  assert.match(
    source,
    /from\("options"\)[\s\S]*?\.in\("question_id", questionIds\)/,
  );
  assert.match(
    source,
    /const assessmentConfigDigest = await sha256Hex\(canonicalizeAssessmentConfig\(versionedConfig\)\)/,
  );
});

test('C-03 canonical digest is stable across source row ordering and object key ordering', async () => {
  const a = fixture();
  const b = fixture();
  b.runtime.axes.reverse();
  b.runtime.questions.reverse();
  b.runtime.options.reverse();
  b.runtime.traps.reverse();
  b.interpretationRegistry.entries.reverse();
  b.consistencyRuleRegistry.rules.reverse();
  b.consistencyPairRegistry.pairs.reverse();
  b.runtime.assessment = Object.fromEntries(Object.entries(b.runtime.assessment).reverse());
  assert.equal(await digest(a), await digest(b));
});

test('C-03 every representative runtime and code-owned field mutation changes the digest', async () => {
  const mutations = [
    x => { x.runtime.assessment.title_ar += ' changed'; },
    x => { x.runtime.assessment.description += ' changed'; },
    x => { x.runtime.assessment.has_traps = false; },
    x => { x.runtime.assessment.has_ev_simulator = true; },
    x => { x.runtime.assessment.ev_mappings.x = 2; },
    x => { x.runtime.axes[0].weight = 99; },
    x => { x.runtime.axes[0].description += ' changed'; },
    x => { x.runtime.axes[0].display_order = 2; },
    x => { x.runtime.questions[0].question_text_ar += ' changed'; },
    x => { x.runtime.questions[0].question_type = 'text'; },
    x => { x.runtime.questions[0].is_required = false; },
    x => { x.runtime.options[0].option_value = 40; },
    x => { x.runtime.options[0].label_ar += ' changed'; },
    x => { x.runtime.options[0].is_trap = true; },
    x => { x.runtime.traps[0].penalty_max = 3; },
    x => { x.interpretationRegistry.entries[0].semanticStateKey = 'changed'; },
    x => { x.consistencyRuleRegistry.rules[0].threshold = 2; },
    x => { x.consistencyPairRegistry.pairs[0].relationshipType = 'different'; },
  ];

  const baseline = await digest(fixture());
  for (const mutate of mutations) {
    const changed = fixture();
    mutate(changed);
    assert.notEqual(await digest(changed), baseline, 'a runtime-relevant field mutation must change the digest');
  }
});

test('C-03 volatile audit timestamps are excluded from the canonical projection', async () => {
  const a = fixture();
  const b = fixture();
  b.runtime.assessment.created_at = '2026-10-15T00:00:00Z';
  b.runtime.axes[0].updated_at = '2026-10-15T00:00:00Z';
  b.runtime.questions[0].created_at = '2026-10-15T00:00:00Z';
  assert.equal(await digest(a), await digest(b));
});

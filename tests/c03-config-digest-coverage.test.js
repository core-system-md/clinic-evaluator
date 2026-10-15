const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(
  'supabase/functions/assessment-access/engine.ts',
  'utf8',
);

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
    'traps: runtime.traps',
  ];

  for (const field of requiredFields) {
    assert.ok(source.includes(field), `configuration digest projection is missing: ${field}`);
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
    /const assessmentConfigDigest = await sha256Hex\(stable\(versionedConfig\)\)/,
  );
});

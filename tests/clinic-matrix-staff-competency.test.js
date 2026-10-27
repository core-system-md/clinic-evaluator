const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const assessment = JSON.parse(fs.readFileSync('assessments/drafts/clinic-matrix-staff-competency.v1.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('supabase/functions/assessment-access/clinic-matrix-staff-competency-interpretation-draft.json', 'utf8'));
const engine = fs.readFileSync('supabase/functions/assessment-access/engine.ts', 'utf8');
const scorer = fs.readFileSync('supabase/functions/assessment-access/response-scorer.mts', 'utf8');
const importMigration = fs.readFileSync('supabase/migrations/20261027120000_clinic_matrix_stable_option_identity.sql', 'utf8');

test('Clinic Matrix draft has six weighted axes and twelve required questions', () => {
  assert.equal(assessment.slug, 'clinic-matrix-staff-competency');
  assert.equal(assessment.axes.length, 6);
  assert.equal(assessment.axes.reduce((sum, axis) => sum + axis.weight, 0), 100);
  assert.equal(assessment.axes.reduce((sum, axis) => sum + axis.questions.length, 0), 12);
  for (const axis of assessment.axes) {
    assert.equal(axis.questions.length, 2, axis.code);
    for (const question of axis.questions) {
      assert.equal(question.is_required, true, question.code);
      assert.equal(question.options.length, 4, question.code);
      assert.deepEqual(question.options.map(option => option.value), {
        Q1:[40,40,0,100], Q2:[40,100,40,40], Q3:[100,40,70,40],
        Q4:[0,0,100,0], Q5:[100,0,0,0], Q6:[0,0,100,0],
        Q7:[0,100,0,100], Q8:[0,0,100,40], Q9:[100,40,0,100],
        Q10:[100,0,0,100], Q11:[0,100,0,100], Q12:[0,0,100,0]
      }[question.code], question.code);
    }
  }
});

test('every option has an exact stable UUID interpretation binding', () => {
  assert.equal(registry.entries.length, 48);
  const optionIds = new Set();
  for (const axis of assessment.axes) {
    for (const question of axis.questions) {
      question.options.forEach((option, optionIndex) => {
        assert.match(option.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        assert.equal(optionIds.has(option.id), false, 'option UUID must be unique');
        optionIds.add(option.id);
        const matches = registry.entries.filter(entry =>
          entry.assessmentSlug === assessment.slug &&
          entry.assessmentVersion === '1' &&
          entry.questionCode === question.code &&
          entry.optionIndex === optionIndex
        );
        assert.equal(matches.length, 1, question.code + '[' + optionIndex + ']');
        assert.equal(matches[0].optionId, option.id);
        assert.equal(matches[0].anchorScore, option.value);
        assert.equal(matches[0].axisCode, axis.code);
        assert.equal(matches[0].interpretationVersion, 2);
      });
    }
  }
});

test('critical professional-conduct selections are flagged separately from score', () => {
  const flagged = registry.entries.filter(entry => entry.criticality === 'CRITICAL_FINDING');
  assert.deepEqual(flagged.map(entry => entry.questionCode + ':' + entry.optionIndex).sort(), ['Q10:1','Q6:3','Q8:0']);
  assert.ok(flagged.every(entry => entry.scoreEligible === true));
});

test('official engine and scorer explicitly bind the new assessment family', () => {
  assert.ok(engine.includes('"clinic-matrix-staff-competency:1"'));
  assert.ok(engine.includes('clinicMatrixRegistryV2'));
  assert.ok(scorer.includes('assessmentSlug === "clinic-matrix-staff-competency"'));
  assert.ok(scorer.includes('clinicMatrixRegistryV2.entries'));
});

test('canonical import preserves supplied option UUIDs and remains compatible with older imports', () => {
  assert.ok(importMigration.includes("nullif(v_opt->>'id','')::uuid"));
  assert.ok(importMigration.includes('gen_random_uuid()'));
  assert.ok(importMigration.includes("require_admin_capability('assessment.import')"));
  assert.ok(importMigration.includes("'draft'"));
});


test('Arabic and English question/option fields are distinct and scoring anchors match the canonical draft', () => {
  const arabic = /[؀-ۿ]/;
  for (const axis of assessment.axes) {
    assert.ok(axis.title && !arabic.test(axis.title), axis.code + ' English axis title');
    for (const question of axis.questions) {
      assert.ok(question.text && !arabic.test(question.text), question.code + ' English question text');
      assert.notEqual(question.text, question.text_ar, question.code + ' bilingual question fields must differ');
      for (const option of question.options) {
        assert.ok(option.label && !arabic.test(option.label), question.code + ' English option label');
        assert.notEqual(option.label, option.label_ar, question.code + ' bilingual option fields must differ');
        const entry = registry.entries.find(item => item.questionCode === question.code && item.optionId === option.id);
        assert.ok(entry, question.code + ' option registry entry');
        assert.equal(entry.anchorScore, option.value, question.code + ' score anchor parity');
        assert.equal(entry.sourceOptionValue, option.value, question.code + ' source value parity');
      }
    }
  }
});


test('draft-only content correction migration is guarded and never publishes', () => {
  const migration = fs.readFileSync('supabase/migrations/20261027133000_clinic_matrix_draft_content_correction.sql', 'utf8');
  assert.match(migration, /v_status <> 'draft'/);
  assert.match(migration, /v_question_count <> 12/);
  assert.match(migration, /v_option_count <> 48/);
  assert.match(migration, /published',false/);
  assert.match(migration, /release_created',false/);
  assert.doesNotMatch(migration, /UPDATE public\.assessment_families/i);
  assert.doesNotMatch(migration, /INSERT INTO public\.assessment_config_releases/i);
});

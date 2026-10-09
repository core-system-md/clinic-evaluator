import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const COMP = 'comprehensive-clinic-assessment';
const PATIENT = 'patient-journey';

test('WP-08 final artifacts are V1 and preserve required content counts', () => {
  const comp = JSON.parse(fs.readFileSync('documentation/governance/APPROVED-COMPREHENSIVE-CLINIC-V1-CONTENT-2026-10-08.json', 'utf8'));
  const patient = JSON.parse(fs.readFileSync('documentation/governance/APPROVED-PATIENT-JOURNEY-V1-CONTENT-2026-10-08.json', 'utf8'));

  assert.equal(comp.assessmentVersion, 1);
  assert.equal(comp.axes.length, 6);
  assert.equal(comp.questions.length, 36);
  assert.equal(comp.axes.reduce((sum, axis) => sum + Number(axis.weight), 0), 100);

  assert.equal(patient.assessmentVersion, 1);
  assert.equal(patient.axes.length, 5);
  assert.equal(patient.questions.length, 25);
  assert.equal(patient.questions.reduce((n, q) => n + q.options.length, 0), 96);
  assert.equal(patient.questions.filter(q => q.options.some(o => o.scoreMode === 'SEMANTIC_ONLY')).length, 1);
  assert.equal(patient.axes.reduce((sum, axis) => sum + Number(axis.weight), 0), 100);
});

test('WP-08 migration uses canonical percentage weights and validates totals', () => {
  const sql = fs.readFileSync('supabase/migrations/20261008120000_reconstruct_final_assessment_versions.sql', 'utf8');
  for (const term of [
    'assessment_results',
    'assessment_session_access',
    'current_published_version_id',
    'version=2',
    'delete from public.assessment_types',
    'final Comprehensive V1 axis weights must total 100',
    'final Patient Journey V1 axis weights must total 100'
  ]) assert.ok(sql.includes(term), term);
  assert.ok(!/a\.weight\s*\/\s*100\.0/.test(sql), 'final V1 migration must not store 0-1 axis weights');
  assert.ok(!sql.includes('update public.assessment_types set version=1'));
  assert.match(sql, /comprehensive-clinic-assessment-v1-final/);
  assert.match(sql, /patient-journey-v1-final/);
});

test('WP-08 canonical and packaged Consistency registries remain identical', () => {
  const canonical = JSON.parse(fs.readFileSync('documentation/architecture/P3-CONSISTENCY-PAIR-REGISTRY-V1.json', 'utf8'));
  const packaged = JSON.parse(fs.readFileSync('supabase/functions/assessment-access/consistency-pair-registry-v1.json', 'utf8'));
  assert.deepEqual(packaged, canonical);
  assert.equal(packaged.pairs.length, 108);
  assert.equal(packaged.pairs.filter(p => p.assessmentSlug === 'comprehensive-clinic-assessment' && p.assessmentVersion === '2').length, 52);
  assert.equal(packaged.pairs.filter(p => p.assessmentSlug === 'comprehensive-clinic-assessment' && p.assessmentVersion === '1').length, 52);
  assert.equal(packaged.pairs.filter(p => p.assessmentSlug === 'patient-journey' && p.assessmentVersion === '1').length, 4);
});

test('WP-08 V1 consistency configuration is an explicit translation of approved relationships', () => {
  const comp = JSON.parse(fs.readFileSync('documentation/governance/APPROVED-COMPREHENSIVE-CLINIC-V1-CONTENT-2026-10-08.json', 'utf8'));
  const patient = JSON.parse(fs.readFileSync('documentation/governance/APPROVED-PATIENT-JOURNEY-V1-CONTENT-2026-10-08.json', 'utf8'));
  const registry = JSON.parse(fs.readFileSync('supabase/functions/assessment-access/consistency-pair-registry-v1.json', 'utf8'));

  const key = p => `${p.assessmentSlug}|${p.assessmentVersion}|${p.validatorQuestionCode}|${p.targetQuestionCode}|${p.relationshipType}|${p.scoreEffectOverride?.mode || ''}|${p.scoreEffectOverride?.maxEffectiveAnchorScore ?? ''}`;

  const approvedComp = [];
  for (const q of comp.questions) {
    for (const target of q.trap_for || []) {
      approvedComp.push({
        assessmentSlug: COMP,
        assessmentVersion: '1',
        validatorQuestionCode: q.code,
        targetQuestionCode: target,
        relationshipType: 'HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION',
        scoreEffectOverride: { mode: 'CAP_VALIDATOR_ANCHOR', maxEffectiveAnchorScore: 70 }
      });
    }
  }

  const approvedPatient = (patient.consistencyPairs || []).map(p => ({
    assessmentSlug: PATIENT,
    assessmentVersion: '1',
    validatorQuestionCode: p.validatorQuestionCode,
    targetQuestionCode: p.targetQuestionCode,
    relationshipType: p.relationshipType,
    scoreEffectOverride: { mode: 'CAP_VALIDATOR_ANCHOR', maxEffectiveAnchorScore: p.maxEffectiveAnchorScore }
  }));

  const v1Pairs = registry.pairs.filter(p => p.assessmentVersion === '1');
  assert.equal(v1Pairs.filter(p => p.assessmentSlug === COMP).length, approvedComp.length);
  assert.equal(v1Pairs.filter(p => p.assessmentSlug === PATIENT).length, approvedPatient.length);

  const actualKeys = new Set(v1Pairs.map(key));
  for (const expected of [...approvedComp, ...approvedPatient]) assert.ok(actualKeys.has(key(expected)), key(expected));
});

test('WP-08 no user-facing V2 identity is introduced by final artifacts', () => {
  const files = [
    'documentation/governance/APPROVED-COMPREHENSIVE-CLINIC-V1-CONTENT-2026-10-08.json',
    'documentation/governance/APPROVED-PATIENT-JOURNEY-V1-CONTENT-2026-10-08.json'
  ];
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /"assessmentVersion"\s*:\s*2/);
  }
});

test('WP-08 production preconditions follow real schema and retire only legacy trap insights', () => {
 const sql = fs.readFileSync('supabase/migrations/20261008120000_reconstruct_final_assessment_versions.sql','utf8');
 assert.match(sql, /answers a join public\.sessions s on s\.id=a\.session_id where s\.assessment_type_id=old_type/);
 assert.match(sql, /left\(insight_code, 5\) <> 'TRAP_'/);
 assert.match(sql, /delete from public\.insights_mapping where assessment_type_id in/);
});

test('WP-08 rebuilds published V1 identities atomically under transaction-scoped table locks', () => {
 const sql = fs.readFileSync('supabase/migrations/20261008120000_reconstruct_final_assessment_versions.sql','utf8');
 for (const table of ['assessment_types','axes','questions','options','traps','insights_mapping','assessment_assets']) {
  assert.match(sql, new RegExp('alter table public\\.' + table + ' disable trigger user'));
  assert.match(sql, new RegExp('alter table public\\.' + table + ' enable trigger user'));
 }
 assert.match(sql, /update public\.assessment_families[\s\S]*current_published_version_id = null/);
 assert.match(sql, /delete from public\.assessment_types where id='d58150e6-9a85-4837-b41f-2a5f99682639'/);
});

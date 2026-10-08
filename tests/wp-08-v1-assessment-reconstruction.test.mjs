import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('WP-08 final artifacts are V1 and preserve required content counts', () => {
  const comp=JSON.parse(fs.readFileSync('documentation/governance/APPROVED-COMPREHENSIVE-CLINIC-V1-CONTENT-2026-10-08.json','utf8'));
  const patient=JSON.parse(fs.readFileSync('documentation/governance/APPROVED-PATIENT-JOURNEY-V1-CONTENT-2026-10-08.json','utf8'));
  assert.equal(comp.assessmentVersion,1);
  assert.equal(comp.axes.length,6); assert.equal(comp.questions.length,36);
  assert.equal(patient.assessmentVersion,1);
  assert.equal(patient.axes.length,5); assert.equal(patient.questions.length,25);
  assert.equal(patient.questions.reduce((n,q)=>n+q.options.length,0),96);
  assert.equal(patient.questions.filter(q=>q.options.some(o=>o.scoreMode==='SEMANTIC_ONLY')).length,1);
});

test('WP-08 migration contains dependency gate, family routing, and V2 removal', () => {
  const sql=fs.readFileSync('supabase/migrations/20261008120000_wp08_reconstruct_final_v1_assessments.sql','utf8');
  for(const term of ['assessment_results','assessment_session_access','current_published_version_id','version=2','delete from public.assessment_types']) assert.ok(sql.includes(term),term);
  assert.ok(!sql.includes('update public.assessment_types set version=1'));
  assert.match(sql,/comprehensive-clinic-assessment-v1-final/);
  assert.match(sql,/patient-journey-v1-final/);
});

test('WP-08 no user-facing V2 identity is introduced by final artifacts', () => {
  const files=[
    'documentation/governance/APPROVED-COMPREHENSIVE-CLINIC-V1-CONTENT-2026-10-08.json',
    'documentation/governance/APPROVED-PATIENT-JOURNEY-V1-CONTENT-2026-10-08.json'
  ];
  for(const f of files){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/"assessmentVersion"\s*:\s*2/);}
});

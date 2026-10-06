import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import registryV2 from "../supabase/functions/assessment-access/p3-response-interpretation-registry-v2.json" with { type: "json" };
import { scoreP3AssessmentV1 } from "../supabase/functions/assessment-access/p3-scorer-v1.mts";

function firstSelection(assessmentSlug) {
  const byQuestion = new Map();
  for (const entry of registry.entries.filter((e) => e.assessmentSlug === assessmentSlug)) {
    if (!byQuestion.has(entry.questionCode)) byQuestion.set(entry.questionCode, entry);
  }
  return [...byQuestion.values()].map((entry) => ({
    questionCode: entry.questionCode,
    optionId: entry.optionId,
    optionIndex: entry.optionIndex,
  }));
}

test("P3 scorer resolves selected option identity before aggregation",()=>{
 const selections=firstSelection("medical-team-assessment");
 const r=scoreP3AssessmentV1({assessmentSlug:"medical-team-assessment",selections});
 assert.equal(r.scorerVersion,"P3_SCORER_V1");
 assert.equal(new Set(r.selections.map(x=>x.questionCode)).size,12);
 assert.equal(r.profile.overallComposite,null);
});

test("Q2c9f29 option 2 uses interpretation anchor 40, not source option_value 0",()=>{
 const entry=registry.entries.find(e=>e.assessmentSlug==="medical-team-assessment"&&e.questionCode==="Q2c9f29"&&e.optionIndex===2);
 const r=scoreP3AssessmentV1({assessmentSlug:"medical-team-assessment",selections:[{questionCode:"Q2c9f29",optionId:entry.optionId,optionIndex:2}]});
 const resolved=r.selections.find(x=>x.questionCode==="Q2c9f29");
 assert.equal(resolved.sourceOptionValue,0);
 assert.equal(resolved.anchorScore,40);
 assert.equal(resolved.scoreEligible,true);
 assert.equal(resolved.optionId,entry.optionId);
 const bucket=r.profile.components.find(c=>c.componentCode==="C01")?.layers.find(l=>l.measurementLayer==="P/E");
 assert.equal(bucket?.score?.percentage,40);
});

test("interpretation version 2 resolves from the version 2 registry",()=>{
 const entry=registryV2.entries.find(e=>e.assessmentSlug==="comprehensive-clinic-assessment"&&e.questionCode==="CCV2Q01"&&e.optionIndex===1);
 assert.ok(entry);
 const r=scoreP3AssessmentV1({assessmentSlug:"comprehensive-clinic-assessment",interpretationVersion:2,selections:[{questionCode:entry.questionCode,optionId:entry.optionId,optionIndex:entry.optionIndex}]});
 const resolved=r.selections.find(x=>x.questionCode===entry.questionCode);
 assert.equal(r.scorerVersion,"P3_SCORER_V1");
 assert.equal(r.interpretationVersion,2);
 assert.equal(resolved?.optionId,entry.optionId);
 assert.equal(resolved?.anchorScore,entry.anchorScore);
});

test("missing questions create coverage gaps, not numeric zeros",()=>{
 const entry=registry.entries.find(e=>e.assessmentSlug==="patient-journey"&&e.questionCode==="Q4"&&e.optionIndex===2);
 const r=scoreP3AssessmentV1({assessmentSlug:"patient-journey",selections:[{questionCode:"Q4",optionId:entry.optionId,optionIndex:2}]});
 const bucket=r.profile.components.find(c=>c.componentCode==="C05")?.layers.find(l=>l.measurementLayer==="P/M");
 assert.ok((bucket?.missing ?? 0) >= 1);
 assert.equal(bucket?.score?.percentage,100);
 assert.equal(r.profile.overallComposite,null);
});

test("semantic-only Q7 remains non-numeric",()=>{
 const entries=registry.entries.filter(e=>e.assessmentSlug==="patient-journey"&&e.questionCode==="Q7");
 const r=scoreP3AssessmentV1({assessmentSlug:"patient-journey",selections:[{questionCode:"Q7",optionId:entries[2].optionId,optionIndex:2}]});
 const resolved=r.selections.find(x=>x.questionCode==="Q7");
 assert.equal(resolved.scoreMode,"SEMANTIC_ONLY");
 assert.equal(resolved.anchorScore,null);
 assert.equal(resolved.scoreEligible,false);
});

test("unknown option identity is rejected",()=>{
 assert.throws(()=>scoreP3AssessmentV1({assessmentSlug:"patient-journey",selections:[{questionCode:"Q1",optionId:"00000000-0000-0000-0000-000000000000",optionIndex:0}]}),/Unknown option identity/);
});

test("duplicate question selections are rejected",()=>{
 const entry=registry.entries.find(e=>e.assessmentSlug==="patient-journey"&&e.questionCode==="Q1");
 assert.throws(()=>scoreP3AssessmentV1({assessmentSlug:"patient-journey",selections:[
  {questionCode:"Q1",optionId:entry.optionId,optionIndex:entry.optionIndex},
  {questionCode:"Q1",optionId:entry.optionId,optionIndex:entry.optionIndex}
 ]}),/Duplicate selection/);
});

test("P3 scorer configuration is executable for all five assessment families",()=>{
 for(const slug of ["admin-reception-assessment","clinic-performance","medical-team-assessment","comprehensive-clinic-assessment","patient-journey"]){
  const r=scoreP3AssessmentV1({assessmentSlug:slug,selections:firstSelection(slug)});
  assert.equal(r.assessmentSlug,slug);
  assert.ok(r.profile.components.length>0);
  assert.equal(r.profile.overallComposite,null);
 }
});
console.log("P3 scorer V1: option identity -> interpretation -> profile path verified.");

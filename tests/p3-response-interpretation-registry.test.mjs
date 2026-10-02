import assert from "node:assert/strict";
import fs from "node:fs";
const r=JSON.parse(fs.readFileSync("documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json","utf8")),e=r.entries;
assert.equal(e.length,305);assert.equal(new Set(e.map(x=>`${x.assessmentSlug}|${x.questionCode}`)).size,93);assert.equal(new Set(e.map(x=>`${x.assessmentSlug}|${x.optionId}`)).size,305);
const req=["assessmentSlug","questionCode","optionId","optionIndex","semanticStateKey","measurementType","primaryConstruct","componentCode","measurementLayer","direction","scoreMode","anchorScaleId","scoreEligible","criticality","consistencyRole","evidenceRole","contextRequired","interpretationVersion"];
for(const x of e){for(const k of req)assert.ok(x[k]!==undefined&&x[k]!==null,`${x.questionCode}[${x.optionIndex}] missing ${k}`);assert.equal(typeof x.scoreEligible,"boolean");if(x.scoreMode==="DIRECT_ANCHOR"||x.scoreMode==="MATURITY_5_STATE"){assert.equal(typeof x.anchorScore,"number");assert.equal(x.anchorMax,100);}elseelse{assert.equal(x.anchorScore,null);assert.equal(x.scoreEligible,false);}}
const q2=e.find(x=>x.assessmentSlug==="medical-team-assessment"&&x.questionCode==="Q2c9f29"&&x.optionIndex===2);assert.equal(q2.anchorScore,40);assert.equal(q2.sourceOptionValue,0);
const q7=e.filter(x=>x.assessmentSlug==="patient-journey"&&x.questionCode==="Q7");assert.equal(q7.length,3);assert.ok(q7.every(x=>x.scoreMode==="SEMANTIC_ONLY"&&x.anchorScore===null));assert.ok(e.some(x=>x.sourceIsTrap));console.log("P3 interpretation registry: 305 options / 93 questions verified.");

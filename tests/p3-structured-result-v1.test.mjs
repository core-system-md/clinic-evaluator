import assert from "node:assert/strict";
import test from "node:test";
import { buildP3StructuredResultV1 } from "../supabase/functions/assessment-access/p3-structured-result-v1.mts";

const profile={components:[],overallComposite:null};
const coverage={expectedApplicableItems:2,answeredItems:2,interpretedItems:2,scoredItems:1,missingItems:0,semanticOnlyItems:1,evidenceOnlyItems:0,signalOnlyItems:0,unsupportedItems:0,notApplicableItems:0,coverageRatio:1,coverageStatus:"FULL",thresholdProfile:"STRUCTURAL_V1_UNCALIBRATED"};
const criticality={status:"ATTENTION",sourceItems:["Q15"],reviewRequired:true};
 const axisScores=[{axisCode:"A1",rawScore:70,maxPossible:100,score:70,weightedScore:70,weight:100,grade:"Q3",status:"measured"}];

test("structured result carries pinned identity and provenance",()=>{
 const r=buildP3StructuredResultV1({
  sessionId:"session-1",assessmentFamilyId:"family-1",assessmentTypeId:"type-1",assessmentVersion:"3",
  resultId:"result-1",calculatedAt:"2026-10-02T00:00:00Z",engineIdentity:"MD_CODE_ASSESSMENT_ENGINE",
  scoringContractVersion:"FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",assessmentConfigDigest:"sha256:test",
  interpretationVersion:"1",scoringEngineVersion:"MD_CODE_ASSESSMENT_ENGINE",inputLineage:["answers:a1"],
  responses:[{questionCode:"Q1",optionId:"o1",optionIndex:0,sourceOptionValue:0,semanticStateKey:"Q1_LOW",axisCode:"A1",componentCode:"C1",primaryConstruct:"C",measurementLayer:"M",scoreMode:"DIRECT_ANCHOR",scoreEligible:true,anchorScore:0,anchorMax:100}],
  profile,coverage,consistencyFindings:[],criticality,axisScores,
 });
 assert.equal(r.schemaVersion,"P3_STRUCTURED_RESULT_V1");assert.equal(r.identity.assessmentVersion,"3");
 assert.equal(r.provenance.interpretationVersion,"1");assert.equal(r.measurement.profile.overallComposite,null);
 assert.equal(r.scores.axes[0].rawScore,70);assert.equal(r.scores.axes[0].maxPossible,100);
 assert.equal(r.scores.axes[0].weightedScore,70);assert.equal(r.scores.axes[0].weight,100);
 assert.equal(r.economics.inputs.visitsPerYear,3);
});

test("structured result does not recompute or impute",()=>{
 const r=buildP3StructuredResultV1({
  sessionId:"session-1",assessmentFamilyId:"family-1",assessmentTypeId:"type-1",assessmentVersion:"3",
  resultId:"result-1",calculatedAt:"2026-10-02T00:00:00Z",engineIdentity:"MD_CODE_ASSESSMENT_ENGINE",
  scoringContractVersion:"FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",assessmentConfigDigest:"sha256:test",
  interpretationVersion:"1",scoringEngineVersion:"MD_CODE_ASSESSMENT_ENGINE",inputLineage:[],
  responses:[],profile,coverage,consistencyFindings:[],criticality,axisScores,roles:[{roleCode:"R1",status:"unavailable",sourceComponents:[],value:null,coverage:null,provenance:"not measured"}],
  kpis:[{kpiCode:"K1",status:"unavailable",value:null,inputComponents:[],coverage:null,mappingVersion:"1",provenance:"not measured"}],
 });
 assert.equal(r.roles[0].value,null);assert.equal(r.kpis[0].value,null);assert.equal(r.economics.status,"NOT_COMPUTED");
});

test("criticality becomes a diagnostic finding, never a numeric mutation",()=>{
 const r=buildP3StructuredResultV1({
  sessionId:"session-1",assessmentFamilyId:"family-1",assessmentTypeId:"type-1",assessmentVersion:"3",
  resultId:"result-1",calculatedAt:"2026-10-02T00:00:00Z",engineIdentity:"MD_CODE_ASSESSMENT_ENGINE",
  scoringContractVersion:"FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",assessmentConfigDigest:"sha256:test",
  interpretationVersion:"1",scoringEngineVersion:"MD_CODE_ASSESSMENT_ENGINE",inputLineage:[],
  responses:[],profile,coverage,consistencyFindings:[],criticality:{status:"CRITICAL_FINDING",sourceItems:["Q15"],reviewRequired:true},
 });
 assert.equal(r.diagnostics.findings.length,1);assert.equal(r.diagnostics.findings[0].sourceType,"CRITICALITY");
 assert.equal(r.measurement.profile.overallComposite,null);
});

test("incomplete provenance is rejected",()=>{
 assert.throws(()=>buildP3StructuredResultV1({
  sessionId:"",assessmentFamilyId:"family-1",assessmentTypeId:"type-1",assessmentVersion:"3",
  resultId:"result-1",calculatedAt:"2026-10-02T00:00:00Z",engineIdentity:"MD_CODE_ASSESSMENT_ENGINE",
  scoringContractVersion:"FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",assessmentConfigDigest:"sha256:test",
  interpretationVersion:"1",scoringEngineVersion:"MD_CODE_ASSESSMENT_ENGINE",inputLineage:[],
  responses:[],profile,coverage,consistencyFindings:[],criticality:{status:"NORMAL",sourceItems:[],reviewRequired:false},axisScores,
 }),/provenance/);
});
console.log("P3 structured result: deterministic assembly and provenance invariants verified.");

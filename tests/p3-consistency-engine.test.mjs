import assert from "node:assert/strict";
import test from "node:test";
import { evaluateP3Consistency } from "../supabase/functions/assessment-access/p3-consistency-engine.mts";
import catalog from "../documentation/architecture/P3-CONSISTENCY-RULE-REGISTRY-V1.json" with { type: "json" };

const base={assessmentSlug:"clinic-performance",assessmentVersion:"1",componentCode:"C10",answered:true,scoreEligible:true,anchorMax:100};
const ruleCatalog=catalog.rules;

test("all V1 consistency rules default to NONE",()=>assert.ok(ruleCatalog.every(r=>r.scoreEffect==="NONE")));

test("strong claim + evidence gap creates a finding, not a penalty",()=>{
 const finding=evaluateP3Consistency(ruleCatalog,{assessmentSlug:"clinic-performance",assessmentVersion:"1",relationshipType:"PRACTICE_CLAIM_VS_EVIDENCE_LIMITATION",
 validator:{...base,questionCode:"Q1",anchorScore:100,evidenceRole:"PRACTICE_CLAIM"},
 target:{...base,questionCode:"Q5",anchorScore:null,scoreEligible:false,evidenceRole:"EVIDENCE_GAP"}});
 assert.equal(finding?.findingCode,"UNVERIFIED_CLAIM");assert.equal(finding?.scoreEffect,"NONE");assert.equal(finding?.reviewRequired,true);
});

test("contextual variability does not become a lower numeric score",()=>{
 const finding=evaluateP3Consistency(ruleCatalog,{assessmentSlug:"medical-team-assessment",assessmentVersion:"1",relationshipType:"STANDARDIZATION_VS_PROVIDER_CASE_VARIABILITY",
 validator:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q1",anchorScore:100},
 target:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q2",anchorScore:null,scoreEligible:false,contextRequired:true}});
 assert.equal(finding?.findingCode,"VARIABILITY_SIGNAL");assert.equal(finding?.scoreEffect,"NONE");
});

test("missing input suppresses contradiction finding",()=>{
 const finding=evaluateP3Consistency(ruleCatalog,{assessmentSlug:"medical-team-assessment",assessmentVersion:"1",relationshipType:"RESILIENCE_CLAIM_VS_OPERATIONAL_DISRUPTION",
 validator:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q1",anchorScore:100},
 target:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q2",answered:false,anchorScore:null}});
 assert.equal(finding,null);
});

test("cross-assessment relationship is rejected",()=>{
 const finding=evaluateP3Consistency(ruleCatalog,{assessmentSlug:"medical-team-assessment",assessmentVersion:"1",relationshipType:"RESILIENCE_CLAIM_VS_OPERATIONAL_DISRUPTION",
 validator:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q1",anchorScore:100},
 target:{...base,assessmentSlug:"patient-journey",questionCode:"Q2",anchorScore:0}});
 assert.equal(finding,null);
});

test("critical contextual exception is a review signal only",()=>{
 const finding=evaluateP3Consistency(ruleCatalog,{assessmentSlug:"medical-team-assessment",assessmentVersion:"1",relationshipType:"CRITICAL_PRACTICE_VS_CONTEXTUAL_EXCEPTION",
 validator:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q1",anchorScore:100,criticality:"ATTENTION"},
 target:{...base,assessmentSlug:"medical-team-assessment",questionCode:"Q2",anchorScore:null,scoreEligible:false,contextRequired:true}});
 assert.equal(finding?.findingCode,"CRITICAL_CONTEXT_REVIEW");assert.equal(finding?.scoreEffect,"NONE");
});
console.log("P3 consistency: explicit relationship, same-scope, non-penalty verification passed.");

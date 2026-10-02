import assert from "node:assert/strict";
import test from "node:test";
import { buildP3Coverage, evaluateP3Criticality } from "../supabase/functions/assessment-access/p3-criticality-coverage-engine.mts";

test("full interpreted coverage is FULL without inventing a threshold",()=>{
 const c=buildP3Coverage([
  {questionCode:"Q1",answered:true,interpreted:true},
  {questionCode:"Q2",answered:true,interpreted:true},
 ]);
 assert.equal(c.coverageRatio,1);assert.equal(c.coverageStatus,"FULL");assert.equal(c.thresholdProfile,"STRUCTURAL_V1_UNCALIBRATED");
});

test("missing coverage is PARTIAL and never converted to zero",()=>{
 const c=buildP3Coverage([
  {questionCode:"Q1",answered:true,interpreted:true},
  {questionCode:"Q2",answered:false,interpreted:false},
 ]);
 assert.equal(c.missingItems,1);assert.equal(c.coverageRatio,.5);assert.equal(c.coverageStatus,"PARTIAL");
});

test("semantic interpretation counts as coverage without becoming a numeric score",()=>{
 const c=buildP3Coverage([{questionCode:"Q7",answered:true,interpreted:true,scoreClass:"SEMANTIC_ONLY"}]);
 assert.equal(c.coverageStatus,"FULL");assert.equal(c.scoredItems,0);assert.equal(c.semanticOnlyItems,1);
});

test("critical attention under incomplete coverage becomes UNVERIFIED",()=>{
 const c=buildP3Coverage([
  {questionCode:"Q15",answered:true,interpreted:true},
  {questionCode:"Q16",answered:false,interpreted:false},
 ]);
 const k=evaluateP3Criticality([{questionCode:"Q15",criticality:"ATTENTION",answered:true,interpreted:true}],c.coverageStatus);
 assert.equal(k.status,"UNVERIFIED");assert.equal(k.reviewRequired,true);
});

test("critical finding remains visible when coverage is full",()=>{
 const c=buildP3Coverage([{questionCode:"Q15",answered:true,interpreted:true}]);
 const k=evaluateP3Criticality([{questionCode:"Q15",criticality:"CRITICAL_FINDING",answered:true,interpreted:true}],c.coverageStatus);
 assert.equal(k.status,"CRITICAL_FINDING");assert.equal(k.reviewRequired,true);
});

test("unsupported numeric response is not treated as safe full coverage",()=>{
 const c=buildP3Coverage([{questionCode:"Q1",answered:true,interpreted:true,scoreClass:"UNSUPPORTED"}]);
 assert.equal(c.coverageStatus,"UNSUPPORTED");
 assert.equal(c.coverageRatio,1);
});

test("normal domain produces no critical review signal",()=>{
 const c=buildP3Coverage([{questionCode:"Q1",answered:true,interpreted:true}]);
 const k=evaluateP3Criticality([{questionCode:"Q1",criticality:"NORMAL",answered:true,interpreted:true}],c.coverageStatus);
 assert.equal(k.status,"NORMAL");assert.equal(k.reviewRequired,false);assert.deepEqual(k.sourceItems,[]);
});
console.log("P3 criticality/coverage: structural coverage and independent critical channel verified.");

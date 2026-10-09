import assert from "node:assert/strict";
import test from "node:test";
import { classifyP3HistoricalSession, historicalAction } from "./support/historical-result-reconciliation.mts";

test("fully answered and version-pinned history is replayable",()=>{
 const c=classifyP3HistoricalSession({expectedQuestions:25,answeredQuestions:25,optionIdentityResolved:true,assessmentVersionPinned:true,legacyScoreExists:true,scoreLineagePresent:true});
 assert.equal(c,"REPLAYABLE");assert.equal(historicalAction(c),"COMPUTE_P3_SHADOW_AND_COMPARE");
});

test("incomplete answers preserve the legacy result",()=>{
 const c=classifyP3HistoricalSession({expectedQuestions:9,answeredQuestions:0,optionIdentityResolved:false,assessmentVersionPinned:true,legacyScoreExists:true,scoreLineagePresent:true});
 assert.equal(c,"LEGACY_PRESERVE");assert.equal(historicalAction(c),"PRESERVE_LEGACY_ONLY");
});

test("no reliable lineage is not converted into a fabricated P3 result",()=>{
 const c=classifyP3HistoricalSession({expectedQuestions:12,answeredQuestions:0,optionIdentityResolved:false,assessmentVersionPinned:false,legacyScoreExists:false,scoreLineagePresent:false});
 assert.equal(c,"UNRECONSTRUCTABLE");assert.equal(historicalAction(c),"PRESERVE_AUDIT_RECORD_ONLY");
});

test("over-answering does not bypass identity/version requirements",()=>{
 const c=classifyP3HistoricalSession({expectedQuestions:9,answeredQuestions:10,optionIdentityResolved:false,assessmentVersionPinned:true,legacyScoreExists:true,scoreLineagePresent:true});
 assert.equal(c,"LEGACY_PRESERVE");
});
console.log("P3 historical reconciliation: classification is non-destructive and replay-gated.");

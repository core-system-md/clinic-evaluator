import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateAssessment } from '../supabase/functions/assessment-access/score-engine.ts';

const a={slug:'patient-journey',axes:[{code:'A1',weight:1},{code:'A2',weight:1}],questions:[
{code:'Q7',axis_id:'A1',options:[{id:'a',index:0,value:0},{id:'b',index:1,value:40},{id:'c',index:2,value:100}]},
{code:'Q8',axis_id:'A1',options:[{id:'d',index:0,value:0},{id:'e',index:1,value:40},{id:'f',index:2,value:100}]},
{code:'Q1',axis_id:'A2',options:[{id:'g',index:0,value:0},{id:'h',index:1,value:40},{id:'i',index:2,value:100}]}],
axis_roles:{A1:'JOURNEY',A2:'CONVERSION'},kpi_mappings:{TFI:{JOURNEY:1,TRUST:1}}};

test('semantic response is excluded from numeric denominator',()=>{const r=calculateAssessment(a,{Q7:{optionId:'c',optionIndex:2,value:100},Q8:{optionId:'f',optionIndex:2,value:100}});assert.equal(r.axisScores.A1,100);assert.equal(r.interpretations.Q7.scoreMode,'SEMANTIC_ONLY');});
test('missing roles remain unavailable',()=>{const r=calculateAssessment(a,{Q8:{optionId:'e',optionIndex:1,value:40}});assert.equal(r.axisScores.A1,40);assert.equal(r.roleScores.CONVERSION,undefined);assert.equal(r.kpis.TFI,40);});
test('option identity is independent from historical value',()=>{const r=calculateAssessment(a,{Q8:{optionId:'e',optionIndex:1,value:40}});assert.equal(r.interpretations.Q8.semanticStateKey,'OPTION_STATE:e');assert.equal(r.interpretations.Q8.anchorScore,40);});

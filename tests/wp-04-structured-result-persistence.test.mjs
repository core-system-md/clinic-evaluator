import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/assessment-calculation-pipeline.mts";
import { projectScoreRowsFromStructuredResult } from "../supabase/functions/assessment-access/result-persistence-projection.mts";

function selections(slug) {
  const seen = new Set();
  return registry.entries.filter((e) => e.assessmentSlug === slug)
    .filter((e) => !seen.has(e.questionCode) && seen.add(e.questionCode))
    .map((e) => ({ questionCode: e.questionCode, optionId: e.optionId, optionIndex: e.optionIndex }));
}
function resultFor(slug) {
  const family = config.families[slug];
  return scoreP3IntegratedV1({
    sessionId:"11111111-1111-4111-8111-111111111111",
    assessmentFamilyId:"22222222-2222-4222-8222-222222222222",
    assessmentTypeId:"33333333-3333-4333-8333-333333333333",
    assessmentVersion:String(family.version), interpretationVersion:1,
    resultId:"44444444-4444-4444-8444-444444444444",
    calculatedAt:"2026-10-08T00:00:00.000Z",
    scoringContractVersion:"FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest:"wp04-digest", assessmentSlug:slug,
    selections:selections(slug), axes:family.axes.map(([code,weight])=>({code,weight})),
    axisRoles:family.axisRoles, kpiMappings:config.kpiMappings,
    resultStatus:"PRODUCTION", engineIdentity:"MD_CODE_ASSESSMENT_ENGINE"
  });
}

test("WP-04 Structured Result is complete and replay-oriented", () => {
  const r=resultFor("patient-journey");
  for (const key of ["identity","provenance","inputs","measurement","scores","coverage","consistency","criticality","roles","kpis","economics","classification","diagnostics","audit"]) assert.ok(r[key]!==undefined,key);
  assert.equal(r.status,"PRODUCTION");
  assert.equal(r.schemaVersion,"P3_STRUCTURED_RESULT_V1");
  assert.ok(r.provenance.inputLineage.length>0);
  assert.ok(r.audit.replayableFrom.length>=5);
});

test("WP-04 measured axes preserve raw/max/percentage and calculation basis", () => {
  const r=resultFor("clinic-performance");
  for(const a of r.scores.axes.filter(a=>a.status==="measured")){
    assert.equal(a.score,a.percentage);
    assert.equal(typeof a.rawScore,"number");
    assert.equal(typeof a.maxPossible,"number");
    assert.ok(a.maxPossible>0);
    assert.ok(a.percentage>=0 && a.percentage<=100);
    assert.ok(a.weight>0 && a.weight<=1);
    assert.equal(a.weightedScore,a.percentage*a.weight);
  }
});

test("WP-04 persistence projector cannot observe answer/internal engine state", () => {
  const original=resultFor("patient-journey");
  const expected=projectScoreRowsFromStructuredResult(original);
  const changed=structuredClone(original);
  changed.inputs.responses=[];
  changed.provenance.inputLineage=[];
  changed.resolvedSelections=[{fake:true}];
  changed.axisPersistenceRows=[{fake:true}];
  assert.deepEqual(projectScoreRowsFromStructuredResult(changed),expected);
});

test("WP-04 completion entrypoint sends Structured Result as the only factual completion payload", () => {
  const source=fs.readFileSync("supabase/functions/assessment-access/index.ts","utf8");
  assert.match(source,/complete_protected_assessment_from_result/);
  assert.match(source,/complete_public_assessment_from_result/);
  for(const key of ["p_overall_score","p_classification","p_score_rows","p_assessment_version","p_interpretation_version","p_scoring_engine_version","p_scoring_contract_version","p_assessment_config_digest"]) assert.doesNotMatch(source,new RegExp(key+"\\s*:"));
});

test("WP-04 engine persists only a projection of the Structured Result", () => {
  const source=fs.readFileSync("supabase/functions/assessment-access/engine.ts","utf8");
  assert.match(source,/projectScoreRowsFromStructuredResult/);
  assert.ok(!source.includes("axisPersistenceRows(\n    result.resolvedSelections"));
});

test("WP-04 persistence migration rejects obsolete internal result fields", () => {
  const sql=fs.readFileSync("supabase/migrations/20261008100000_structured_result_authority.sql","utf8");
  assert.ok(sql.includes("p_result ? 'resolvedSelections'"));
  assert.ok(sql.includes("p_result ? 'axisPersistenceRows'"));
  assert.match(sql,/assessment_results/);
  assert.ok(sql.includes("jsonb_to_recordset(p_result->'scores'->'axes')"));
});

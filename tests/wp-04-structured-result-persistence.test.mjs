import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";
import { projectScoreRowsFromStructuredResult } from "../supabase/functions/assessment-access/p3-result-persistence-v1.mts";

function selections(slug) {
  const seen = new Set();
  return registry.entries
    .filter((e) => e.assessmentSlug === slug)
    .filter((e) => !seen.has(e.questionCode) && seen.add(e.questionCode))
    .map((e) => ({ questionCode: e.questionCode, optionId: e.optionId, optionIndex: e.optionIndex }));
}

function resultFor(slug) {
  const family = config.families[slug];
  return scoreP3IntegratedV1({
    sessionId: "11111111-1111-4111-8111-111111111111",
    assessmentFamilyId: "22222222-2222-4222-8222-222222222222",
    assessmentTypeId: "33333333-3333-4333-8333-333333333333",
    assessmentVersion: String(family.version),
    interpretationVersion: 1,
    resultId: "44444444-4444-4444-8444-444444444444",
    calculatedAt: "2026-10-08T00:00:00.000Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "wp04-digest",
    assessmentSlug: slug,
    selections: selections(slug),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings: config.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
  });
}

test("WP-04 Structured Result contains the complete factual contract needed for persistence", () => {
  const r = resultFor("patient-journey");
  for (const key of ["schemaVersion","status","identity","provenance","inputs","measurement","scores","coverage","consistency","criticality","roles","kpis","economics","classification","diagnostics","audit"]) {
    assert.ok(r[key] !== undefined, "missing " + key);
  }
  assert.equal(r.schemaVersion, "P3_STRUCTURED_RESULT_V1");
  assert.equal(r.status, "PRODUCTION");
  assert.equal(r.provenance.engineIdentity, "MD_CODE_ASSESSMENT_ENGINE");
  assert.equal(r.provenance.scoringContractVersion, "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07");
  assert.ok(r.provenance.inputLineage.length > 0);
  assert.ok(r.audit.replayableFrom.some((v) => v.includes("pinned assessment version")));
  assert.ok(r.audit.replayableFrom.some((v) => v.includes("assessment config digest")));
});

test("WP-04 every measured axis carries raw/max/percentage semantics in the Structured Result", () => {
  const r = resultFor("clinic-performance");
  const measured = r.scores.axes.filter((a) => a.status === "measured");
  assert.ok(measured.length > 0);
  for (const axis of measured) {
    assert.equal(typeof axis.score, "number");
    assert.equal(typeof axis.rawScore, "number");
    assert.equal(typeof axis.maxPossible, "number");
    assert.equal(typeof axis.percentage, "number");
    assert.equal(typeof axis.weight, "number");
    assert.equal(typeof axis.weightedScore, "number");
    assert.equal(axis.score, axis.percentage);
    assert.ok(axis.rawScore >= 0);
    assert.ok(axis.maxPossible > 0);
    assert.ok(axis.percentage >= 0 && axis.percentage <= 100);
  }
});

test("WP-04 persistence projection reads only Structured Result measurements", () => {
  const original = resultFor("patient-journey");
  const a = projectScoreRowsFromStructuredResult(original);
  const cloned = structuredClone(original);
  cloned.inputs.responses = [];
  cloned.provenance.inputLineage = [];
  cloned.consistency.findings = [];
  cloned.resolvedSelections = [{ fabricated: true }];
  cloned.axisPersistenceRows = [{ fabricated: true }];
  const b = projectScoreRowsFromStructuredResult(cloned);
  assert.deepEqual(b, a);
});

test("WP-04 canonical persistence path no longer sends duplicate score/provenance arguments", () => {
  const source = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(source, /complete_p4_assessment_from_result/);
  assert.match(source, /complete_p4_public_assessment_from_result/);
  assert.doesNotMatch(source, /p_score_rows:/);
  assert.doesNotMatch(source, /p_overall_score:/);
  assert.doesNotMatch(source, /p_interpretation_version:/);
  assert.doesNotMatch(source, /p_scoring_engine_version:/);
  assert.doesNotMatch(source, /p_scoring_contract_version:/);
  assert.doesNotMatch(source, /p_assessment_config_digest:/);
});

test("WP-04 engine persistence projection is result-derived rather than answer-derived", () => {
  const source = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
  assert.match(source, /projectScoreRowsFromStructuredResult/);
  assert.doesNotMatch(source, /axisPersistenceRows\(\s*result\.resolvedSelections/);
});

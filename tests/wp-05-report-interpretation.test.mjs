import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import reportApi from "../assets/js/report-interpretation.js";
const { REPORT_MODELS, projectUserReport, projectAdminReport, compatibleTrend, axisBandCode } = reportApi;

function makeResult() {
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: { sessionId: "s1", assessmentFamilyId: "family-1", assessmentTypeId: "type-1", assessmentVersion: "1", resultId: "r1", calculatedAt: "2026-10-08T00:00:00Z" },
    provenance: { assessmentSlug: "patient-journey", engineIdentity: "MD_CODE_ASSESSMENT_ENGINE", scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE", scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07", assessmentConfigDigest: "digest-1", interpretationVersion: "1", inputLineage: ["Q1:O1"] },
    inputs: { responses: [{ questionCode: "Q1", optionId: "O1", optionIndex: 0, sourceOptionValue: 0, semanticStateKey: "LOW" }] },
    measurement: { profile: {} },
    scores: {
      overallScore: 68,
      axes: [
        { axisCode: "A1", axisNameAr: "الثقة", axisNameEn: "Trust", percentage: 55, score: 55, rawScore: 55, maxPossible: 100, weight: 0.2, weightedScore: 11, status: "measured" },
        { axisCode: "A2", axisNameAr: "التواصل", axisNameEn: "Communication", percentage: 80, score: 80, rawScore: 80, maxPossible: 100, weight: 0.8, weightedScore: 64, status: "measured" }
      ]
    },
    coverage: { coverageRatio: 1, coverageStatus: "FULL" },
    consistency: { findings: [{ ruleId: "R1", ruleVersion: 1, findingCode: "INTERNAL", severity: "MATERIAL" }] },
    criticality: { status: "NORMAL", sourceItems: [], reviewRequired: false },
    development: { signals: [] },
    roles: [],
    kpis: [
      { kpiCode: "TFI", status: "available", value: 74, inputComponents: ["C1"], coverage: 1, mappingVersion: "1", provenance: "test" },
      { kpiCode: "PSI", status: "partial", value: 50, inputComponents: ["C2"], coverage: 0.5, mappingVersion: "1", provenance: "test" },
      { kpiCode: "RRI", status: "unavailable", value: null, inputComponents: [], coverage: 0, mappingVersion: "1", provenance: "test" }
    ],
    economics: { status: "COMPUTED", modelCode: "EV_V1", output: { value: 1800, unit: "currency", assumptions: { visitsPerYear: 3, referralPercentage: 20 } } },
    classification: { bandCode: "Q3", numericBasis: 68, bandDefinitionVersion: "P3_BANDS_V1", provenance: "test" },
    diagnostics: { findings: [] },
    audit: { replayableFrom: ["pinned assessment version"] }
  };
}

test("WP-05 user report projection", () => {
  const report = projectUserReport(makeResult(), null, "patient-journey");
  assert.equal(report.audience, "user");
  assert.equal(report.overall.value, 68);
  assert.equal(report.overall.bandCode, "Q3");
  assert.deepEqual(report.axes.map(a => a.code), ["A1", "A2"]);
  assert.deepEqual(report.kpis, [{ code: "TFI", value: 74 }]);
  assert.equal(report.priority.axisCode, "A1");
  assert.equal(report.priority.meaning, "lowest_measured_axis");
  assert.equal(report.strength.axisCode, "A2");
  assert.equal(report.strength.meaning, "highest_measured_axis");
  assert.equal(report.axes[0].bandCode, "Q3");
  assert.equal(report.economicOpportunity.visitsPerYear, 3);
  const serialized = JSON.stringify(report).toLowerCase();
  for (const key of ["consistency", "ruleid", "inputlineage", "rawscore", "maxpossible", "weight", "leakage", "trap"]) {
    assert.equal(serialized.includes(key), false, key);
  }
});

test("WP-05 admin report projection", () => {
  const report = projectAdminReport(makeResult(), null, "patient-journey");
  assert.equal(report.audience, "admin");
  assert.equal(report.consistency.findings.length, 1);
  assert.equal(report.kpis[1].status, "partial");
  assert.equal(report.kpis[2].status, "unavailable");
  assert.equal(report.provenance.engineIdentity, "MD_CODE_ASSESSMENT_ENGINE");
});

test("WP-05 trend comparison requires compatible basis", () => {
  const current = makeResult();
  const previous = { assessmentFamilyId: "family-1", assessmentVersion: "1", scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE", scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07", assessmentConfigDigest: "digest-1", overallScore: 60, completedAt: "2026-10-01T00:00:00Z" };
  const available = compatibleTrend(current, previous);
  assert.equal(available.status, "available");
  assert.equal(available.direction, "up");
  assert.equal(available.delta, 8);
  assert.equal(compatibleTrend(current, { ...previous, assessmentConfigDigest: "digest-2" }).status, "unavailable");
  assert.equal(compatibleTrend(current, { ...previous, assessmentFamilyId: "family-2" }).status, "unavailable");
  assert.equal(compatibleTrend(current, { ...previous, scoringContractVersion: undefined }).reason, "comparison_provenance_incomplete");
  assert.equal(compatibleTrend(current, { ...previous, overallScore: 68 }).direction, "stable");
});

test("WP-05 interpretation is primary for Structured Result and renderer consumes report semantics", () => {
  const app = fs.readFileSync("assets/js/app.js", "utf8");
  const edge = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  const renderer = app.slice(app.indexOf("  renderResults(res) {"), app.indexOf("  /* ─────────────── AXIS COMPARISON TABLE */"));
  assert.match(renderer, /projectUserReport\(\s*structuredResult,\s*this\.previousSessionData,\s*this\.currentAssessmentKey/);
  assert.match(renderer, /MDReportValidation\.assertValidUserReport\(structuredResult, report\)/);
  assert.match(renderer, /renderVisualBenchmark\(report\)/);
  assert.match(renderer, /report\.priority/);
  assert.match(renderer, /report\.strength/);
  assert.doesNotMatch(renderer, /Object\.entries\(res\.axisScores\)\.sort/);
  assert.doesNotMatch(renderer, /score\s*>=\s*75/);
  assert.doesNotMatch(renderer, /diff\s*>\s*0.*diff\s*</s);
  assert.match(edge, /projectCompletionResponse/);
  assert.match(app, /this\.previousSessionData = result\.previous_session \|\| null/);
  assert.ok(!app.includes("100 - res.overallScore"));
});

test("WP-05 every family has explicit modelled constructs, KPI eligibility, economic policy, claims and templates", () => {
  const axesByFamily = {
    "admin-reception-assessment": ["AX85a6e9", "AX765ca8", "AXa23fa3", "AXc39190"],
    "clinic-performance": ["A1", "A2", "A3"],
    "comprehensive-clinic-assessment": ["AX6f5aa5", "AX80c09a", "AXaadfb4", "AX2572cc", "AX6a52b4", "AX15afd8"],
    "medical-team-assessment": ["A1", "A2", "A3", "A4"],
    "patient-journey": ["A1", "A2", "A3", "A4", "A5"]
  };
  assert.deepEqual(Object.keys(REPORT_MODELS).sort(), Object.keys(axesByFamily).sort());
  for (const [slug, model] of Object.entries(REPORT_MODELS)) {
    assert.equal(model.modelVersion, "REPORT_MODEL_V1", slug);
    assert.deepEqual(model.measuredConstructs.map(item => item.axisCode), axesByFamily[slug], slug);
    assert.ok(model.measuredConstructs.every(item => item.constructRole), slug);
    assert.ok(model.supportedKpis.length, slug);
    assert.equal(typeof model.economic.enabled, "boolean", slug);
    assert.equal(model.economic.source, "assessment.has_ev_simulator", slug);
    assert.equal(model.economic.annualVisits, 3, slug);
    assert.equal(model.diagnosticMeanings.priority, "lowest_measured_axis", slug);
    assert.equal(model.diagnosticMeanings.strength, "highest_measured_axis", slug);
    assert.equal(model.diagnosticMeanings.evidenceBoundary, "measured_result_only", slug);
    assert.ok(model.permittedConclusions.includes("show_only_available_kpis"), slug);
    assert.ok(model.textTemplateCatalog.length, slug);
  }
  assert.equal(REPORT_MODELS["comprehensive-clinic-assessment"].economic.enabled, false);
  assert.equal(REPORT_MODELS["clinic-performance"].economic.enabled, true);
});

test("WP-05 rejects an unknown family and unmodelled axis instead of generic interpretation", () => {
  assert.throws(() => projectUserReport(makeResult(), null, "unknown-family"), /No approved report model/);
  const result = makeResult();
  result.scores.axes[0].axisCode = "UNKNOWN";
  assert.throws(() => projectUserReport(result, null, "patient-journey"), /outside the approved family report model/);
});

test("WP-05 family economic policy and computed status both control report availability", () => {
  const result = makeResult();
  result.provenance.assessmentSlug = "comprehensive-clinic-assessment";
  result.scores.axes = ["AX6f5aa5", "AX80c09a", "AXaadfb4", "AX2572cc", "AX6a52b4", "AX15afd8"]
    .map((axisCode, index) => ({ axisCode, axisNameAr: axisCode, percentage: 50 + index, status: "measured" }));
  assert.equal(projectUserReport(result, null, "comprehensive-clinic-assessment").economicOpportunity, null);

  const notComputed = makeResult();
  notComputed.economics = { status: "NOT_CONFIGURED", output: null };
  assert.equal(projectUserReport(notComputed, null, "patient-journey").economicOpportunity, null);
});

test("WP-05 history adapter obtains trend provenance from persisted results", () => {
  const edge = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(edge, /assessmentFamilyId: structured/);
  assert.match(edge, /scoring_engine_version/);
  assert.match(edge, /scoring_contract_version/);
  assert.match(edge, /assessment_config_digest/);
});

test("WP-05 band thresholds are centralized in the interpretation layer", () => {
  assert.equal(axisBandCode(74.99), "Q3");
  assert.equal(axisBandCode(75), "Q4");
  assert.equal(axisBandCode(50), "Q3");
  assert.equal(axisBandCode(25), "Q2");
  assert.equal(axisBandCode(24.99), "Q1");
});
test("WP-05 history adapter obtains trend provenance from persisted results", () => {
  const edge = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(edge, /assessmentFamilyId: structured/);
  assert.match(edge, /scoring_engine_version/);
  assert.match(edge, /scoring_contract_version/);
  assert.match(edge, /assessment_config_digest/);
});

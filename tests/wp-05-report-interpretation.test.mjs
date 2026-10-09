import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import reportApi from "../assets/js/report-interpretation.js";
const { projectUserReport, projectAdminReport, compatibleTrend } = reportApi;

function makeResult() {
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: { sessionId: "s1", assessmentFamilyId: "family-1", assessmentTypeId: "type-1", assessmentVersion: "1", resultId: "r1", calculatedAt: "2026-10-08T00:00:00Z" },
    provenance: { engineIdentity: "MD_CODE_ASSESSMENT_ENGINE", scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE", scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07", assessmentConfigDigest: "digest-1", interpretationVersion: "1", inputLineage: ["Q1:O1"] },
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
  assert.equal(report.strength.axisCode, "A2");
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
  assert.equal(compatibleTrend(current, previous).status, "available");
  assert.equal(compatibleTrend(current, { ...previous, assessmentConfigDigest: "digest-2" }).status, "unavailable");
  assert.equal(compatibleTrend(current, { ...previous, assessmentFamilyId: "family-2" }).status, "unavailable");
});

test("WP-05 app uses the report interpretation layer", () => {
  const app = fs.readFileSync("assets/js/app.js", "utf8");
  assert.match(app, /MDReportInterpretation\.projectUserReport/);
  assert.ok(!app.includes("100 - res.overallScore"));
});

test("WP-05 report model metadata is complete for every assessment family", () => {
  for (const [slug, model] of Object.entries(reportApi.REPORT_MODELS)) {
    assert.ok(model.measuredConstructs.length, slug);
    assert.ok(Object.keys(model.axisRoles).length, slug);
    assert.equal(model.diagnosticMeanings.lowestMeasuredAxis, "lowest_measured_axis_only");
    assert.ok(model.permittedConclusions.includes("report_measured_axis_values"));
    assert.ok(model.textTemplateCatalog.length, slug);
  }
});
test("WP-05 history adapter obtains trend provenance from persisted results", () => {
  const edge = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(edge, /assessmentFamilyId: structured/);
  assert.match(edge, /scoring_engine_version/);
  assert.match(edge, /scoring_contract_version/);
  assert.match(edge, /assessment_config_digest/);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import reportApi from "../assets/js/report-interpretation.js";
const { REPORT_MODELS, projectUserReport, projectAdminReport, compatibleTrend } = reportApi;

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
        { axisCode: "A2", axisNameAr: "التواصل", axisNameEn: "Communication", percentage: 80, score: 80, rawScore: 80, maxPossible: 100, weight: 0.5, weightedScore: 40, status: "measured" },
        { axisCode: "A3", axisNameAr: "الاستبقاء", axisNameEn: "Retention", percentage: 60, score: 60, rawScore: 60, maxPossible: 100, weight: 0.3, weightedScore: 18, status: "measured" }
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

function makePublicSource() {
  return {
    schemaVersion: "P3_REPORT_SOURCE_V1",
    status: "READY_FOR_USER_REPORT",
    assessment: { slug: "clinic-performance", version: "1" },
    overall: { value: 68, bandCode: "Q3" },
    axes: [
      { axisCode: "A1", axisNameAr: "الثقة", axisNameEn: "Trust", percentage: 55, status: "measured" },
      { axisCode: "A2", axisNameAr: "التواصل", axisNameEn: "Communication", percentage: 80, status: "measured" },
      { axisCode: "A3", axisNameAr: "الاستبقاء", axisNameEn: "Retention", percentage: 60, status: "measured" }
    ],
    kpis: [
      { kpiCode: "TFI", status: "available", value: 74 },
      { kpiCode: "PSI", status: "partial", value: 50 },
      { kpiCode: "RRI", status: "unavailable", value: null }
    ],
    economics: {
      status: "COMPUTED",
      output: { value: 1800, assumptions: { visitsPerYear: 3, referralPercentage: 20 } }
    },
    coverage: { coverageRatio: 1, coverageStatus: "FULL" }
  };
}

test("WP-05 user report projection", () => {
  const report = projectUserReport(makeResult(), null, "clinic-performance");
  assert.equal(report.audience, "user");
  assert.equal(report.overall.value, 68);
  assert.equal(report.overall.bandCode, "Q3");
  assert.deepEqual(report.axes.map(a => a.code), ["A1", "A3", "A2"]);
  assert.deepEqual(report.kpis, [{ code: "TFI", value: 74, textKey: "kpis.TFI" }]);
  assert.equal(report.priority.axisCode, "A1");
  assert.equal(report.strength.axisCode, "A2");
  assert.equal(report.economicOpportunity.visitsPerYear, 3);
  const serialized = JSON.stringify(report).toLowerCase();
  for (const key of ["consistency", "ruleid", "inputlineage", "rawscore", "maxpossible", "weight", "leakage", "trap"]) {
    assert.equal(serialized.includes(key), false, key);
  }
});



test("WP-05 report models explicitly define every required family boundary", () => {
  const expected = {
    "admin-reception-assessment": ["AX85a6e9", "AX765ca8", "AXa23fa3", "AXc39190"],
    "clinic-performance": ["A1", "A2", "A3"],
    "comprehensive-clinic-assessment": ["AX6f5aa5", "AX80c09a", "AXaadfb4", "AX2572cc", "AX6a52b4", "AX15afd8"],
    "medical-team-assessment": ["A1", "A2", "A3", "A4"],
    "patient-journey": ["A1", "A2", "A3", "A4", "A5"]
  };

  for (const [family, axisCodes] of Object.entries(expected)) {
    const model = REPORT_MODELS[family];
    assert.ok(model, family);
    assert.equal(model.modelVersion, "REPORT_MODEL_V1");
    assert.ok(model.purpose);
    assert.deepEqual(model.measuredConstructs.map(x => x.axisCode), axisCodes);
    assert.ok(Array.isArray(model.supportedKpis) && model.supportedKpis.length > 0);
    assert.ok(model.diagnosticMeanings?.priority);
    assert.ok(model.diagnosticMeanings?.strength);
    assert.ok(Array.isArray(model.permittedConclusions));
    assert.ok(model.textCatalog?.overallBand);
    assert.ok(model.textCatalog?.kpi);
    assert.equal(model.economic.annualVisits, 3);
  }
});

test("WP-05 family economic policy follows the explicit model", () => {
  const comprehensiveResult = makePublicSource();
  comprehensiveResult.axes = [
    "AX6f5aa5", "AX80c09a", "AXaadfb4", "AX2572cc", "AX6a52b4", "AX15afd8"
  ].map((axisCode, index) => ({
    axisCode,
    axisNameAr: axisCode,
    axisNameEn: axisCode,
    percentage: 60 + index,
    status: "measured"
  }));
  const comprehensive = projectUserReport(comprehensiveResult, null, "comprehensive-clinic-assessment");
  assert.equal(comprehensive.economicOpportunity, null);

  const clinicSource = makePublicSource();
  clinicSource.assessment.slug = "clinic-performance";
  const clinic = projectUserReport(clinicSource, null, "clinic-performance");
  assert.equal(clinic.economicOpportunity.visitsPerYear, 3);
});

test("WP-05 trend accepts only a server-verified compatible comparison", () => {
  const current = makeResult();
  assert.equal(
    compatibleTrend(makePublicSource(), { comparisonStatus: "compatible", overallScore: 60 }).status,
    "available"
  );
  assert.equal(
    compatibleTrend(makePublicSource(), { comparisonStatus: "incompatible", overallScore: 60 }).status,
    "unavailable"
  );
});



test("WP-05 server trend adapter verifies provenance before exposing comparison state", () => {
  const engine = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
  const access = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");

  assert.match(engine, /export async function getAssessmentProvenance/);
  assert.match(engine, /assessmentConfigDigest/);
  assert.match(access, /getAssessmentProvenance\(supabase, assessmentTypeId\)/);
  assert.match(access, /comparisonStatus: "compatible"/);
  assert.match(access, /comparisonStatus: "incompatible"/);
  assert.doesNotMatch(access, /previousSessionData:\s*\{[^}]*scoringEngineVersion:/);
});

test("WP-05 admin report projection", () => {
  const report = projectAdminReport(makeResult(), null, "patient-journey");
  assert.equal(report.audience, "admin");
  assert.equal(report.consistency.findings.length, 1);
  assert.equal(report.kpis[1].status, "partial");
  assert.equal(report.kpis[2].status, "unavailable");
  assert.equal(report.provenance.engineIdentity, "MD_CODE_ASSESSMENT_ENGINE");
});

test("WP-05 browser trend accepts only the server-verified comparison contract", () => {
  const source = makePublicSource();
  assert.equal(compatibleTrend(source, { comparisonStatus: "compatible", overallScore: 60 }).status, "available");
  assert.equal(compatibleTrend(source, {
    assessmentFamilyId: "family-1",
    assessmentVersion: "1",
    scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "digest-1",
    overallScore: 60
  }).status, "unavailable");
});

test("WP-05 app uses the report interpretation layer", () => {
  const app = fs.readFileSync("assets/js/app.js", "utf8");
  assert.match(app, /MDReportInterpretation\.projectUserReport/);
  assert.ok(!app.includes("100 - res.overallScore"));
  assert.ok(!app.includes("this.texts?.quartiles"));
  assert.ok(!app.includes("Object.entries(res.axisScores).sort"));
  assert.ok(!app.includes("previousSessionData.axisScores"));
  assert.ok(!app.includes("res?.structuredResult"));
  assert.ok(!app.includes("structuredResult:"));
});

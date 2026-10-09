import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  REPORT_MODELS,
  axisBandCode,
  compatibleTrend,
  projectCompletionResponse
} from "../supabase/functions/assessment-access/report-interpretation.mjs";

const AXES_BY_FAMILY = {
  "admin-reception-assessment": ["AX85a6e9", "AX765ca8", "AXa23fa3", "AXc39190"],
  "clinic-performance": ["A1", "A2", "A3"],
  "comprehensive-clinic-assessment": ["AX6f5aa5", "AX80c09a", "AXaadfb4", "AX2572cc", "AX6a52b4", "AX15afd8"],
  "medical-team-assessment": ["A1", "A2", "A3", "A4"],
  "patient-journey": ["A1", "A2", "A3", "A4", "A5"]
};

function makeResult(slug = "patient-journey", overrides = {}) {
  const codes = AXES_BY_FAMILY[slug];
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: {
      sessionId: "current-session",
      assessmentFamilyId: "family-" + slug,
      assessmentTypeId: "assessment-type-v1",
      assessmentVersion: "1",
      resultId: "result-current",
      calculatedAt: "2026-10-08T00:00:00Z"
    },
    provenance: {
      assessmentSlug: slug,
      engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
      scoringEngineVersion: "engine-v1",
      scoringContractVersion: "contract-v1",
      assessmentConfigDigest: "config-digest-v1",
      interpretationVersion: "1"
    },
    scores: {
      overallScore: 68,
      axes: codes.map((axisCode, index) => ({
        axisCode,
        axisNameAr: "محور " + (index + 1),
        axisNameEn: "Axis " + (index + 1),
        percentage: [35, 48, 62, 78, 90, 84][index],
        score: [35, 48, 62, 78, 90, 84][index],
        rawScore: 35 + index,
        maxPossible: 100,
        weight: 0.2,
        weightedScore: 7 + index,
        status: "measured"
      }))
    },
    classification: { bandCode: "Q3" },
    coverage: { coverageStatus: "FULL", coverageRatio: 1 },
    kpis: [
      { kpiCode: "TFI", status: "available", value: 74 },
      { kpiCode: "PSI", status: "partial", value: 50 },
      { kpiCode: "RRI", status: "unavailable", value: null }
    ],
    economics: {
      status: "COMPUTED",
      modelCode: "EV_V1",
      output: { value: 1800, unit: "currency", assumptions: { visitsPerYear: 3, referralPercentage: 20 } }
    },
    inputs: { responses: [{ questionCode: "Q1", optionId: "O1" }] },
    consistency: { findings: [{ ruleId: "INTERNAL" }] },
    ...overrides
  };
}

function previousFor(current, overrides = {}) {
  return {
    assessmentFamilyId: current.identity.assessmentFamilyId,
    assessmentVersion: current.identity.assessmentVersion,
    scoringEngineVersion: current.provenance.scoringEngineVersion,
    scoringContractVersion: current.provenance.scoringContractVersion,
    assessmentConfigDigest: current.provenance.assessmentConfigDigest,
    overallScore: 60,
    completedAt: "2026-10-01T00:00:00Z",
    ...overrides
  };
}

test("WP-05 projects user-safe facts and family interpretation from Structured Result", () => {
  const result = makeResult();
  const projection = projectCompletionResponse(result).userReport;
  assert.equal(projection.audience, "user");
  assert.equal(projection.assessment.purpose, REPORT_MODELS["patient-journey"].purpose);
  assert.equal(projection.overall.value, 68);
  assert.equal(projection.overall.bandCode, "Q3");
  assert.deepEqual(projection.axes.map(axis => axis.code), AXES_BY_FAMILY["patient-journey"]);
  assert.equal(projection.axes[0].bandCode, "Q2");
  assert.deepEqual(projection.kpis, [{ code: "TFI", value: 74 }]);
  assert.equal(projection.priority.axisCode, "A1");
  assert.equal(projection.priority.meaning, "lowest_measured_axis_only");
  assert.equal(projection.strength.axisCode, "A5");
  assert.equal(projection.strength.meaning, "highest_measured_axis_only");
  assert.equal(projection.economicOpportunity.visitsPerYear, 3);
  assert.equal(projection.economicOpportunity.referralPercentage, 20);
  const serialized = JSON.stringify(projection).toLowerCase();
  for (const forbidden of ["inputlineage", "scoringengineversion", "scoringcontractversion", "configdigest", "consistency", "ruleid", "rawscore", "maxpossible", "weight"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("WP-05 report models fully define the five deployed assessment families", () => {
  assert.deepEqual(Object.keys(REPORT_MODELS).sort(), Object.keys(AXES_BY_FAMILY).sort());
  for (const [slug, model] of Object.entries(REPORT_MODELS)) {
    assert.equal(model.modelVersion, "REPORT_MODEL_V1", slug);
    assert.deepEqual(Object.keys(model.axisRoles), AXES_BY_FAMILY[slug], slug);
    assert.deepEqual(model.measuredConstructs, Object.values(model.axisRoles), slug);
    assert.ok(model.userKpis.length > 0, slug);
    assert.equal(typeof model.economicAllowed, "boolean", slug);
    assert.equal(model.economicPolicySource, "assessment_types.has_ev_simulator", slug);
    assert.equal(model.diagnosticMeanings.lowestMeasuredAxis, "lowest_measured_axis_only", slug);
    assert.equal(model.diagnosticMeanings.highestMeasuredAxis, "highest_measured_axis_only", slug);
    assert.ok(model.permittedConclusions.includes("show_only_available_kpis"), slug);
    assert.ok(model.textTemplateCatalog.length > 0, slug);
  }
  assert.equal(REPORT_MODELS["comprehensive-clinic-assessment"].economicAllowed, false);
  assert.equal(REPORT_MODELS["clinic-performance"].economicAllowed, true);
});

test("WP-05 fails closed for an unknown family, duplicate axes, and axes outside its report model", () => {
  const unknownFamily = makeResult();
  unknownFamily.provenance.assessmentSlug = "unknown-family";
  assert.throws(() => projectCompletionResponse(unknownFamily), /No approved report model/);

  const duplicateAxis = makeResult();
  duplicateAxis.scores.axes.push({ ...duplicateAxis.scores.axes[0] });
  assert.throws(() => projectCompletionResponse(duplicateAxis), /missing or duplicated/);

  const unknownAxis = makeResult();
  unknownAxis.scores.axes[0] = { ...unknownAxis.scores.axes[0], axisCode: "UNMODELLED" };
  assert.throws(() => projectCompletionResponse(unknownAxis), /outside the approved family report model/);
});

test("WP-05 economic output requires both eligible family policy and computed evidence", () => {
  const result = makeResult("comprehensive-clinic-assessment");
  assert.equal(projectCompletionResponse(result).userReport.economicOpportunity, null);

  const noEvidence = makeResult("patient-journey", {
    economics: { status: "NOT_CONFIGURED", output: null }
  });
  assert.equal(projectCompletionResponse(noEvidence).userReport.economicOpportunity, null);
});

test("WP-05 trend interpretation requires complete compatible persisted provenance", () => {
  const current = makeResult();
  const previous = previousFor(current);
  const up = compatibleTrend(current, previous);
  assert.equal(up.status, "available");
  assert.equal(up.direction, "up");
  assert.equal(up.delta, 8);
  assert.equal(up.completedAt, previous.completedAt);
  assert.equal(compatibleTrend(current, { ...previous, assessmentConfigDigest: "different" }).status, "unavailable");
  assert.equal(compatibleTrend(current, { ...previous, assessmentFamilyId: "other-family" }).status, "unavailable");
  assert.equal(compatibleTrend(current, { ...previous, scoringContractVersion: null }).reason, "comparison_provenance_incomplete");
  assert.equal(compatibleTrend(current, { ...previous, overallScore: 68 }).direction, "stable");
  assert.equal(projectCompletionResponse(current, previous).userReport.trend.direction, "up");
});

test("WP-05 saved and fresh completion paths receive server-verified prior-session provenance", () => {
  const index = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
  assert.match(index, /async function getPreviousAssessmentSessionData\(session: any\)/);
  assert.match(index, /findLeadHistory\([\s\S]*?false,[\s\S]*?String\(session\.lead_id\)/);
  assert.match(index, /const previousSessionData = await getPreviousAssessmentSessionData\(session\)/);
  assert.match(index, /projectCompletionResponse\(storedStructured, previousSessionData\)/);
  assert.match(index, /projectCompletionResponse\(storedResult\.result, await getPreviousAssessmentSessionData\(session\)\)/);
  const history = index.slice(index.indexOf("async function findLeadHistory("), index.indexOf("async function getPreviousAssessmentSessionData("));
  assert.doesNotMatch(history, /if \(leads\.length < 2\) return/);
  assert.match(history, /if \(enforceCooldown && leads\.length >= 2 && elapsed < cooldown\)/);
  assert.match(history, /if \(excludeLeadId\) leadQuery = leadQuery\.neq\("id", excludeLeadId\)/);
});

test("WP-05 browser report rendering consumes the approved projection instead of interpreting raw scores", () => {
  const app = fs.readFileSync("assets/js/app.js", "utf8");
  const renderer = app.slice(app.indexOf("  renderResults(res) {"), app.indexOf("  /* ─────────────── AXIS COMPARISON TABLE ─────────────── */"));
  assert.match(renderer, /const report = res\?\.userReport \|\| null/);
  assert.match(renderer, /assertValidUserProjection\(report/);
  assert.match(renderer, /report\.trend\.direction/);
  assert.match(renderer, /axis\.bandCode/);
  assert.match(renderer, /report\.priority/);
  assert.match(renderer, /report\.strength/);
  assert.match(renderer, /renderVisualBenchmark\(report\)/);
  assert.doesNotMatch(renderer, /Object\.entries\(res\.axisScores\)\.sort/);
  assert.doesNotMatch(renderer, /score\s*>=\s*75/);
  assert.doesNotMatch(renderer, /diff\s*>\s*0/);
  assert.doesNotMatch(renderer, /structuredResult/);
  const benchmark = app.slice(app.indexOf("  renderVisualBenchmark(report) {"), app.indexOf("  /* ─────────────── EV SIMULATOR */"));
  assert.doesNotMatch(benchmark, /\bres\./);
});

test("WP-05 axis score bands have explicit boundary behavior", () => {
  assert.equal(axisBandCode(74.99), "Q3");
  assert.equal(axisBandCode(75), "Q4");
  assert.equal(axisBandCode(50), "Q3");
  assert.equal(axisBandCode(25), "Q2");
  assert.equal(axisBandCode(24.99), "Q1");
});

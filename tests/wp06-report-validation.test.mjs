import assert from "node:assert/strict";
import test from "node:test";
import { interpretAssessmentResult } from "../supabase/functions/assessment-access/report-interpretation-v1.ts";
import { validateReport } from "../supabase/functions/assessment-access/report-validation-v1.ts";

function baseResult() {
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: {
      sessionId: "s",
      assessmentFamilyId: "f",
      assessmentSlug: "patient-journey",
      assessmentTypeId: "t",
      assessmentVersion: "1",
      resultId: "r",
      calculatedAt: "2026-10-07T00:00:00Z",
    },
    provenance: {
      engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
      scoringContractVersion: "FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",
      assessmentConfigDigest: "d",
      interpretationVersion: "1",
      scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
      inputLineage: [],
    },
    inputs: { responses: [] },
    measurement: { profile: {} },
    scores: {
      overallScore: 70,
      axes: [
        { axisCode: "A1", rawScore: 60, maxPossible: 100, score: 60, weightedScore: 30, weight: 50, grade: "Q3", status: "measured" },
        { axisCode: "A2", rawScore: 80, maxPossible: 100, score: 80, weightedScore: 40, weight: 50, grade: "Q4", status: "measured" },
      ],
    },
    coverage: {},
    consistency: { findings: [] },
    criticality: { status: "NORMAL", sourceItems: [], reviewRequired: false },
    development: { signals: [] },
    roles: [],
    kpis: [
      { kpiCode: "PSI", status: "available", value: 90, inputComponents: [], coverage: 1, mappingVersion: "1", provenance: "test" },
    ],
    economics: {
      status: "COMPUTED",
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      inputs: { averageVisitValue: 100, visitsPerYear: 3, relationshipYears: 3, referralPercentage: 20 },
      output: {
        value: 225,
        unit: "currency",
        basis: "INCREMENTAL_REFERRAL_OPPORTUNITY",
        assumptions: { visitsPerYear: 3, referralPercentage: 20 },
      },
    },
    classification: {
      bandCode: "Q3",
      numericBasis: 70,
      bandDefinitionVersion: "P3_BANDS_V1",
      provenance: "test",
    },
    diagnostics: { findings: [] },
    audit: { replayableFrom: ["answers", "economic inputs"] },
  };
}

test("report validation accepts a result-consistent projection", () => {
  const result = baseResult();
  const interpretation = interpretAssessmentResult(result);
  const validation = validateReport(result, interpretation);
  assert.equal(validation.valid, true);
  assert.equal(validation.checks.structuredResultConsistency, true);
});

test("report validation rejects unsupported user KPI exposure", () => {
  const result = baseResult();
  const interpretation = interpretAssessmentResult(result);
  interpretation.user.kpis.push({
    kpiCode: "UNSUPPORTED",
    status: "available",
    value: 1,
    coverage: 1,
    evidence: "STRUCTURED_RESULT_KPI",
  });
  assert.throws(
    () => validateReport(result, interpretation),
    /unsupported KPI exposed/,
  );
});

test("report validation rejects user-visible internal terms", () => {
  const result = baseResult();
  const interpretation = interpretAssessmentResult(result);
  assert.throws(
    () => validateReport(result, interpretation, "Consistency rule triggered"),
    /forbidden user report term: consistency/,
  );
});

test("report validation rejects stale axis evidence", () => {
  const result = baseResult();
  const interpretation = interpretAssessmentResult(result);
  interpretation.user.gaps[0].score = 99;
  assert.throws(
    () => validateReport(result, interpretation),
    /axis projection mismatch/,
  );
});

console.log("WP-06 report validation gate: projection and visibility invariants verified.");

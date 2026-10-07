import assert from "node:assert/strict";
import test from "node:test";
import { interpretAssessmentResult } from "../supabase/functions/assessment-access/report-interpretation-v1.ts";

function result(overrides = {}) {
  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: {
      sessionId: "session-1",
      assessmentFamilyId: "family-1",
      assessmentSlug: "patient-journey",
      assessmentTypeId: "type-1",
      assessmentVersion: "1",
      resultId: "result-1",
      calculatedAt: "2026-10-07T00:00:00Z",
    },
    provenance: {
      engineIdentity: "MD_CODE_ASSESSMENT_ENGINE",
      assessmentVersion: "1",
      interpretationVersion: "1",
      scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
      scoringContractVersion: "FINAL-IMPLEMENTATION-CONTRACT-2026-10-07",
      assessmentConfigDigest: "digest",
      inputLineage: ["Q1:o1"],
    },
    inputs: { responses: [] },
    measurement: { profile: { components: [], overallComposite: null } },
    scores: {
      overallScore: 72,
      axes: [
        { axisCode: "A1", rawScore: 80, maxPossible: 100, score: 80, weightedScore: 16, weight: 20, grade: "Q4", status: "measured" },
        { axisCode: "A2", rawScore: 45, maxPossible: 100, score: 45, weightedScore: 9, weight: 20, grade: "Q2", status: "measured" },
        { axisCode: "A3", rawScore: 60, maxPossible: 100, score: 60, weightedScore: 15, weight: 25, grade: "Q3", status: "measured" },
        { axisCode: "A4", rawScore: 70, maxPossible: 100, score: 70, weightedScore: 17.5, weight: 25, grade: "Q3", status: "measured" },
        { axisCode: "A5", rawScore: 65, maxPossible: 100, score: 65, weightedScore: 9.75, weight: 15, grade: "Q3", status: "measured" },
      ],
    },
    classification: {
      bandCode: "Q3",
      numericBasis: 72,
      bandDefinitionVersion: "P3_BANDS_V1",
      provenance: "test",
    },
    coverage: {},
    consistency: {
      findings: [{
        findingCode: "INTERNAL_RULE",
        severity: "MATERIAL",
        scoreEffect: "NONE",
      }],
    },
    criticality: {
      status: "ATTENTION",
      sourceItems: ["Q1"],
      reviewRequired: true,
    },
    diagnostics: {
      findings: [{
        findingCode: "DIAGNOSTIC_1",
        sourceType: "CRITICALITY",
        explanation: "Internal diagnostic evidence.",
      }],
    },
    roles: [],
    kpis: [
      { kpiCode: "PSI", status: "partial", value: 61, coverage: 0.8 },
      { kpiCode: "NOT_SUPPORTED", status: "available", value: 99, coverage: 1 },
    ],
    economics: {
      status: "COMPUTED",
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      inputs: {
        averageVisitValue: 100,
        visitsPerYear: 3,
        relationshipYears: 3,
        referralPercentage: 20,
      },
      output: {
        value: 225,
        unit: "currency",
        basis: "INCREMENTAL_REFERRAL_OPPORTUNITY",
        assumptions: {
          visitsPerYear: 3,
          referralPercentage: 20,
        },
      },
    },
    diagnostics: { findings: [] },
    audit: { replayableFrom: ["answers", "economic inputs"] },
    ...overrides,
  };
}

test("report interpretation ranks measured strengths/gaps without rescoring", () => {
  const interpreted = interpretAssessmentResult(result());
  assert.equal(interpreted.user.overall.score, 72);
  assert.deepEqual(interpreted.user.strengths[0], {
    axisCode: "A1",
    score: 80,
    rank: 1,
    evidence: "MEASURED_AXIS_SCORE",
  });
  assert.deepEqual(interpreted.user.gaps[0], {
    axisCode: "A2",
    score: 45,
    rank: 1,
    evidence: "MEASURED_AXIS_SCORE",
  });
});

test("user projection exposes only supported KPI evidence and computed economics", () => {
  const user = interpretAssessmentResult(result()).user;
  assert.deepEqual(user.kpis.map((kpi) => kpi.kpiCode), ["PSI"]);
  assert.equal(user.economicOpportunity.status, "computed");
  assert.equal(user.economicOpportunity.value, 225);
  assert.equal(user.economicOpportunity.basis, "INCREMENTAL_REFERRAL_OPPORTUNITY");
});

test("user projection does not expose internal consistency, rule ids, provenance, or leakage", () => {
  const interpreted = interpretAssessmentResult(result());
  assert.equal(Object.hasOwn(interpreted.user, "provenance"), false);
  assert.equal(Object.hasOwn(interpreted.user, "assessmentVersion"), false);
  assert.equal(interpreted.visibilityPolicy.user.exposeConsistencyMechanics, false);
  assert.equal(interpreted.visibilityPolicy.user.exposeRuleIdentifiers, false);
  assert.equal(interpreted.visibilityPolicy.user.exposeLeakageMetric, false);
  assert.equal(Object.hasOwn(interpreted.user, "consistency"), false);
});

test("Comprehensive staged V2 is accepted internally but version is not a user report field", () => {
  const comprehensive = result({
    identity: {
      ...result().identity,
      assessmentSlug: "comprehensive-clinic-assessment",
      assessmentVersion: "2",
    },
  });
  const interpreted = interpretAssessmentResult(comprehensive);
  assert.equal(interpreted.model.modelCode, "COMPREHENSIVE_CLINIC_REPORT_V1");
  assert.equal(Object.hasOwn(interpreted.user, "assessmentVersion"), false);
  assert.equal(interpreted.admin.assessmentVersion, 2);
});

test("report interpretation fails closed for an unknown family", () => {
  assert.throws(
    () => interpretAssessmentResult(result({
      identity: { ...result().identity, assessmentSlug: "unknown-family" },
    })),
    /No report model for assessment family/,
  );
});

console.log("WP-05 report interpretation: deterministic user/admin projections verified.");

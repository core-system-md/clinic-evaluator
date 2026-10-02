import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";

const families = config.families;
const kpiMappings = config.kpiMappings;

function uniqueQuestionCodes(slug) {
  return [...new Set(registry.entries.filter((e) => e.assessmentSlug === slug).map((e) => e.questionCode))];
}

function firstSelection(slug) {
  const seen = new Set();
  return registry.entries
    .filter((e) => e.assessmentSlug === slug)
    .filter((e) => !seen.has(e.questionCode) && seen.add(e.questionCode))
    .map((e) => ({ questionCode: e.questionCode, optionId: e.optionId, optionIndex: e.optionIndex }));
}

function run(slug, extra = {}) {
  const family = families[slug];
  assert.ok(family, `missing fixture for ${slug}`);
  return scoreP3IntegratedV1({
    sessionId: "00000000-0000-0000-0000-000000000001",
    assessmentFamilyId: "family-1",
    assessmentTypeId: `type-${slug}`,
    assessmentVersion: String(family.version),
    resultId: "result-1",
    calculatedAt: "2026-10-02T00:00:00Z",
    scoringContractVersion: "P3_CONTRACT_V1",
    assessmentConfigDigest: "fixture-digest",
    assessmentSlug: slug,
    selections: firstSelection(slug),
    axes: family.axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: family.axisRoles,
    kpiMappings,
    ...extra,
  });
}

test("all five published families execute through the single integrated path", () => {
  for (const [slug, family] of Object.entries(families)) {
    const questionCount = uniqueQuestionCodes(slug).length;
    const result = run(slug);

    assert.ok(questionCount > 0);
    assert.equal(result.identity.assessmentVersion, String(family.version));
    assert.equal(result.scores.axes.length, family.axes.length);
    assert.ok(result.scores.overallScore !== null);

    const weightSum = result.scores.axes.reduce((sum, axis) => sum + axis.weight, 0);
    assert.equal(weightSum, 1);
    assert.equal(result.provenance.scoringContractVersion, "P3_CONTRACT_V1");
    assert.equal(result.schemaVersion, "P3_STRUCTURED_RESULT_V1");
    assert.equal(result.status, "NON_PRODUCTION");
  }
});

test("axis and overall projection exclude unavailable dimensions rather than zero-fill", () => {
  const all = run("patient-journey");
  const missingAxis = run("patient-journey", {
    selections: firstSelection("patient-journey").filter((selection) => selection.questionCode !== uniqueQuestionCodes("patient-journey")[0]),
  });

  const axis = missingAxis.scores.axes.find((item) => item.axisCode === "A1");
  assert.equal(axis.status, "unavailable");

  const expected = missingAxis.scores.axes
    .filter((item) => item.score !== null)
    .reduce((sum, item) => sum + item.score * item.weight, 0) /
    missingAxis.scores.axes
      .filter((item) => item.score !== null)
      .reduce((sum, item) => sum + item.weight, 0);

  assert.equal(missingAxis.scores.overallScore, expected);
  assert.notEqual(all.scores.overallScore, missingAxis.scores.overallScore);
});

test("KPI projection preserves partial availability and RRI scope", () => {
  const patient = run("patient-journey");
  const psi = patient.kpis.find((kpi) => kpi.kpiCode === "PSI");
  const rri = patient.kpis.find((kpi) => kpi.kpiCode === "RRI");

  assert.equal(psi.status, "partial");
  assert.ok(psi.coverage < 1);
  assert.equal(rri.status, "unavailable");

  const admin = run("admin-reception-assessment");
  const adminRri = admin.kpis.find((kpi) => kpi.kpiCode === "RRI");
  assert.equal(adminRri.status, "available");
  assert.equal(adminRri.coverage, 1);
});

test("economics is isolated from overallScore and follows the approved referral semantics", () => {
  const baseline = run("clinic-performance", {
    economicInput: { averageVisitValue: 100, relationshipYears: 3, referralPercentage: 0 },
  });
  const twenty = run("clinic-performance", {
    economicInput: { averageVisitValue: 100, relationshipYears: 3, referralPercentage: 20 },
  });
  const fifty = run("clinic-performance", {
    economicInput: { averageVisitValue: 100, relationshipYears: 3, referralPercentage: 50 },
  });
  const blank = run("clinic-performance", {
    economicInput: { averageVisitValue: 100, relationshipYears: 3, referralPercentage: null },
  });
  const invalid = run("clinic-performance", {
    economicInput: { averageVisitValue: 100, relationshipYears: 3, referralPercentage: 100 },
  });

  assert.equal(baseline.economics.status, "COMPUTED");
  assert.equal(baseline.economics.output.value, 900);
  assert.equal(twenty.economics.output.value, 1125);
  assert.equal(fifty.economics.output.value, 1800);
  assert.equal(blank.economics.status, "NOT_COMPUTED");
  assert.equal(invalid.economics.status, "NOT_COMPUTED");

  assert.equal(baseline.scores.overallScore, twenty.scores.overallScore);
  assert.equal(twenty.scores.overallScore, fifty.scores.overallScore);
});

test("consistency is integrated as an analytical signal with no score effect", () => {
  const questions = uniqueQuestionCodes("patient-journey");
  const result = run("patient-journey", {
    consistencyRules: [{
      ruleId: "TEST_RULE",
      ruleVersion: 1,
      relationshipType: "TEST_RELATIONSHIP",
      trigger: { validator: { answered: true }, target: { answered: true } },
      severity: "ATTENTION",
      affectedComponents: "FROM_INPUTS",
      findingCode: "TEST_FINDING",
      interpretation: "Test-only analytical relationship.",
      reviewRequired: true,
      scoreEffect: "NONE",
    }],
    consistencyPairs: [{
      relationshipType: "TEST_RELATIONSHIP",
      validatorQuestionCode: questions[0],
      targetQuestionCode: questions[1],
    }],
  });

  assert.equal(result.consistency.findings.length, 1);
  assert.equal(result.consistency.findings[0].scoreEffect, "NONE");
});

test("criticality remains structured and does not change numeric score", () => {
  const full = run("patient-journey");
  const selected = firstSelection("patient-journey");
  const critical = registry.entries.find(
    (entry) => entry.assessmentSlug === "patient-journey" && entry.criticality !== "NORMAL",
  );
  if (!critical) return;

  const altered = run("patient-journey", {
    selections: selected.map((selection) =>
      selection.questionCode === critical.questionCode
        ? { ...selection, optionId: critical.optionId, optionIndex: critical.optionIndex }
        : selection,
    ),
  });

  assert.equal(altered.scores.overallScore, full.scores.overallScore);
  assert.ok(["NORMAL", "ATTENTION", "CRITICAL_FINDING", "UNVERIFIED"].includes(altered.criticality.status));
});

test("unknown question identity and unknown option identity are rejected", () => {
  const base = {
    sessionId: "s",
    assessmentFamilyId: "f",
    assessmentTypeId: "t",
    assessmentVersion: "1",
    resultId: "r",
    calculatedAt: "2026-10-02T00:00:00Z",
    scoringContractVersion: "P3_CONTRACT_V1",
    assessmentConfigDigest: "fixture-digest",
    assessmentSlug: "patient-journey",
    axes: families["patient-journey"].axes.map(([code, weight]) => ({ code, weight })),
    axisRoles: families["patient-journey"].axisRoles,
    kpiMappings,
  };

  assert.throws(
    () => scoreP3IntegratedV1({
      ...base,
      selections: [{ questionCode: "NOT_A_REAL_QUESTION", optionId: "x", optionIndex: 0 }],
    }),
    /Unknown question identity/,
  );

  const first = firstSelection("patient-journey")[0];
  assert.throws(
    () => scoreP3IntegratedV1({
      ...base,
      selections: [{ ...first, optionId: "NOT_A_REAL_OPTION" }],
    }),
    /Unknown option identity/,
  );
});

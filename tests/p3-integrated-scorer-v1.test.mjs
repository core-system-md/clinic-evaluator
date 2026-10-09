import assert from "node:assert/strict";
import test from "node:test";
import registry from "../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import registryV2 from "../supabase/functions/assessment-access/response-interpretation-registry-v2.json" with { type: "json" };
import config from "./fixtures/p3-current-published-config-v1.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/assessment-calculation-pipeline.mts";

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
    interpretationVersion: 1,
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

test("integrated scorer propagates interpretation version 2", () => {
  const entry = registryV2.entries.find(
    (e) => e.assessmentSlug === "comprehensive-clinic-assessment" && e.questionCode === "CCV2Q01" && e.optionIndex === 1,
  );
  assert.ok(entry);
  const result = scoreP3IntegratedV1({
    sessionId: "00000000-0000-0000-0000-000000000001",
    assessmentFamilyId: "family-1",
    assessmentTypeId: "type-comprehensive-clinic-assessment-v2",
    assessmentVersion: "2",
    interpretationVersion: 2,
    resultId: "result-v2",
    calculatedAt: "2026-10-06T00:00:00Z",
    scoringContractVersion: "P3_CONTRACT_V1",
    assessmentConfigDigest: "fixture-digest-v2",
    assessmentSlug: "comprehensive-clinic-assessment",
    selections: [{ questionCode: entry.questionCode, optionId: entry.optionId, optionIndex: entry.optionIndex }],
    axes: [{ code: entry.axisCode, weight: 1 }],
    axisRoles: {},
    kpiMappings: {},
  });

  assert.equal(result.provenance.interpretationVersion, "2");
  const resolved = result.resolvedSelections.find((item) => item.questionCode === entry.questionCode);
  assert.equal(resolved?.optionId, entry.optionId);
  assert.equal(resolved?.anchorScore, entry.anchorScore);
});

test("all five published families execute through the single integrated path", () => {
  for (const [slug, family] of Object.entries(families)) {
    const questionCount = uniqueQuestionCodes(slug).length;
    const result = run(slug);

    assert.ok(questionCount > 0);
    assert.equal(result.identity.assessmentVersion, String(family.version));
    assert.equal(result.scores.axes.length, family.axes.length);
    assert.ok(result.scores.overallScore !== null);

    const weightSum = result.scores.axes.reduce((sum, axis) => sum + axis.weight, 0);
    assert.ok(Math.abs(weightSum - 1) < 1e-12);
    assert.equal(result.provenance.scoringContractVersion, "P3_CONTRACT_V1");
    assert.equal(result.schemaVersion, "P3_STRUCTURED_RESULT_V1");
    assert.equal(result.status, "NON_PRODUCTION");
  }
});

function selectionsWithAxisAnchor(slug, axisCode, anchorScore) {
  const selections = firstSelection(slug);
  const questions = new Set(
    registry.entries
      .filter((entry) => entry.assessmentSlug === slug && entry.axisCode === axisCode)
      .map((entry) => entry.questionCode),
  );
  for (const questionCode of questions) {
    const anchored = registry.entries.find((entry) =>
      entry.assessmentSlug === slug &&
      entry.axisCode === axisCode &&
      entry.questionCode === questionCode &&
      entry.scoreEligible &&
      entry.anchorScore === anchorScore,
    );
    if (!anchored) continue;
    const index = selections.findIndex((selection) => selection.questionCode === questionCode);
    if (index >= 0) {
      selections[index] = {
        questionCode: anchored.questionCode,
        optionId: anchored.optionId,
        optionIndex: anchored.optionIndex,
      };
    }
  }
  return selections;
}

test("axis and overall projection exclude unavailable dimensions rather than zero-fill", () => {
  const all = run("patient-journey", {
    selections: selectionsWithAxisAnchor("patient-journey", "A1", 100),
  });
  const axisQuestions = new Set(
    registry.entries
      .filter((entry) => entry.assessmentSlug === "patient-journey" && entry.axisCode === "A1")
      .map((entry) => entry.questionCode),
  );
  const missingAxis = run("patient-journey", {
    selections: selectionsWithAxisAnchor("patient-journey", "A1", 100)
      .filter((selection) => !axisQuestions.has(selection.questionCode)),
  });

  const axis = missingAxis.scores.axes.find((item) => item.axisCode === "A1");
  assert.ok(axisQuestions.size > 0);
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

test("criticality remains structured and does not enter the overallScore formula", () => {
  const result = run("patient-journey");
  const expected = result.scores.axes
    .filter((item) => item.score !== null)
    .reduce((sum, item) => sum + item.score * item.weight, 0) /
    result.scores.axes
      .filter((item) => item.score !== null)
      .reduce((sum, item) => sum + item.weight, 0);

  assert.equal(result.scores.overallScore, expected);
  assert.ok(["NORMAL", "ATTENTION", "CRITICAL_FINDING", "UNVERIFIED"].includes(result.criticality.status));
  assert.ok(result.diagnostics.findings.every((finding) =>
    finding.sourceType !== "CRITICALITY" || /does not alter numeric scores/.test(finding.explanation),
  ));
});


test("explicit consistency cap changes the validator before axis and overall aggregation", () => {
  const slug = "patient-journey";
  const selections = firstSelection(slug);
  const validatorCode = selections[0].questionCode;
  const targetCode = selections[1].questionCode;

  const validator100 = registry.entries.find(
    (entry) =>
      entry.assessmentSlug === slug &&
      entry.questionCode === validatorCode &&
      entry.scoreEligible &&
      entry.anchorScore === 100,
  );
  const target0 = registry.entries.find(
    (entry) =>
      entry.assessmentSlug === slug &&
      entry.questionCode === targetCode &&
      entry.scoreEligible &&
      entry.anchorScore === 0,
  );
  assert.ok(validator100);
  assert.ok(target0);

  selections[0] = {
    questionCode: validator100.questionCode,
    optionId: validator100.optionId,
    optionIndex: validator100.optionIndex,
  };
  selections[1] = {
    questionCode: target0.questionCode,
    optionId: target0.optionId,
    optionIndex: target0.optionIndex,
  };

  const baseline = run(slug, { selections });
  const checked = run(slug, {
    selections,
    consistencyRules: [{
      ruleId: "CR-009",
      ruleVersion: 1,
      relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
      trigger: {
        validator: { scoreMode: "DIRECT_ANCHOR", scoreEligible: true, minAnchorPercentage: 100 },
        target: { scoreMode: "DIRECT_ANCHOR", scoreEligible: true, maxAnchorPercentage: 40 },
      },
      severity: "MATERIAL",
      affectedComponents: "FROM_INPUTS",
      findingCode: "REALITY_CHECK_CONTRADICTION",
      interpretation: "Test-only explicit reality-check cap.",
      reviewRequired: true,
      scoreEffect: {
        mode: "CAP_VALIDATOR_ANCHOR",
        maxEffectiveAnchorScore: null,
      },
    }],
    consistencyPairs: [{
      relationshipType: "HIGH_PRACTICE_CLAIM_VS_DIRECT_CONTRADICTION",
      validatorQuestionCode: validatorCode,
      targetQuestionCode: targetCode,
      scoreEffectOverride: {
        mode: "CAP_VALIDATOR_ANCHOR",
        maxEffectiveAnchorScore: 70,
      },
    }],
  });

  const effectiveValidator = checked.resolvedSelections.find(
    (item) => item.questionCode === validatorCode,
  );
  assert.equal(effectiveValidator?.anchorScore, 70);
  assert.equal(
    checked.consistency.findings.find(
      (finding) => finding.findingCode === "REALITY_CHECK_CONTRADICTION",
    )?.scoreAdjustment?.effectiveAnchorScore,
    70,
  );
  assert.notEqual(
    checked.scores.overallScore,
    baseline.scores.overallScore,
  );

  const validatorAxis = effectiveValidator?.axisCode;
  const baselineAxis = baseline.scores.axes.find(
    (axis) => axis.axisCode === validatorAxis,
  );
  const checkedAxis = checked.scores.axes.find(
    (axis) => axis.axisCode === validatorAxis,
  );
  assert.ok(baselineAxis);
  assert.ok(checkedAxis);
  assert.ok(Number(checkedAxis.score) < Number(baselineAxis.score));
});

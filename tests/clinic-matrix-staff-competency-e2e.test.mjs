import assert from "node:assert/strict";
import test from "node:test";
import assessment from "../assessments/drafts/clinic-matrix-staff-competency.v1.json" with { type: "json" };
import registry from "../supabase/functions/assessment-access/clinic-matrix-staff-competency-interpretation-draft.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/assessment-calculation-pipeline.mts";

const SLUG = "clinic-matrix-staff-competency";
const axes = assessment.axes.map((axis) => ({
  code: axis.code,
  weight: axis.weight,
  nameAr: axis.title_ar,
  nameEn: axis.title,
}));

function selectedOption(questionCode, optionIndex) {
  const axis = assessment.axes.find((candidate) =>
    candidate.questions.some((question) => question.code === questionCode),
  );
  const question = axis?.questions.find((candidate) => candidate.code === questionCode);
  const option = question?.options[optionIndex];
  assert.ok(option, `missing draft option ${questionCode}[${optionIndex}]`);
  return { questionCode, optionId: option.id, optionIndex };
}

function run(selections) {
  return scoreP3IntegratedV1({
    sessionId: "00000000-0000-4000-8000-000000000101",
    assessmentFamilyId: "00000000-0000-4000-8000-000000000102",
    assessmentTypeId: "00000000-0000-4000-8000-000000000103",
    assessmentVersion: "1",
    interpretationVersion: 2,
    resultId: "00000000-0000-4000-8000-000000000104",
    calculatedAt: "2026-10-27T00:00:00.000Z",
    scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
    assessmentConfigDigest: "clinic-matrix-e2e-fixture-digest",
    assessmentSlug: SLUG,
    selections,
    axes,
    axisRoles: {},
    kpiMappings: {},
    resultStatus: "NON_PRODUCTION",
  });
}

test("Clinic Matrix E2E: draft option identities resolve through the official V2 scorer into a Structured Result", () => {
  assert.equal(assessment.slug, SLUG);
  assert.equal(assessment.axes.length, 6);
  assert.equal(assessment.axes.reduce((sum, axis) => sum + axis.weight, 0), 100);
  assert.equal(assessment.axes.reduce((sum, axis) => sum + axis.questions.length, 0), 12);
  assert.equal(registry.schemaVersion, "P3_RESPONSE_INTERPRETATION_REGISTRY_V2");

  const selections = assessment.axes.flatMap((axis) =>
    axis.questions.map((question) => selectedOption(question.code, 0)),
  );
  const result = run(selections);

  assert.equal(result.schemaVersion, "P3_STRUCTURED_RESULT_V1");
  assert.equal(result.status, "NON_PRODUCTION");
  assert.equal(result.identity.assessmentVersion, "1");
  assert.equal(result.provenance.interpretationVersion, "2");
  assert.equal(result.scores.axes.length, 6);
  assert.equal(result.coverage.expectedApplicableItems, 12);
  assert.equal(result.coverage.answeredItems, 12);
  assert.equal(result.coverage.coverageStatus, "FULL");
  assert.equal(result.scores.axes.every((axis) => axis.status === "measured"), true);

  for (const axis of assessment.axes) {
    const expected = axis.questions.reduce((sum, question) => {
      const option = question.options[0];
      const entry = registry.entries.find((candidate) =>
        candidate.assessmentSlug === SLUG &&
        candidate.assessmentVersion === "1" &&
        candidate.questionCode === question.code &&
        candidate.optionId === option.id &&
        candidate.optionIndex === 0,
      );
      assert.ok(entry, `registry identity missing for ${question.code}[0]`);
      assert.equal(entry.anchorScore, option.value);
      return sum + entry.anchorScore;
    }, 0) / axis.questions.length;
    const measured = result.scores.axes.find((candidate) => candidate.axisCode === axis.code);
    assert.ok(measured, `missing Structured Result axis ${axis.code}`);
    assert.equal(measured.percentage, expected);
    assert.equal(measured.weight, axis.weight / 100);
    assert.equal(measured.weightedScore, expected * axis.weight / 100);
  }

  const expectedOverall = result.scores.axes.reduce(
    (sum, axis) => sum + axis.percentage * axis.weight,
    0,
  );
  assert.ok(Math.abs(result.scores.overallScore - expectedOverall) < 1e-9);
});

test("Clinic Matrix E2E: critical conduct flags are preserved separately and do not subtract numeric score", () => {
  const selections = assessment.axes.flatMap((axis) =>
    axis.questions.map((question) => selectedOption(question.code, 0)),
  );
  // These three choices are the assessment-specific flagged responses.
  for (const [questionCode, optionIndex] of [["Q6", 3], ["Q8", 0], ["Q10", 1]]) {
    const index = selections.findIndex((selection) => selection.questionCode === questionCode);
    selections[index] = selectedOption(questionCode, optionIndex);
  }

  const result = run(selections);
  assert.equal(result.coverage.coverageStatus, "FULL");
  assert.equal(result.criticality.status, "CRITICAL_FINDING");
  assert.equal(result.criticality.reviewRequired, true);
  assert.deepEqual([...result.criticality.sourceItems].sort(), ["Q10", "Q6", "Q8"]);

  // Recalculate only the expected numeric projection from the authoritative registry
  // to ensure flags remain metadata rather than a hidden penalty.
  const expectedByAxis = assessment.axes.map((axis) => {
    const values = axis.questions.map((question) => {
      const selection = selections.find((item) => item.questionCode === question.code);
      const entry = registry.entries.find((candidate) =>
        candidate.assessmentSlug === SLUG &&
        candidate.questionCode === selection.questionCode &&
        candidate.optionId === selection.optionId &&
        candidate.optionIndex === selection.optionIndex,
      );
      assert.ok(entry);
      return entry.anchorScore;
    });
    return { code: axis.code, value: values.reduce((a, b) => a + b, 0) / values.length };
  });
  for (const axis of result.scores.axes) {
    assert.equal(axis.percentage, expectedByAxis.find((expected) => expected.code === axis.axisCode).value);
  }
});

test("Clinic Matrix E2E: unanswered questions are not imputed as zero and unknown option identity fails closed", () => {
  const selections = assessment.axes.flatMap((axis) =>
    axis.questions.map((question) => selectedOption(question.code, 0)),
  ).filter((selection) => selection.questionCode !== "Q1");

  const partial = run(selections);
  assert.equal(partial.coverage.expectedApplicableItems, 11);
  assert.equal(partial.coverage.answeredItems, 11);
  assert.equal(partial.scores.axes.find((axis) => axis.axisCode === "A1")?.percentage,
    registry.entries.find((entry) => entry.assessmentSlug === SLUG && entry.questionCode === "Q2" && entry.optionIndex === 0)?.anchorScore);

  assert.throws(() => run([
    { questionCode: "Q1", optionId: "00000000-0000-4000-8000-000000000000", optionIndex: 0 },
  ]), /Unknown option identity/);
});

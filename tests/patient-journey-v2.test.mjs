import assert from "node:assert/strict";
import test from "node:test";
import content from "../documentation/architecture/P5-PATIENT-JOURNEY-V2-CONTENT-2026-10-06.json" with { type: "json" };
import canonical from "../documentation/architecture/P5-PATIENT-JOURNEY-V2-INTERPRETATION-REGISTRY-2026-10-06.json" with { type: "json" };
import runtime from "../supabase/functions/assessment-access/p3-response-interpretation-registry-v2.json" with { type: "json" };
import pairRegistry from "../supabase/functions/assessment-access/p3-consistency-pair-registry-v1.json" with { type: "json" };
import ruleRegistry from "../supabase/functions/assessment-access/p3-consistency-rule-registry-v2.json" with { type: "json" };
import { scoreP3IntegratedV1 } from "../supabase/functions/assessment-access/p3-integrated-scorer-v1.mts";

const patientRuntime = runtime.entries
  .filter((entry) => entry.assessmentSlug === "patient-journey" && entry.assessmentVersion === "2")
  .sort((a, b) => a.questionCode.localeCompare(b.questionCode, undefined, { numeric: true }) || a.optionIndex - b.optionIndex);

const entriesByQuestion = new Map();
for (const entry of canonical.entries) {
  const list = entriesByQuestion.get(entry.questionCode) ?? [];
  list.push(entry);
  entriesByQuestion.set(entry.questionCode, list.sort((a, b) => a.optionIndex - b.optionIndex));
}

function selections(pickIndex = () => 0) {
  return content.questions.map((question) => {
    const options = entriesByQuestion.get(question.code);
    assert.ok(options?.length, `missing registry entries for ${question.code}`);
    const index = pickIndex(question.code, options);
    const entry = options[index];
    return { questionCode: entry.questionCode, optionId: entry.optionId, optionIndex: entry.optionIndex };
  });
}

function score(inputSelections, extra = {}) {
  return scoreP3IntegratedV1({
    sessionId: "00000000-0000-0000-0000-000000000001",
    assessmentFamilyId: "family-patient-journey",
    assessmentTypeId: "type-patient-journey-v2",
    assessmentVersion: "2",
    resultId: "result-patient-journey-v2",
    calculatedAt: "2026-10-06T00:00:00Z",
    scoringContractVersion: "P3_AGGREGATION_V2",
    assessmentConfigDigest: "v2-fixture-digest",
    assessmentSlug: "patient-journey",
    selections: inputSelections,
    axes: content.axes.map(({ code, weight }) => ({ code, weight })),
    axisRoles: content.axisRoles,
    kpiMappings: content.kpiMappings,
    resultStatus: "PRODUCTION",
    engineIdentity: "P3_INTEGRATED_SCORER_V1",
    ...extra,
  });
}

test("Patient Journey v2 content is exactly 25 questions and 96 options", () => {
  assert.equal(content.questions.length, 25);
  assert.equal(content.questions.flatMap((q) => q.options).length, 96);
  for (const q of content.questions) {
    const expected = new Set(["Q5", "Q7", "Q12", "Q13"]).has(q.code) ? 3 : 4;
    assert.equal(q.options.length, expected, q.code);
    assert.equal(q.required, true, q.code);
  }
  assert.deepEqual(
    content.axes.map((a) => [a.code, a.weight]),
    [["A1", 0.20], ["A2", 0.15], ["A3", 0.25], ["A4", 0.25], ["A5", 0.15]],
  );
});

test("canonical Patient Journey v2 registry is byte-equivalent to the runtime patient subset", () => {
  assert.equal(canonical.entries.length, 96);
  assert.deepEqual(patientRuntime, canonical.entries);
});

test("Patient Journey v2 measurement contract is complete", () => {
  const numeric = canonical.entries.filter((e) => e.scoreMode === "DIRECT_ANCHOR");
  const semantic = canonical.entries.filter((e) => e.scoreMode === "SEMANTIC_ONLY");
  assert.equal(numeric.length, 93);
  assert.equal(semantic.length, 3);
  assert.ok(semantic.every((e) => !e.scoreEligible && e.anchorScore === null && e.anchorMax === null));
  assert.ok(numeric.every((e) =>
    e.scoreEligible &&
    e.anchorMax === 100 &&
    e.interpretationVersion === 2 &&
    [0, 40, 70, 100].includes(e.anchorScore),
  ));
});

test("all zero and all one-hundred numeric states produce the frozen boundaries", () => {
  const zero = score(selections((q) => 0));
  const full = score(selections((q, opts) => opts.length - 1));
  assert.equal(zero.scores.overallScore, 0);
  assert.equal(full.scores.overallScore, 100);
});

test("Q7 semantic-only state has no numeric effect", () => {
  const state0 = score(selections((q) => 0));
  const state100 = score(selections((q) => q === "Q7" ? 2 : 3));
  assert.equal(state0.scores.axes.find((a) => a.axisCode === "A2")?.score, state100.scores.axes.find((a) => a.axisCode === "A2")?.score);
  assert.equal(state0.scores.overallScore, state100.scores.overallScore);
});

test("missing A1 excludes the axis rather than zero-filling it", () => {
  const complete = score(selections((q) => 3));
  const missingA1 = score(selections((q) => q.startsWith("Q") && Number(q.slice(1)) <= 5 ? null : 3).filter(Boolean));
  const axis = missingA1.scores.axes.find((a) => a.axisCode === "A1");
  assert.equal(axis?.status, "unavailable");
  assert.equal(missingA1.scores.axes.filter((a) => a.score !== null).length, 4);
  assert.equal(missingA1.scores.overallScore, 100);
  assert.equal(complete.scores.overallScore, 100);
});

test("each approved consistency pair caps 100 against 0 or 40, but not against 70", () => {
  const rule = ruleRegistry.rules.find((r) => r.ruleId === "CR-009");
  assert.ok(rule);
  const pairs = pairRegistry.pairs.filter((p) => p.assessmentSlug === "patient-journey" && p.assessmentVersion === "2");
  assert.deepEqual(
    pairs.map((p) => [p.validatorQuestionCode, p.targetQuestionCode]),
    [["Q1","Q3"],["Q10","Q9"],["Q12","Q13"],["Q21","Q23"]],
  );
  for (const pair of pairs) {
    for (const targetIndex of [0,1]) {
      const baseline = selections((q) => 3);
      const targetEntry = entriesByQuestion.get(pair.targetQuestionCode)[targetIndex];
      baseline[Number(pair.targetQuestionCode.slice(1)) - 1] = {
        questionCode: targetEntry.questionCode, optionId: targetEntry.optionId, optionIndex: targetEntry.optionIndex,
      };
      const withFinding = score(baseline, { consistencyRules: [rule], consistencyPairs: pairs });
      const validator = withFinding.resolvedSelections.find((x) => x.questionCode === pair.validatorQuestionCode);
      assert.equal(validator?.anchorScore, 70, pair.validatorQuestionCode);
    }
    const noFinding = selections((q) => q === pair.validatorQuestionCode ? 2 : q === pair.targetQuestionCode ? 2 : 3);
    const result = score(noFinding, { consistencyRules: [rule], consistencyPairs: pairs });
    assert.equal(result.consistency.findings.length, 0, pair.validatorQuestionCode);
  }
});

test("KPI projection uses the actual Patient Journey mapping and preserves partial coverage", () => {
  const result = score(selections((q) => 3));
  for (const code of ["TFI","TAP","PRP","PLI","PSI","NPI","EVI","TCI"]) {
    const kpi = result.kpis.find((item) => item.kpiCode === code);
    assert.ok(kpi, code);
    assert.equal(kpi.status, "partial", code);
    assert.ok(Number(kpi.coverage) > 0 && Number(kpi.coverage) < 1, code);
  }
  assert.equal(result.kpis.find((k) => k.kpiCode === "RRI"), undefined);
  assert.equal(result.provenance.engineIdentity, "P3_INTEGRATED_SCORER_V1");
  assert.equal(result.provenance.scoringEngineVersion, "P3_SCORER_V1");
  assert.equal(result.provenance.interpretationVersion, "2");
});

test("missing required selection never becomes a zero", () => {
  const result = score(selections((q) => q === "Q5" ? null : 3).filter(Boolean));
  const q5 = result.resolvedSelections.find((item) => item.questionCode === "Q5");
  assert.equal(q5, undefined);
  assert.equal(result.scores.axes.find((a) => a.axisCode === "A1")?.status, "measured");
  assert.equal(result.scores.axes.find((a) => a.axisCode === "A1")?.score, 100);
});

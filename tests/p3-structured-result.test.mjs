import test from "node:test";
import assert from "node:assert/strict";

async function loadKernel() {
  return import(new URL("../supabase/functions/assessment-access/p3-score-engine.mts", import.meta.url));
}

test("P3 kernel keeps semantic-only and contextual states out of numeric aggregation", async () => {
  const { buildP3StructuredResult, aggregateDirectAnchors } = await loadKernel();

  const interpretations = [
    {
      questionCode: "Q-A", optionId: "A1", optionIndex: 1,
      semanticStateKey: "ESTABLISHED", measurementType: "ORDINAL_MATURITY",
      componentCode: "C04", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR", anchorScore: 100, anchorMax: 100,
      scoreEligible: true, criticality: "NORMAL",
    },
    {
      questionCode: "Q-B", optionId: "B1", optionIndex: 1,
      semanticStateKey: "PARTIAL", measurementType: "ORDINAL_MATURITY",
      componentCode: "C04", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR", anchorScore: 40, anchorMax: 100,
      scoreEligible: true, criticality: "NORMAL",
    },
    {
      questionCode: "Q-C", optionId: "C1", optionIndex: 1,
      semanticStateKey: "PROVIDER_DEPENDENT", measurementType: "CONTEXTUAL_STATE",
      componentCode: "C04", measurementLayer: "C",
      direction: "CONTEXTUAL", scoreMode: "SEMANTIC_ONLY",
      scoreEligible: false, criticality: "UNVERIFIED",
      contextRequired: true, consistencyRole: "CONTEXT_SIGNAL",
    },
  ];

  const result = buildP3StructuredResult({
    assessmentFamilyId: "family-1",
    assessmentTypeId: "type-1",
    assessmentVersion: "v1",
    interpretationVersion: "p3-r1",
    scoringEngineVersion: "p3-kernel-r1",
    answers: [
      { questionCode: "Q-A", optionId: "A1", optionIndex: 1 },
      { questionCode: "Q-B", optionId: "B1", optionIndex: 1 },
      { questionCode: "Q-C", optionId: "C1", optionIndex: 1 },
    ],
    interpretations,
    applicableQuestionCodes: ["Q-A", "Q-B", "Q-C"],
  });

  assert.equal(result.profile.components.length, 1);
  assert.equal(result.coverage.expectedApplicable, 3);
  assert.equal(result.coverage.answered, 3);
  assert.equal(result.coverage.scored, 2);
  assert.equal(result.coverage.semanticOnly, 1);
  assert.equal(result.coverage.missing, 0);
  assert.equal(result.criticality.findings.length, 1);

  const c04 = result.profile.components[0];
  assert.equal(c04.contextSignals.length, 1);
  assert.equal(c04.consistencySignals.length, 1);

  const numeric = aggregateDirectAnchors(result.items);
  assert.deepEqual(numeric, {
    rawScore: 140,
    maxPossible: 200,
    percentage: 70,
    count: 2,
  });
});

test("P3 kernel does not apply historical trap penalties", async () => {
  const { aggregateDirectAnchors } = await loadKernel();

  const items = [
    {
      questionCode: "Q1", optionId: "1", optionIndex: 1,
      semanticStateKey: "STRONG", measurementType: "ORDINAL",
      componentCode: "C01", measurementLayer: "P",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR",
      anchorScore: 100, anchorMax: 100, scoreEligible: true,
      criticality: "NORMAL", answered: true, selected: true,
    },
  ];

  assert.deepEqual(aggregateDirectAnchors(items), {
    rawScore: 100,
    maxPossible: 100,
    percentage: 100,
    count: 1,
  });
});

test("P3 coverage counts unanswered applicable questions as missing", async () => {
  const { buildP3StructuredResult } = await loadKernel();

  const result = buildP3StructuredResult({
    assessmentFamilyId: "family-1",
    assessmentTypeId: "type-1",
    assessmentVersion: "v1",
    interpretationVersion: "p3-r1",
    scoringEngineVersion: "p3-kernel-r1",
    answers: [],
    interpretations: [{
      questionCode: "Q-A", optionId: "A1", optionIndex: 1,
      semanticStateKey: "MISSING", measurementType: "ORDINAL_MATURITY",
      componentCode: "C01", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR",
      scoreEligible: true, criticality: "NORMAL",
    }],
    applicableQuestionCodes: ["Q-A", "Q-B"],
  });

  assert.equal(result.coverage.expectedApplicable, 2);
  assert.equal(result.coverage.answered, 0);
  assert.equal(result.coverage.missing, 2);
  assert.equal(result.coverage.coverageRatio, 0);
  assert.equal(result.coverage.coverageStatus, "PARTIAL");
});

test("P3 numeric aggregation uses explicit per-anchor maximums", async () => {
  const { aggregateDirectAnchors } = await loadKernel();

  const items = [
    {
      questionCode: "Q1", optionId: "1", optionIndex: 1,
      semanticStateKey: "A", measurementType: "ORDINAL",
      componentCode: "C01", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR",
      anchorScore: 25, anchorMax: 50, scoreEligible: true,
      criticality: "NORMAL", answered: true, selected: true,
    },
    {
      questionCode: "Q2", optionId: "1", optionIndex: 1,
      semanticStateKey: "B", measurementType: "ORDINAL",
      componentCode: "C01", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR",
      anchorScore: 40, anchorMax: 80, scoreEligible: true,
      criticality: "NORMAL", answered: true, selected: true,
    },
  ];

  assert.deepEqual(aggregateDirectAnchors(items), {
    rawScore: 65,
    maxPossible: 130,
    percentage: 50,
    count: 2,
  });
});

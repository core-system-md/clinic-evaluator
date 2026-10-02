const test = require("node:test");
const assert = require("node:assert/strict");

async function loadKernel() {
  return import(new URL("../supabase/functions/assessment-access/p3-score-engine.ts", import.meta.url));
}

test("P3 kernel keeps semantic-only and contextual states out of numeric aggregation", async () => {
  const { buildP3StructuredResult, aggregateDirectAnchors } = await loadKernel();

  const interpretations = [
    {
      questionCode: "Q-A", optionId: "A1", optionIndex: 1,
      semanticStateKey: "ESTABLISHED", measurementType: "ORDINAL_MATURITY",
      componentCode: "C04", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR", anchorScore: 100,
      scoreEligible: true, criticality: "NORMAL",
    },
    {
      questionCode: "Q-B", optionId: "B1", optionIndex: 1,
      semanticStateKey: "PARTIAL", measurementType: "ORDINAL_MATURITY",
      componentCode: "C04", measurementLayer: "M",
      direction: "POSITIVE", scoreMode: "DIRECT_ANCHOR", anchorScore: 40,
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
  });

  assert.equal(result.profile.components.length, 1);
  assert.equal(result.coverage.answered, 3);
  assert.equal(result.coverage.scored, 2);
  assert.equal(result.coverage.semanticOnly, 1);
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
      anchorScore: 100, scoreEligible: true,
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

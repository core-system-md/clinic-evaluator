import assert from "node:assert/strict";
import test from "node:test";
import { aggregateP3Profile } from "../supabase/functions/assessment-access/p3-aggregation-engine.mts";

test("P3 component aggregation keeps performance and maturity layers separate", () => {
  const result = aggregateP3Profile([
    { questionCode: "Q1", componentCode: "C01", primaryConstruct: "Trust", measurementLayer: "P", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 100, anchorMax: 100 },
    { questionCode: "Q2", componentCode: "C01", primaryConstruct: "Trust", measurementLayer: "M", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 40, anchorMax: 100 },
  ]);
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].layers.length, 2);
  assert.deepEqual(result.components[0].layers.map((x) => x.measurementLayer), ["M", "P"]);
  assert.equal(result.overallComposite, null);
});

test("missing responses reduce coverage, not the numeric score", () => {
  const result = aggregateP3Profile([
    { questionCode: "Q1", componentCode: "C04", primaryConstruct: "Follow-up", measurementLayer: "P", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 100, anchorMax: 100 },
    { questionCode: "Q2", componentCode: "C04", primaryConstruct: "Follow-up", measurementLayer: "P", answered: false, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: null, anchorMax: 100 },
  ]);
  const layer = result.components[0].layers[0];
  assert.equal(layer.missing, 1);
  assert.equal(layer.coverageRatio, 0.5);
  assert.equal(layer.coverageStatus, "PARTIAL");
  assert.equal(layer.score?.percentage, 100);
  assert.equal(layer.score?.count, 1);
});

test("semantic-only responses are interpretable but never numeric zero", () => {
  const result = aggregateP3Profile([
    { questionCode: "Q7", componentCode: "C05", primaryConstruct: "Onboarding", measurementLayer: "P", answered: true, scoreMode: "SEMANTIC_ONLY", scoreEligible: false, anchorScore: null, anchorMax: null },
  ]);
  const layer = result.components[0].layers[0];
  assert.equal(layer.semanticOnly, 1);
  assert.equal(layer.interpretableAnswered, 1);
  assert.equal(layer.coverageRatio, 1);
  assert.equal(layer.coverageStatus, "FULL");
  assert.equal(layer.score, null);
});

test("equal-item weighting is explicit and anchorMax is required", () => {
  const result = aggregateP3Profile([
    { questionCode: "Q1", componentCode: "C10", primaryConstruct: "Measurement", measurementLayer: "E", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 20, anchorMax: 100 },
    { questionCode: "Q2", componentCode: "C10", primaryConstruct: "Measurement", measurementLayer: "E", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 100, anchorMax: 100 },
  ]);
  const score = result.components[0].layers[0].score;
  assert.equal(score?.rawScore, 120);
  assert.equal(score?.maxPossible, 200);
  assert.equal(score?.percentage, 60);
  assert.equal(score?.weighting, "EQUAL_ITEM_V1");
});

test("same question cannot be counted twice in one component/layer", () => {
  assert.throws(
    () =>
      aggregateP3Profile([
        { questionCode: "Q1", componentCode: "C01", primaryConstruct: "Trust", measurementLayer: "P", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 40, anchorMax: 100 },
        { questionCode: "Q1", componentCode: "C01", primaryConstruct: "Trust", measurementLayer: "P", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 100, anchorMax: 100 },
      ]),
    /Duplicate questionCode/,
  );
});

test("non-monotonic corrected response can carry an explicit anchor without using source option_value", () => {
  const result = aggregateP3Profile([
    { questionCode: "Q2c9f29", componentCode: "C01", primaryConstruct: "Clinical Communication & Trust", measurementLayer: "P/E", answered: true, scoreMode: "DIRECT_ANCHOR", scoreEligible: true, anchorScore: 40, anchorMax: 100 },
  ]);
  assert.equal(result.components[0].layers[0].score?.percentage, 40);
});
console.log("P3 aggregation: component/layer separation and coverage rules verified.");

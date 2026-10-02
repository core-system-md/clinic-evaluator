import assert from "node:assert/strict";
import test from "node:test";

function axisScores(items) {
  const groups = new Map();
  for (const item of items) {
    if (!item.eligible) continue;
    const list = groups.get(item.axisCode) ?? [];
    list.push((item.anchorScore / item.anchorMax) * 100);
    groups.set(item.axisCode, list);
  }
  return new Map(
    [...groups.entries()].map(([axisCode, values]) => [
      axisCode,
      values.reduce((a, b) => a + b, 0) / values.length,
    ]),
  );
}

function overallScore(axisValues, axisWeights) {
  let numerator = 0;
  let denominator = 0;
  for (const [axisCode, score] of axisValues) {
    const weight = axisWeights[axisCode];
    if (!Number.isFinite(score) || !Number.isFinite(weight) || weight <= 0) continue;
    numerator += score * weight;
    denominator += weight;
  }
  return denominator > 0 ? numerator / denominator : null;
}

test("axis score uses equal eligible direct-anchor items", () => {
  const axes = axisScores([
    { axisCode: "A1", anchorScore: 100, anchorMax: 100, eligible: true },
    { axisCode: "A1", anchorScore: 40, anchorMax: 100, eligible: true },
    { axisCode: "A1", anchorScore: 0, anchorMax: 100, eligible: false },
  ]);
  assert.equal(axes.get("A1"), 70);
});

test("overallScore uses existing axis weights", () => {
  const axes = axisScores([
    { axisCode: "A1", anchorScore: 80, anchorMax: 100, eligible: true },
    { axisCode: "A2", anchorScore: 40, anchorMax: 100, eligible: true },
  ]);
  const score = overallScore(axes, { A1: 0.5, A2: 0.3, A3: 0.2 });
  assert.equal(score, 65);
});

test("unavailable axis is excluded rather than zero-filled", () => {
  const axes = axisScores([
    { axisCode: "A1", anchorScore: 80, anchorMax: 100, eligible: true },
  ]);
  const score = overallScore(axes, { A1: 0.5, A2: 0.3, A3: 0.2 });
  assert.equal(score, 80);
});

test("semantic/unavailable dimensions do not manufacture a numeric score", () => {
  const axes = axisScores([
    { axisCode: "A1", anchorScore: 80, anchorMax: 100, eligible: false },
    { axisCode: "A2", anchorScore: 40, anchorMax: 100, eligible: false },
  ]);
  assert.equal(overallScore(axes, { A1: 0.5, A2: 0.5 }), null);
});

test("no internal rounding", () => {
  const axes = axisScores([
    { axisCode: "A1", anchorScore: 77, anchorMax: 100, eligible: true },
    { axisCode: "A2", anchorScore: 41, anchorMax: 100, eligible: true },
  ]);
  const score = overallScore(axes, { A1: 0.35, A2: 0.65 });
  assert.equal(score, 53.6);
});

console.log("P3 overallScore projection contract: 5/5 deterministic cases defined.");

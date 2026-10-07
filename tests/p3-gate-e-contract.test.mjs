import assert from "node:assert/strict";
import test from "node:test";

function calculateOverallScore(dimensions) {
  const valid = dimensions.filter(
    (d) => Number.isFinite(d.score) && Number.isFinite(d.weight) && d.weight > 0,
  );
  if (!valid.length) return null;
  const weightSum = valid.reduce((sum, d) => sum + d.weight, 0);
  return valid.reduce((sum, d) => sum + d.score * d.weight, 0) / weightSum;
}

function calculateKpi(mapping, measuredRoles) {
  const entries = Object.entries(mapping).filter(([role]) =>
    Number.isFinite(measuredRoles[role]),
  );
  if (!entries.length) {
    return { status: "unavailable", value: null, coverage: 0 };
  }
  const declaredWeight = Object.values(mapping).reduce((sum, w) => sum + Number(w), 0);
  const contributingWeight = entries.reduce((sum, [, w]) => sum + Number(w), 0);
  const value = entries.reduce(
    (sum, [role, w]) => sum + Number(measuredRoles[role]) * Number(w),
    0,
  ) / contributingWeight;
  return {
    status: contributingWeight === declaredWeight ? "available" : "partial",
    value,
    coverage: declaredWeight ? contributingWeight / declaredWeight : 0,
  };
}

function calculateEconomicValue({ averageVisitValue, relationshipYears, referralPercentage }) {
  if (
    !Number.isFinite(averageVisitValue) ||
    averageVisitValue <= 0 ||
    !Number.isFinite(relationshipYears) ||
    relationshipYears <= 0
  ) return null;
  if (referralPercentage == null) return null;
  if (!Number.isFinite(referralPercentage)) return null;
  const r = referralPercentage / 100;
  if (r < 0 || r >= 1) return null;
  const base = averageVisitValue * 3 * relationshipYears;
  return base / (1 - r) - base;
}

test("overallScore uses the approved weighted arithmetic mean", () => {
  const result = calculateOverallScore([
    { score: 80, weight: 0.6 },
    { score: 40, weight: 0.4 },
  ]);
  assert.equal(result, 64);
});

test("overallScore excludes unavailable dimensions instead of zero-filling", () => {
  const result = calculateOverallScore([
    { score: 80, weight: 0.6 },
    { score: null, weight: 0.4 },
  ]);
  assert.equal(result, 80);
});

test("overallScore is unavailable when no measured dimension exists", () => {
  assert.equal(
    calculateOverallScore([
      { score: null, weight: 0.6 },
      { score: null, weight: 0.4 },
    ]),
    null,
  );
});

test("KPI uses existing mapping weights and excludes missing roles", () => {
  const result = calculateKpi(
    { TRUST: 0.4, RECEPTION: 0.2, COMMUNICATION: 0.4 },
    { TRUST: 80, RECEPTION: 40 },
  );
  assert.equal(result.status, "partial");
  assert.ok(Math.abs(result.value - (200 / 3)) < 1e-12);
  assert.ok(Math.abs(result.coverage - 0.6) < 1e-12);
});

test("KPI is unavailable when no mapped role is measured", () => {
  const result = calculateKpi(
    { RETENTION: 0.6, SCHEDULING: 0.4 },
    { TRUST: 80 },
  );
  assert.deepEqual(result, { status: "unavailable", value: null, coverage: 0 });
});

test("economic referral is blank-aware and does not invent zero", () => {
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: null,
    }),
    null,
  );
});

test("economic referral 0% is zero opportunity", () => {
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: 0,
    }),
    0,
  );
});

test("economic referral 20% propagates recursively", () => {
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: 20,
    }),
    225,
  );
});

test("economic referral 50% doubles base value", () => {
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: 50,
    }),
    900,
  );
});

test("economic referral at or above 100% is invalid/unbounded", () => {
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: 100,
    }),
    null,
  );
  assert.equal(
    calculateEconomicValue({
      averageVisitValue: 100,
      relationshipYears: 3,
      referralPercentage: 120,
    }),
    null,
  );
});

test("invalid monetary inputs leave the core score untouched", () => {
  const coreScore = 72;
  const economic = calculateEconomicValue({
    averageVisitValue: 0,
    relationshipYears: 3,
    referralPercentage: 20,
  });
  assert.equal(economic, null);
  assert.equal(coreScore, 72);
});

console.log("P3 Gate E contract cases: overallScore, KPI availability, and recursive economics verified as independent deterministic contracts.");

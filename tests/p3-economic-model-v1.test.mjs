import assert from "node:assert/strict";
import test from "node:test";
import { calculateP3RecursiveReferralEconomic } from "../supabase/functions/assessment-access/economic-opportunity-model-v1.mts";

test("canonical economics returns unavailable for absent inputs", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: null,
    relationshipYears: null,
    referralPercentage: null,
  });
  assert.equal(r.status, "unavailable");
  assert.equal(r.output, null);
});

test("canonical economics matches frozen recursive formula", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
  });
  assert.equal(r.status, "available");
  assert.equal(r.basePatientValue, 3750);
  assert.equal(r.output?.value, 4687.5);
  assert.equal(r.scenarios.opt20, 4687.5);
  assert.equal(r.scenarios.opt50, 7500);
});


test("canonical economics honors the supplied annual visit count", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
    visitsPerYear: 8,
  });
  assert.equal(r.status, "available");
  assert.equal(r.basePatientValue, 10000);
  assert.equal(r.output?.value, 12500);
  assert.equal(r.output?.assumptions.visitsPerYear, 8);
});

test("canonical economics rejects non-positive annual visit counts", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
    visitsPerYear: 0,
  });
  assert.equal(r.status, "unavailable");
  assert.equal(r.output, null);
});


test("canonical economics defaults to three annual visits", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
  });
  assert.equal(r.status, "available");
  assert.equal(r.basePatientValue, 3750);
  assert.equal(r.output?.assumptions.visitsPerYear, 3);
});

test("canonical economics treats blank referral as unavailable when base inputs are valid", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: null,
    visitsPerYear: 6,
  });
  assert.equal(r.status, "unavailable");
  assert.equal(r.basePatientValue, 7500);
  assert.equal(r.output, null);
});

test("zero referral percentage produces exactly the base patient value", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 0,
    visitsPerYear: 6,
  });
  assert.equal(r.status, "available");
  assert.equal(r.output?.value, 7500);
  assert.equal(r.output?.assumptions.visitsPerYear, 6);
  assert.equal(r.output?.assumptions.referralPercentage, 0);
});

test("economic report projection preserves the calculation assumptions", async () => {
  const { projectCompletionResponse } = await import("../supabase/functions/assessment-access/report-interpretation.mjs");
  const economic = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    relationshipYears: 5,
    referralPercentage: 20,
    visitsPerYear: 8,
  });
  const projected = projectCompletionResponse({
    identity: { assessmentFamilyId: "family-1", assessmentVersion: "1" },
    provenance: { assessmentSlug: "clinic-performance" },
    scores: { overallScore: 50, axes: [] },
    classification: { bandCode: "Q2" },
    kpis: [],
    economics: { status: "COMPUTED", output: economic.output },
  });
  assert.equal(projected.userReport.economicOpportunity.visitsPerYear, economic.output?.assumptions.visitsPerYear);
  assert.equal(projected.userReport.economicOpportunity.referralPercentage, economic.output?.assumptions.referralPercentage);
});

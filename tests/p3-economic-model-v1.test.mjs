import assert from "node:assert/strict";
import test from "node:test";
import { calculateP3RecursiveReferralEconomic } from "../supabase/functions/assessment-access/p3-economic-model-v1.mts";

test("canonical economics returns unavailable for absent inputs", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: null,
    visitsPerYear: 3,
    relationshipYears: null,
    referralPercentage: null,
  });
  assert.equal(r.status, "unavailable");
  assert.equal(r.output, null);
});

test("canonical economics matches frozen recursive formula", () => {
  const r = calculateP3RecursiveReferralEconomic({
    averageVisitValue: 250,
    visitsPerYear: 3,
    relationshipYears: 5,
    referralPercentage: 20,
  });
  assert.equal(r.status, "available");
  assert.equal(r.basePatientValue, 3750);
  assert.equal(r.output?.value, 937.5);
  assert.equal(r.output?.basis, "INCREMENTAL_REFERRAL_OPPORTUNITY");
  assert.equal(r.scenarios.opt20, 937.5);
  assert.equal(r.scenarios.opt50, 3750);
});

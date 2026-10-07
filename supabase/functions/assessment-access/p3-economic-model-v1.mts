/**
 * P3 Recursive Referral Economic Model V1.
 *
 * The model expresses incremental annual referral opportunity separately
 * from baseline patient value. Visits are annual and default to 3.
 */
export type P3EconomicInput = {
  averageVisitValue: number | null;
  visitsPerYear: number | null;
  relationshipYears: number | null;
  referralPercentage: number | null;
};

export type P3EconomicResult = {
  status: "available" | "unavailable";
  modelCode: "P3_RECURSIVE_REFERRAL_V1";
  basePatientValue: number;
  scenarios: {
    opt20: number;
    opt50: number;
  };
  output: {
    value: number;
    unit: "currency";
    basis: "INCREMENTAL_REFERRAL_OPPORTUNITY";
    assumptions: {
      visitsPerYear: number;
      referralPercentage: number;
    };
  } | null;
};

export function calculateP3RecursiveReferralEconomic(
  input: P3EconomicInput,
): P3EconomicResult {
  const {
    averageVisitValue,
    visitsPerYear,
    relationshipYears,
    referralPercentage,
  } = input;
  const annualVisits =
    visitsPerYear === null || visitsPerYear === undefined || visitsPerYear === 0
      ? 3
      : Number(visitsPerYear);

  const validBaseInputs =
    Number.isFinite(averageVisitValue) &&
    Number(averageVisitValue) > 0 &&
    Number.isFinite(annualVisits) &&
    annualVisits > 0 &&
    Number.isFinite(relationshipYears) &&
    Number(relationshipYears) > 0;

  if (!validBaseInputs) {
    return {
      status: "unavailable",
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      basePatientValue: 0,
      scenarios: { opt20: 0, opt50: 0 },
      output: null,
    };
  }

  const basePatientValue =
    Number(averageVisitValue) * annualVisits * Number(relationshipYears);
  const opportunityAt = (referral: number) =>
    basePatientValue / (1 - referral / 100) - basePatientValue;

  const opt20 = opportunityAt(20);
  const opt50 = opportunityAt(50);

  if (
    referralPercentage === null ||
    !Number.isFinite(referralPercentage) ||
    Number(referralPercentage) < 0 ||
    Number(referralPercentage) >= 100
  ) {
    return {
      status: "unavailable",
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      basePatientValue,
      scenarios: { opt20, opt50 },
      output: null,
    };
  }

  const numericReferral = Number(referralPercentage);
  const value = opportunityAt(numericReferral);

  return {
    status: "available",
    modelCode: "P3_RECURSIVE_REFERRAL_V1",
    basePatientValue,
    scenarios: { opt20, opt50 },
    output: {
      value,
      unit: "currency",
      assumptions: {
        visitsPerYear: annualVisits,
        referralPercentage: numericReferral,
      },
    },
  };
}

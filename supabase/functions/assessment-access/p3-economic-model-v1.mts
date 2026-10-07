/**
 * P3 Recursive Referral Economic Model V1.
 *
 * This is the single canonical economic calculation used by both the
 * assessment result pipeline and the interactive economic endpoint.
 */
export type P3EconomicInput = {
  averageVisitValue: number | null;
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
    assumptions: {
      visitsPerYear: 3;
      referralPercentage: number;
    };
  } | null;
};

export function calculateP3RecursiveReferralEconomic(
  input: P3EconomicInput,
): P3EconomicResult {
  const { averageVisitValue, relationshipYears, referralPercentage } = input;

  if (
    !Number.isFinite(averageVisitValue) ||
    Number(averageVisitValue) <= 0 ||
    !Number.isFinite(relationshipYears) ||
    Number(relationshipYears) <= 0
  ) {
    throw new Error("Invalid economic inputs");
  }

  const basePatientValue =
    Number(averageVisitValue) * 3 * Number(relationshipYears);
  const valueAt = (referral: number) =>
    basePatientValue / (1 - referral / 100);

  const opt20 = valueAt(20);
  const opt50 = valueAt(50);

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
  const value = valueAt(numericReferral);

  return {
    status: "available",
    modelCode: "P3_RECURSIVE_REFERRAL_V1",
    basePatientValue,
    scenarios: { opt20, opt50 },
    output: {
      value,
      unit: "currency",
      assumptions: {
        visitsPerYear: 3,
        referralPercentage: numericReferral,
      },
    },
  };
}

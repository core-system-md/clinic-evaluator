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

export type P3EconomicResult =
  | {
      status: "unavailable";
      modelCode: "P3_RECURSIVE_REFERRAL_V1";
      output: null;
    }
  | {
      status: "available";
      modelCode: "P3_RECURSIVE_REFERRAL_V1";
      output: {
        value: number;
        unit: "currency";
        assumptions: {
          visitsPerYear: 3;
          referralPercentage: number;
        };
      };
      basePatientValue: number;
    };

export function calculateP3RecursiveReferralEconomic(
  input: P3EconomicInput,
): P3EconomicResult {
  const { averageVisitValue, relationshipYears, referralPercentage } = input;

  if (
    !Number.isFinite(averageVisitValue) ||
    Number(averageVisitValue) <= 0 ||
    !Number.isFinite(relationshipYears) ||
    Number(relationshipYears) <= 0 ||
    referralPercentage === null ||
    !Number.isFinite(referralPercentage) ||
    Number(referralPercentage) < 0 ||
    Number(referralPercentage) >= 100
  ) {
    return {
      status: "unavailable",
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      output: null,
    };
  }

  const basePatientValue =
    Number(averageVisitValue) * 3 * Number(relationshipYears);
  const value =
    basePatientValue / (1 - Number(referralPercentage) / 100);

  return {
    status: "available",
    modelCode: "P3_RECURSIVE_REFERRAL_V1",
    output: {
      value,
      unit: "currency",
      assumptions: {
        visitsPerYear: 3,
        referralPercentage: Number(referralPercentage),
      },
    },
    basePatientValue,
  };
}

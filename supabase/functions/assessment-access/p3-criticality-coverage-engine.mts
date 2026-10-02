/**
 * P3 criticality + coverage engine — NON-PRODUCTION.
 *
 * V1 intentionally avoids invented percentage thresholds.
 * Coverage status is structural:
 * - NOT_MEASURED: no applicable/interpretable coverage
 * - PARTIAL: some, but not all applicable items are interpreted
 * - FULL: all applicable items are interpreted and supported
 * - UNSUPPORTED: an answered item cannot be interpreted numerically where numeric support is required
 * - ADEQUATE: reserved for a future calibrated threshold profile
 *
 * Criticality is independent from score. A critical domain with incomplete
 * coverage becomes UNVERIFIED rather than being treated as safe.
 */

export type P3CoverageStatus =
  | "NOT_MEASURED"
  | "PARTIAL"
  | "ADEQUATE"
  | "FULL"
  | "UNSUPPORTED";

export type P3Criticality =
  | "NORMAL"
  | "ATTENTION"
  | "CRITICAL_FINDING"
  | "UNVERIFIED";

export type P3CoverageItem = {
  questionCode: string;
  answered: boolean;
  interpreted: boolean;
  numericUnsupported?: boolean;
};

export type P3CoverageResult = {
  expectedApplicableItems: number;
  answeredItems: number;
  interpretedItems: number;
  scoredItems: number;
  missingItems: number;
  semanticOnlyItems: number;
  evidenceOnlyItems: number;
  signalOnlyItems: number;
  unsupportedItems: number;
  notApplicableItems: number;
  coverageRatio: number;
  coverageStatus: P3CoverageStatus;
  thresholdProfile: "STRUCTURAL_V1_UNCALIBRATED";
};

export type P3CriticalityItem = {
  questionCode: string;
  criticality: P3Criticality;
  answered: boolean;
  interpreted: boolean;
};

export type P3CriticalityResult = {
  status: P3Criticality;
  sourceItems: string[];
  reviewRequired: boolean;
};

export function buildP3Coverage(
  items: P3CoverageItem[],
  expectedApplicableItems = items.length,
): P3CoverageResult {
  const answeredItems = items.filter((item) => item.answered).length;
  const interpretedItems = items.filter(
    (item) => item.answered && item.interpreted,
  ).length;
  const scoredItems = items.filter(
    (item) => item.answered && item.interpreted && !item.numericUnsupported,
  ).length;
  const unsupportedItems = items.filter(
    (item) => item.answered && item.numericUnsupported,
  ).length;
  const missingItems = Math.max(expectedApplicableItems - answeredItems, 0);
  const coverageRatio = expectedApplicableItems
    ? Math.round((interpretedItems / expectedApplicableItems) * 10000) / 10000
    : 0;

  let coverageStatus: P3CoverageStatus;
  if (expectedApplicableItems === 0 || interpretedItems === 0) {
    coverageStatus = "NOT_MEASURED";
  } else if (unsupportedItems > 0 && interpretedItems === 0) {
    coverageStatus = "UNSUPPORTED";
  } else if (interpretedItems < expectedApplicableItems) {
    coverageStatus = "PARTIAL";
  } else if (unsupportedItems > 0) {
    coverageStatus = "UNSUPPORTED";
  } else {
    coverageStatus = "FULL";
  }

  return {
    expectedApplicableItems,
    answeredItems,
    interpretedItems,
    scoredItems,
    missingItems,
    semanticOnlyItems: 0,
    evidenceOnlyItems: 0,
    signalOnlyItems: 0,
    unsupportedItems,
    notApplicableItems: 0,
    coverageRatio,
    coverageStatus,
    thresholdProfile: "STRUCTURAL_V1_UNCALIBRATED",
  };
}

function criticalRank(status: P3Criticality): number {
  return {
    NORMAL: 0,
    ATTENTION: 1,
    CRITICAL_FINDING: 2,
    UNVERIFIED: 3,
  }[status];
}

export function evaluateP3Criticality(
  items: P3CriticalityItem[],
  coverageStatus: P3CoverageStatus,
): P3CriticalityResult {
  const interpreted = items.filter((item) => item.answered && item.interpreted);
  const criticalItems = interpreted.filter(
    (item) => item.criticality !== "NORMAL",
  );
  const highest =
    criticalItems.reduce<P3Criticality>(
      (current, item) =>
        criticalRank(item.criticality) > criticalRank(current)
          ? item.criticality
          : current,
      "NORMAL",
    );

  if (highest !== "NORMAL" && coverageStatus !== "FULL") {
    return {
      status: "UNVERIFIED",
      sourceItems: criticalItems.map((item) => item.questionCode),
      reviewRequired: true,
    };
  }

  return {
    status: highest,
    sourceItems: criticalItems.map((item) => item.questionCode),
    reviewRequired: highest !== "NORMAL",
  };
}

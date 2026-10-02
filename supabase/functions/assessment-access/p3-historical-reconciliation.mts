/**
 * P3 historical reconciliation classifier — NON-PRODUCTION.
 * It decides whether a session may be shadow-replayed; it never mutates history.
 */
export type P3HistoricalClassification = "REPLAYABLE" | "LEGACY_PRESERVE" | "UNRECONSTRUCTABLE";

export type P3HistoricalInputs = {
  expectedQuestions: number;
  answeredQuestions: number;
  optionIdentityResolved: boolean;
  assessmentVersionPinned: boolean;
  legacyScoreExists: boolean;
  scoreLineagePresent: boolean;
};

export function classifyP3HistoricalSession(input: P3HistoricalInputs): P3HistoricalClassification {
  if (
    input.expectedQuestions > 0 &&
    input.answeredQuestions >= input.expectedQuestions &&
    input.optionIdentityResolved &&
    input.assessmentVersionPinned
  ) {
    return "REPLAYABLE";
  }

  if (input.legacyScoreExists && input.scoreLineagePresent) {
    return "LEGACY_PRESERVE";
  }

  return "UNRECONSTRUCTABLE";
}

export function historicalAction(classification: P3HistoricalClassification) {
  switch (classification) {
    case "REPLAYABLE": return "COMPUTE_P3_SHADOW_AND_COMPARE";
    case "LEGACY_PRESERVE": return "PRESERVE_LEGACY_ONLY";
    case "UNRECONSTRUCTABLE": return "PRESERVE_AUDIT_RECORD_ONLY";
  }
}

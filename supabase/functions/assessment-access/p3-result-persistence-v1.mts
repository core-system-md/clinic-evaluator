import type { P3StructuredResultV1 } from "./p3-structured-result-v1.mts";

export type P3PersistedAxisRow = Record<string, unknown>;

export function projectScoreRowsFromStructuredResult(
  result: P3StructuredResultV1,
): P3PersistedAxisRow[] {
  return result.scores.axes.flatMap((axis) => {
    if (
      axis.rawScore === null ||
      axis.maxPossible === null ||
      axis.percentage === null ||
      axis.weightedScore === null
    ) {
      return [];
    }

    return [{
      axis_id: axis.axisCode,
      axis_name_ar: axis.axisCode,
      axis_name_en: axis.axisCode,
      raw_score: Math.round(axis.rawScore),
      max_possible: Math.round(axis.maxPossible),
      percentage: axis.percentage,
      weight: axis.weight,
      weighted_score: axis.weightedScore,
      grade:
        axis.percentage >= 75
          ? "Q4"
          : axis.percentage >= 50
            ? "Q3"
            : axis.percentage >= 25
              ? "Q2"
              : "Q1",
    }];
  });
}

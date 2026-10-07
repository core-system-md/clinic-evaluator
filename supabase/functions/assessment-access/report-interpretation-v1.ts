/**
 * Deterministic report interpretation.
 *
 * Input: authoritative Structured Result only.
 * Output: user/admin report projections.
 *
 * This module never calculates or rescales a score and never treats
 * presentation text as factual authority.
 */
import type { P3StructuredResultV1 } from "./p3-structured-result-v1.mts";
import {
  getAssessmentReportModel,
  type AssessmentReportModel,
} from "./assessment-report-models-v1.ts";

export type ReportAxisInsight = {
  axisCode: string;
  score: number;
  rank: number;
  evidence: "MEASURED_AXIS_SCORE";
};

export type UserReportProjection = {
  modelCode: string;
  assessmentFamily: string;
  overall: {
    score: number | null;
    bandCode: P3StructuredResultV1["classification"]["bandCode"];
    evidence: "STRUCTURED_RESULT_SCORE";
  };
  strengths: ReportAxisInsight[];
  gaps: ReportAxisInsight[];
  kpis: Array<{
    kpiCode: string;
    status: "available" | "partial";
    value: number;
    coverage: number | null;
    evidence: "STRUCTURED_RESULT_KPI";
  }>;
  economicOpportunity:
    | {
        status: "computed";
        value: number;
        unit: "currency";
        basis: "INCREMENTAL_REFERRAL_OPPORTUNITY";
        assumptions: NonNullable<P3StructuredResultV1["economics"]["output"]>["assumptions"];
        evidence: "STRUCTURED_RESULT_ECONOMICS";
      }
    | {
        status: "unavailable";
        reason:
          | "MODEL_NOT_SUPPORTED"
          | "INPUT_UNAVAILABLE"
          | "OUTPUT_UNAVAILABLE";
      };
  priority: {
    category: "PRIORITY_AXIS_REVIEW" | "NO_MEASURED_AXIS";
    sourceAxisCode: string | null;
    score: number | null;
    evidence: "MEASURED_AXIS_SCORE" | "NONE";
  };
};

export type AdminReportProjection = {
  modelCode: string;
  assessmentFamily: string;
  assessmentVersion: number;
  provenance: P3StructuredResultV1["provenance"];
  identity: P3StructuredResultV1["identity"];
  measurements: P3StructuredResultV1["scores"]["axes"];
  coverage: P3StructuredResultV1["coverage"];
  consistency: P3StructuredResultV1["consistency"];
  criticality: P3StructuredResultV1["criticality"];
  diagnostics: P3StructuredResultV1["diagnostics"];
  roles: P3StructuredResultV1["roles"];
  kpis: P3StructuredResultV1["kpis"];
  economics: P3StructuredResultV1["economics"];
};

export type AssessmentReportInterpretation = {
  model: AssessmentReportModel;
  user: UserReportProjection;
  admin: AdminReportProjection;
  visibilityPolicy: {
    user: {
      exposeConsistencyMechanics: false;
      exposeRuleIdentifiers: false;
      exposeProvenance: false;
      exposeLeakageMetric: false;
      exposeUnsupportedCausalClaims: false;
      exposeUnavailableKpiAsZero: false;
    };
    admin: {
      exposeConsistencyMechanics: true;
      exposeRuleIdentifiers: true;
      exposeProvenance: true;
    };
  };
};

function measuredAxes(
  result: P3StructuredResultV1,
): Array<{ axisCode: string; score: number }> {
  return result.scores.axes
    .filter(
      (axis) =>
        axis.status === "measured" && Number.isFinite(axis.score),
    )
    .map((axis) => ({
      axisCode: axis.axisCode,
      score: Number(axis.score),
    }));
}

function rankedAxes(result: P3StructuredResultV1): {
  strongest: ReportAxisInsight[];
  weakest: ReportAxisInsight[];
} {
  const axes = measuredAxes(result).sort(
    (a, b) => b.score - a.score || a.axisCode.localeCompare(b.axisCode),
  );

  const strongest = axes.slice(0, 3).map((axis, index) => ({
    axisCode: axis.axisCode,
    score: axis.score,
    rank: index + 1,
    evidence: "MEASURED_AXIS_SCORE" as const,
  }));

  const weakest = [...axes]
    .reverse()
    .slice(0, 3)
    .map((axis, index) => ({
      axisCode: axis.axisCode,
      score: axis.score,
      rank: index + 1,
      evidence: "MEASURED_AXIS_SCORE" as const,
    }));

  return { strongest, weakest };
}

function interpretKpis(
  result: P3StructuredResultV1,
  model: AssessmentReportModel,
): UserReportProjection["kpis"] {
  const supported = new Set(model.supportedKpis);
  return result.kpis
    .filter(
      (kpi) =>
        supported.has(kpi.kpiCode) &&
        (kpi.status === "available" || kpi.status === "partial") &&
        Number.isFinite(kpi.value),
    )
    .map((kpi) => ({
      kpiCode: kpi.kpiCode,
      status: kpi.status as "available" | "partial",
      value: Number(kpi.value),
      coverage: kpi.coverage,
      evidence: "STRUCTURED_RESULT_KPI" as const,
    }))
    .sort((a, b) => a.kpiCode.localeCompare(b.kpiCode));
}

function interpretEconomicOpportunity(
  result: P3StructuredResultV1,
  model: AssessmentReportModel,
): UserReportProjection["economicOpportunity"] {
  if (model.economicOpportunity !== "supported") {
    return { status: "unavailable", reason: "MODEL_NOT_SUPPORTED" };
  }

  const output = result.economics.output;
  if (
    result.economics.status !== "COMPUTED" ||
    !output ||
    !Number.isFinite(output.value)
  ) {
    return {
      status: "unavailable",
      reason:
        result.economics.inputs.referralPercentage === null
          ? "INPUT_UNAVAILABLE"
          : "OUTPUT_UNAVAILABLE",
    };
  }

  return {
    status: "computed",
    value: Number(output.value),
    unit: output.unit,
    basis: "INCREMENTAL_REFERRAL_OPPORTUNITY",
    assumptions: output.assumptions,
    evidence: "STRUCTURED_RESULT_ECONOMICS",
  };
}

export function interpretAssessmentResult(
  result: P3StructuredResultV1,
): AssessmentReportInterpretation {
  const model = getAssessmentReportModel(result.identity.assessmentSlug);
  if (
    !model.acceptedAssessmentVersions.includes(
      Number(result.identity.assessmentVersion),
    )
  ) {
    throw new Error(
      `Report model ${model.modelCode} does not accept assessment version ${result.identity.assessmentVersion}`,
    );
  }

  const ranked = rankedAxes(result);
  const weakest = ranked.weakest[0] ?? null;

  return {
    model,
    user: {
      modelCode: model.modelCode,
      assessmentFamily: result.identity.assessmentSlug,
      overall: {
        score: result.scores.overallScore,
        bandCode: result.classification.bandCode,
        evidence: "STRUCTURED_RESULT_SCORE",
      },
      strengths: ranked.strongest,
      gaps: ranked.weakest,
      kpis: interpretKpis(result, model),
      economicOpportunity: interpretEconomicOpportunity(result, model),
      priority: weakest
        ? {
            category: "PRIORITY_AXIS_REVIEW",
            sourceAxisCode: weakest.axisCode,
            score: weakest.score,
            evidence: "MEASURED_AXIS_SCORE",
          }
        : {
            category: "NO_MEASURED_AXIS",
            sourceAxisCode: null,
            score: null,
            evidence: "NONE",
          },
    },
    admin: {
      modelCode: model.modelCode,
      assessmentFamily: result.identity.assessmentSlug,
      assessmentVersion: Number(result.identity.assessmentVersion),
      provenance: result.provenance,
      identity: result.identity,
      measurements: result.scores.axes,
      coverage: result.coverage,
      consistency: result.consistency,
      criticality: result.criticality,
      diagnostics: result.diagnostics,
      roles: result.roles,
      kpis: result.kpis,
      economics: result.economics,
    },
    visibilityPolicy: {
      user: {
        exposeConsistencyMechanics: false,
        exposeRuleIdentifiers: false,
        exposeProvenance: false,
        exposeLeakageMetric: false,
        exposeUnsupportedCausalClaims: false,
        exposeUnavailableKpiAsZero: false,
      },
      admin: {
        exposeConsistencyMechanics: true,
        exposeRuleIdentifiers: true,
        exposeProvenance: true,
      },
    },
  };
}

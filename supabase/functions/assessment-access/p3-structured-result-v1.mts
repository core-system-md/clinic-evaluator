/**
 * P3 Structured Result V1.
 *
 * This module assembles already-computed measurement outputs.
 * It does not recalculate scores or infer unavailable source data.
 */
import type { P3ProfileAggregation } from "./p3-aggregation-engine.mts";
import type {
  P3CoverageResult,
  P3CriticalityResult,
} from "./p3-criticality-coverage-engine.mts";
import type { P3ConsistencyFinding } from "./p3-consistency-engine.mts";

export type P3StructuredRole = {
  roleCode: string;
  status: "available" | "partial" | "unavailable";
  sourceComponents: string[];
  value: number | null;
  coverage: number | null;
  provenance: string;
};

export type P3StructuredKPI = {
  kpiCode: string;
  status: "available" | "partial" | "unavailable";
  value: number | null;
  inputComponents: string[];
  coverage: number | null;
  mappingVersion: string;
  provenance: string;
};

export type P3StructuredResultV1 = {
  schemaVersion: "P3_STRUCTURED_RESULT_V1";
  status: "NON_PRODUCTION" | "PRODUCTION";
  identity: {
    sessionId: string;
    assessmentFamilyId: string;
    assessmentSlug: string;
    assessmentTypeId: string;
    assessmentVersion: string;
    resultId: string;
    calculatedAt: string;
  };
  provenance: {
    engineIdentity: string;
    scoringContractVersion: string;
    assessmentConfigDigest: string;
    interpretationVersion: string;
    scoringEngineVersion: string;
    inputLineage: string[];
  };
  inputs: {
    responses: Array<{
      questionCode: string;
      optionId: string;
      optionIndex: number;
      sourceOptionValue: number | null;
      semanticStateKey: string;
      axisCode: string | null;
      componentCode: string | null;
      primaryConstruct: string | null;
      measurementLayer: string | null;
      scoreMode:
        | "DIRECT_ANCHOR"
        | "SEMANTIC_ONLY"
        | "EVIDENCE_ONLY"
        | "SIGNAL_ONLY";
      scoreEligible: boolean;
      anchorScore: number | null;
      anchorMax: number | null;
    }>;
  };
  measurement: {
    profile: P3ProfileAggregation;
  };
  scores: {
    overallScore: number | null;
    axes: Array<{
      axisCode: string;
      rawScore: number | null;
      maxPossible: number | null;
      score: number | null;
      weightedScore: number | null;
      weight: number;
      grade: "Q1" | "Q2" | "Q3" | "Q4" | null;
      status: "measured" | "unavailable";
    }>;
  };
  coverage: P3CoverageResult;
  consistency: {
    findings: P3ConsistencyFinding[];
  };
  criticality: P3CriticalityResult;
  development: {
    signals: Array<{
      signalId: string;
      domain: string;
      sourceItems: string[];
      component: string;
      currentState: string;
      evidenceState: string;
      pathway: string;
    }>;
  };
  roles: P3StructuredRole[];
  kpis: P3StructuredKPI[];
  economics: {
    status: "NOT_COMPUTED" | "COMPUTED";
    modelCode: string | null;
    inputs: {
      averageVisitValue: number | null;
      visitsPerYear: number | null;
      relationshipYears: number | null;
      referralPercentage: number | null;
    };
    output: {
      value: number;
      unit: "currency";
      assumptions: {
        visitsPerYear: number;
        referralPercentage: number;
      };
    } | null;
  };
  classification: {
    bandCode: "Q1" | "Q2" | "Q3" | "Q4" | null;
    numericBasis: number | null;
    bandDefinitionVersion: "P3_BANDS_V1";
    provenance: string;
  };
  diagnostics: {
    findings: Array<{
      findingId: string;
      sourceType: "CONSISTENCY" | "CRITICALITY";
      sourceId: string;
      severity: string;
      explanation: string;
    }>;
  };
  audit: {
    replayableFrom: string[];
  };
};

export function buildP3StructuredResultV1(input: {
  sessionId: string;
  assessmentFamilyId: string;
  assessmentSlug: string;
  assessmentTypeId: string;
  assessmentVersion: string;
  resultId: string;
  calculatedAt: string;
  engineIdentity: string;
  scoringContractVersion: string;
  assessmentConfigDigest: string;
  interpretationVersion: string;
  scoringEngineVersion: string;
  inputLineage: string[];
  responses: P3StructuredResultV1["inputs"]["responses"];
  profile: P3ProfileAggregation;
  overallScore: number | null;
  axisScores: P3StructuredResultV1["scores"]["axes"];
  coverage: P3CoverageResult;
  consistencyFindings: P3ConsistencyFinding[];
  criticality: P3CriticalityResult;
  developmentSignals?: P3StructuredResultV1["development"]["signals"];
  roles?: P3StructuredRole[];
  kpis?: P3StructuredKPI[];
  resultStatus?: P3StructuredResultV1["status"];
  classification?: P3StructuredResultV1["classification"];
  economics?: P3StructuredResultV1["economics"];
}): P3StructuredResultV1 {
  const requiredStrings = [
    input.sessionId,
    input.assessmentFamilyId,
    input.assessmentSlug,
    input.assessmentTypeId,
    input.assessmentVersion,
    input.resultId,
    input.calculatedAt,
    input.engineIdentity,
    input.scoringContractVersion,
    input.assessmentConfigDigest,
    input.interpretationVersion,
    input.scoringEngineVersion,
  ];

  if (requiredStrings.some((value) => !value.trim())) {
    throw new Error("Structured result provenance/identity is incomplete");
  }

  if (input.axisScores.length) {
    const totalWeight = input.axisScores.reduce(
      (sum, axis) => sum + Number(axis.weight),
      0,
    );
    if (
      input.axisScores.some(
        (axis) =>
          !Number.isFinite(axis.weight) ||
          axis.weight <= 0 ||
          axis.weight > 100,
      ) ||
      Math.abs(totalWeight - 100) > 0.001
    ) {
      throw new Error(
        "Structured Result axis weights must be positive percentage points totaling 100",
      );
    }

    for (const axis of input.axisScores) {
      if (axis.status === "measured") {
        if (
          axis.rawScore === null ||
          axis.maxPossible === null ||
          axis.score === null ||
          axis.weightedScore === null ||
          axis.grade === null
        ) {
          throw new Error(
            `Measured Structured Result axis is missing measurement fields: ${axis.axisCode}`,
          );
        }
      } else if (
        axis.rawScore !== null ||
        axis.maxPossible !== null ||
        axis.score !== null ||
        axis.weightedScore !== null ||
        axis.grade !== null
      ) {
        throw new Error(
          `Unavailable Structured Result axis contains numeric measurement: ${axis.axisCode}`,
        );
      }
    }
  }

  const findings = input.consistencyFindings.map((finding) => ({
    findingId: `${finding.ruleId}@${finding.ruleVersion}:${finding.findingCode}`,
    sourceType: "CONSISTENCY" as const,
    sourceId: finding.ruleId,
    severity: finding.severity,
    explanation: finding.explanation,
  }));

  if (input.criticality.status !== "NORMAL") {
    findings.push({
      findingId: `criticality:${input.criticality.status}`,
      sourceType: "CRITICALITY" as const,
      sourceId: input.criticality.sourceItems.join(","),
      severity: input.criticality.status,
      explanation:
        `Criticality status ${input.criticality.status} is preserved as a structured finding; it does not alter numeric scores.`,
    });
  }

  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: input.resultStatus ?? "NON_PRODUCTION",
    identity: {
      sessionId: input.sessionId,
      assessmentFamilyId: input.assessmentFamilyId,
      assessmentSlug: input.assessmentSlug,
      assessmentTypeId: input.assessmentTypeId,
      assessmentVersion: input.assessmentVersion,
      resultId: input.resultId,
      calculatedAt: input.calculatedAt,
    },
    provenance: {
      engineIdentity: input.engineIdentity,
      scoringContractVersion: input.scoringContractVersion,
      assessmentConfigDigest: input.assessmentConfigDigest,
      interpretationVersion: input.interpretationVersion,
      scoringEngineVersion: input.scoringEngineVersion,
      inputLineage: [...input.inputLineage],
    },
    inputs: {
      responses: input.responses.map((response) => ({ ...response })),
    },
    measurement: {
      profile: input.profile,
    },
    scores: {
      overallScore: input.overallScore,
      axes: input.axisScores,
    },
    coverage: input.coverage,
    consistency: {
      findings: input.consistencyFindings,
    },
    criticality: input.criticality,
    development: {
      signals: input.developmentSignals ?? [],
    },
    roles: input.roles ?? [],
    kpis: input.kpis ?? [],
    economics:
      input.economics ?? {
        status: "NOT_COMPUTED",
        modelCode: null,
        inputs: {
          averageVisitValue: null,
          visitsPerYear: 3,
          relationshipYears: null,
          referralPercentage: null,
        },
        output: null,
      },
    classification:
      input.classification ?? {
        bandCode: null,
        numericBasis: null,
        bandDefinitionVersion: "P3_BANDS_V1",
        provenance:
          "Classification not computed by Structured Result assembler.",
      },
    diagnostics: {
      findings,
    },
    audit: {
      replayableFrom: [
        "pinned assessment version",
        "stored answers",
        `interpretation version:${input.interpretationVersion}`,
        `scoring contract:${input.scoringContractVersion}`,
        `assessment config digest:${input.assessmentConfigDigest}`,
        "economic inputs",
      ],
    },
  };
}

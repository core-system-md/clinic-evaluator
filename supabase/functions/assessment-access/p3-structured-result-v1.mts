/**
 * P3 Structured Result V1 — NON-PRODUCTION.
 *
 * This module assembles already-computed measurement outputs.
 * It does not recalculate scores, infer roles/KPIs, or derive economics.
 */

import type { P3ProfileAggregation } from "./p3-aggregation-engine.mts";
import type { P3CoverageResult, P3CriticalityResult } from "./p3-criticality-coverage-engine.mts";
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
  status: "NON_PRODUCTION";
  identity: {
    sessionId: string;
    assessmentFamilyId: string;
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
    }>;
  };
  measurement: {
    profile: P3ProfileAggregation;
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
    status: "NOT_COMPUTED";
    modelCode: null;
    output: null;
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
  coverage: P3CoverageResult;
  consistencyFindings: P3ConsistencyFinding[];
  criticality: P3CriticalityResult;
  developmentSignals?: P3StructuredResultV1["development"]["signals"];
  roles?: P3StructuredRole[];
  kpis?: P3StructuredKPI[];
}): P3StructuredResultV1 {
  const requiredStrings = [
    input.sessionId,
    input.assessmentFamilyId,
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
      explanation: `Criticality status ${input.criticality.status} is preserved as a structured finding; it does not alter numeric scores.`,
    });
  }

  return {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "NON_PRODUCTION",
    identity: {
      sessionId: input.sessionId,
      assessmentFamilyId: input.assessmentFamilyId,
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
    inputs: { responses: input.responses.map((response) => ({ ...response })) },
    measurement: { profile: input.profile },
    coverage: input.coverage,
    consistency: { findings: input.consistencyFindings },
    criticality: input.criticality,
    development: { signals: input.developmentSignals ?? [] },
    roles: input.roles ?? [],
    kpis: input.kpis ?? [],
    economics: { status: "NOT_COMPUTED", modelCode: null, output: null },
    diagnostics: { findings },
    audit: {
      replayableFrom: [
        "pinned assessment version",
        "stored answers",
        `interpretation version:${input.interpretationVersion}`,
        `scoring contract:${input.scoringContractVersion}`,
        `assessment config digest:${input.assessmentConfigDigest}`,
      ],
    },
  };
}

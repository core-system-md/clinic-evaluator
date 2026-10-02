/** P3 integrated scorer/result path — NON-PRODUCTION. */
import {
  scoreP3AssessmentV1,
  type P3Selection,
  type P3ResolvedSelection,
} from "./p3-scorer-v1.mts";
import {
  buildP3Coverage,
  evaluateP3Criticality,
  type P3CoverageItem,
  type P3CriticalityItem,
} from "./p3-criticality-coverage-engine.mts";
import {
  evaluateP3Consistency,
  type P3ConsistencyRule,
  type P3ConsistencyFinding,
} from "./p3-consistency-engine.mts";
import {
  buildP3StructuredResultV1,
  type P3StructuredKPI,
  type P3StructuredRole,
} from "./p3-structured-result-v1.mts";

export type P3AxisConfig = {
  code: string;
  weight: number;
};

export type P3ConsistencyPair = {
  relationshipType: string;
  validatorQuestionCode: string;
  targetQuestionCode: string;
};

export type P3EconomicInput = {
  averageVisitValue: number | null;
  relationshipYears: number | null;
  referralPercentage: number | null;
};

export type P3IntegratedResult = ReturnType<typeof buildP3StructuredResultV1> & {
  scores: {
    overallScore: number | null;
    axes: Array<{ axisCode: string; score: number | null; weight: number; status: "measured" | "unavailable" }>;
  };
};

function axisScore(items: P3ResolvedSelection[]): number | null {
  const eligible = items.filter(
    (item) =>
      item.answered &&
      item.scoreEligible &&
      item.scoreMode === "DIRECT_ANCHOR" &&
      Number.isFinite(item.anchorScore) &&
      Number.isFinite(item.anchorMax) &&
      Number(item.anchorMax) > 0,
  );
  if (!eligible.length) return null;
  return eligible.reduce(
    (sum, item) => sum + (Number(item.anchorScore) / Number(item.anchorMax)) * 100,
    0,
  ) / eligible.length;
}

function canonicalWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight < 0) throw new Error("Invalid axis weight");
  return weight > 1 ? weight / 100 : weight;
}

function projectRoles(
  axisResults: Array<{ axisCode: string; score: number | null; weight: number }>,
  axisRoles: Record<string, string>,
): P3StructuredRole[] {
  const grouped = new Map<string, Array<{ score: number; weight: number; axisCode: string }>>();
  for (const axis of axisResults) {
    const role = axisRoles[axis.axisCode];
    if (!role || !Number.isFinite(axis.score)) continue;
    const list = grouped.get(role) ?? [];
    list.push({ score: Number(axis.score), weight: axis.weight, axisCode: axis.axisCode });
    grouped.set(role, list);
  }
  const allRoles = [...new Set(Object.values(axisRoles))].sort();
  return allRoles.map((role) => {
    const entries = grouped.get(role) ?? [];
    if (!entries.length) {
      return {
        roleCode: role,
        status: "unavailable",
        sourceComponents: [],
        value: null,
        coverage: 0,
        provenance: "P3 axis-role projection V1; no measured axis for this role",
      };
    }
    const weight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    const value = entries.reduce((sum, entry) => sum + entry.score * entry.weight, 0) / weight;
    return {
      roleCode: role,
      status: "available",
      sourceComponents: entries.map((entry) => entry.axisCode),
      value,
      coverage: 1,
      provenance: "P3 axis-role projection V1; existing axis configuration",
    };
  });
}

function projectKpis(
  mappings: Record<string, Record<string, number>>,
  roles: P3StructuredRole[],
): P3StructuredKPI[] {
  const roleMap = new Map(roles.map((role) => [role.roleCode, role]));
  return Object.entries(mappings).sort(([a], [b]) => a.localeCompare(b)).map(([kpiCode, mapping]) => {
    const declaredWeight = Object.values(mapping).reduce((sum, value) => sum + Number(value), 0);
    const entries = Object.entries(mapping).filter(([role]) => {
      const value = roleMap.get(role)?.value;
      return Number.isFinite(value);
    });
    if (!entries.length || declaredWeight <= 0) {
      return {
        kpiCode,
        status: "unavailable",
        value: null,
        inputComponents: [],
        coverage: 0,
        mappingVersion: "P3_EXISTING_MAPPING_V1",
        provenance: "P3 KPI projection V1; no measured mapped roles and no role imputation",
      };
    }
    const contributingWeight = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
    const value = entries.reduce(
      (sum, [role, weight]) => sum + Number(roleMap.get(role)!.value) * Number(weight),
      0,
    ) / contributingWeight;
    return {
      kpiCode,
      status: contributingWeight === declaredWeight ? "available" : "partial",
      value,
      inputComponents: entries.map(([role]) => role),
      coverage: contributingWeight / declaredWeight,
      mappingVersion: "P3_EXISTING_MAPPING_V1",
      provenance: "P3 KPI projection V1; existing mapping weights, no fallback/imputation",
    };
  });
}

function projectEconomics(input: P3EconomicInput) {
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
      status: "unavailable" as const,
      modelCode: "P3_RECURSIVE_REFERRAL_V1",
      output: null,
    };
  }
  const base = Number(averageVisitValue) * 3 * Number(relationshipYears);
  const output = base / (1 - Number(referralPercentage) / 100);
  return {
    status: "available" as const,
    modelCode: "P3_RECURSIVE_REFERRAL_V1",
    output: {
      value: output,
      unit: "currency",
      assumptions: { visitsPerYear: 3, referralPercentage: Number(referralPercentage) },
    },
  };
}

function buildConsistencyFindings(
  selections: P3ResolvedSelection[],
  rules: P3ConsistencyRule[],
  pairs: P3ConsistencyPair[],
  assessmentSlug: string,
  assessmentVersion: string,
): P3ConsistencyFinding[] {
  const byQuestion = new Map(selections.map((item) => [item.questionCode, item]));
  const findings: P3ConsistencyFinding[] = [];
  for (const pair of pairs) {
    const validator = byQuestion.get(pair.validatorQuestionCode);
    const target = byQuestion.get(pair.targetQuestionCode);
    if (!validator || !target) continue;
    const finding = evaluateP3Consistency(rules, {
      assessmentSlug,
      assessmentVersion,
      validator,
      target,
      relationshipType: pair.relationshipType,
    });
    if (finding) findings.push(finding);
  }
  return findings;
}

export function scoreP3IntegratedV1(input: {
  sessionId: string;
  assessmentFamilyId: string;
  assessmentTypeId: string;
  assessmentVersion: string;
  resultId: string;
  calculatedAt: string;
  scoringContractVersion: string;
  assessmentConfigDigest: string;
  assessmentSlug: string;
  selections: P3Selection[];
  axes: P3AxisConfig[];
  axisRoles: Record<string, string>;
  kpiMappings: Record<string, Record<string, number>>;
  consistencyRules?: P3ConsistencyRule[];
  consistencyPairs?: P3ConsistencyPair[];
  economicInput?: P3EconomicInput;
  developmentSignals?: Array<{
    signalId: string;
    domain: string;
    sourceItems: string[];
    component: string;
    currentState: string;
    evidenceState: string;
    pathway: string;
  }>;
}): P3IntegratedResult {
  const scored = scoreP3AssessmentV1({
    assessmentSlug: input.assessmentSlug,
    selections: input.selections,
  });

  const byAxis = new Map<string, P3ResolvedSelection[]>();
  for (const item of scored.selections) {
    if (!item.axisCode) continue;
    const list = byAxis.get(item.axisCode) ?? [];
    list.push(item);
    byAxis.set(item.axisCode, list);
  }

  const axisResults = input.axes.map((axis) => {
    const weight = canonicalWeight(axis.weight);
    const score = axisScore(byAxis.get(axis.code) ?? []);
    return {
      axisCode: axis.code,
      score,
      weight,
      status: score === null ? "unavailable" as const : "measured" as const,
    };
  });

  const validAxes = axisResults.filter((axis) => Number.isFinite(axis.score) && axis.weight > 0);
  const weightSum = validAxes.reduce((sum, axis) => sum + axis.weight, 0);
  const overallScore = validAxes.length
    ? validAxes.reduce((sum, axis) => sum + Number(axis.score) * axis.weight, 0) / weightSum
    : null;

  const coverageItems: P3CoverageItem[] = scored.selections.map((item) => ({
    questionCode: item.questionCode,
    answered: item.answered,
    interpreted: item.answered,
    scoreClass:
      item.scoreMode === "DIRECT_ANCHOR"
        ? item.scoreEligible && Number.isFinite(item.anchorScore) && Number.isFinite(item.anchorMax)
          ? "NUMERIC"
          : "UNSUPPORTED"
        : item.scoreMode === "SEMANTIC_ONLY"
          ? "SEMANTIC_ONLY"
          : item.scoreMode === "EVIDENCE_ONLY"
            ? "EVIDENCE_ONLY"
            : "SIGNAL_ONLY",
  }));
  const coverage = buildP3Coverage(coverageItems, scored.selections.length);

  const criticalityItems: P3CriticalityItem[] = scored.selections.map((item) => ({
    questionCode: item.questionCode,
    criticality: item.criticality ?? "NORMAL",
    answered: item.answered,
    interpreted: item.answered,
  }));
  const criticality = evaluateP3Criticality(criticalityItems, coverage.coverageStatus);

  const consistencyFindings = buildConsistencyFindings(
    scored.selections,
    input.consistencyRules ?? [],
    input.consistencyPairs ?? [],
    input.assessmentSlug,
    input.assessmentVersion,
  );

  const roles = projectRoles(axisResults, input.axisRoles);
  const kpis = projectKpis(input.kpiMappings, roles);
  const economics = projectEconomics(input.economicInput ?? {
    averageVisitValue: null,
    relationshipYears: null,
    referralPercentage: null,
  });

  const structured = buildP3StructuredResultV1({
    sessionId: input.sessionId,
    assessmentFamilyId: input.assessmentFamilyId,
    assessmentTypeId: input.assessmentTypeId,
    assessmentVersion: input.assessmentVersion,
    resultId: input.resultId,
    calculatedAt: input.calculatedAt,
    engineIdentity: "P3_INTEGRATED_SCORER_V1_NONPRODUCTION",
    scoringContractVersion: input.scoringContractVersion,
    assessmentConfigDigest: input.assessmentConfigDigest,
    interpretationVersion: String(scored.interpretationVersion),
    scoringEngineVersion: scored.scorerVersion,
    inputLineage: scored.selections
      .filter((item) => item.answered && item.optionId)
      .map((item) => `${item.questionCode}:${item.optionId}`),
    responses: scored.selections
      .filter((item) => item.answered && item.optionId && item.semanticStateKey)
      .map((item) => ({
        questionCode: item.questionCode,
        optionId: item.optionId!,
        optionIndex: item.optionIndex!,
        sourceOptionValue: item.sourceOptionValue ?? null,
        semanticStateKey: item.semanticStateKey!,
      })),
    profile: scored.profile,
    overallScore,
    axisScores: axisResults,
    coverage,
    consistencyFindings,
    criticality,
    developmentSignals: input.developmentSignals,
    roles,
    kpis,
  });

  return {
    ...structured,
    economics: {
      status: economics.status === "available" ? "COMPUTED" : "NOT_COMPUTED",
      modelCode: economics.modelCode,
      output: economics.output,
    },
  };
}

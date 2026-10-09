/** P3 integrated scorer/result path. */
import {
  scoreP3AssessmentV1,
  type P3Selection,
  type P3ResolvedSelection,
} from "./response-scorer.mts";
import { aggregateP3Profile } from "./component-aggregation-engine.mts";
import {
  buildP3Coverage,
  evaluateP3Criticality,
  type P3CoverageItem,
  type P3CriticalityItem,
} from "./coverage-criticality-engine.mts";
import {
  applyP3ConsistencyScoreEffects,
  evaluateP3Consistency,
  type P3ConsistencyRule,
  type P3ConsistencyFinding,
  type P3ConsistencyScoreEffect,
} from "./consistency-engine.mts";
import {
  calculateP3RecursiveReferralEconomic,
  type P3EconomicInput,
} from "./economic-opportunity-model-v1.mts";
import {
  buildP3StructuredResultV1,
  type P3StructuredResultV1,
  type P3StructuredKPI,
  type P3StructuredRole,
} from "./structured-result.mts";

export type P3AxisConfig = { code: string; weight: number; nameAr?: string; nameEn?: string };
export type P3ConsistencyPair = {
  relationshipType: string;
  validatorQuestionCode: string;
  targetQuestionCode: string;
  scoreEffectOverride?: P3ConsistencyScoreEffect;
};
export type P3IntegratedResult = ReturnType<typeof buildP3StructuredResultV1> & {
  resolvedSelections: P3ResolvedSelection[];
};

function axisMeasurement(items: P3ResolvedSelection[]) {
  const eligible = items.filter(
    (item) =>
      item.answered &&
      item.scoreEligible &&
      item.scoreMode === "DIRECT_ANCHOR" &&
      Number.isFinite(item.anchorScore) &&
      Number.isFinite(item.anchorMax) &&
      Number(item.anchorMax) > 0,
  );
  if (!eligible.length) {
    return {
      score: null as number | null,
      rawScore: null as number | null,
      maxPossible: null as number | null,
      percentage: null as number | null,
    };
  }

  const rawScore = eligible.reduce((sum, item) => sum + Number(item.anchorScore), 0);
  const maxPossible = eligible.reduce((sum, item) => sum + Number(item.anchorMax), 0);
  const percentage =
    eligible.reduce(
      (sum, item) =>
        sum + (Number(item.anchorScore) / Number(item.anchorMax)) * 100,
      0,
    ) / eligible.length;

  return {
    score: percentage,
    rawScore,
    maxPossible,
    percentage,
  };
}

function canonicalWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error("Invalid axis weight");
  }
  return weight > 1 ? weight / 100 : weight;
}

function projectRoles(
  axisResults: Array<{ axisCode: string; score: number | null; weight: number }>,
  axisRoles: Record<string, string>,
): P3StructuredRole[] {
  const grouped = new Map<
    string,
    Array<{ score: number; weight: number; axisCode: string }>
  >();

  for (const axis of axisResults) {
    const role = axisRoles[axis.axisCode];
    if (!role || !Number.isFinite(axis.score)) continue;
    const list = grouped.get(role) ?? [];
    list.push({
      score: Number(axis.score),
      weight: axis.weight,
      axisCode: axis.axisCode,
    });
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
        provenance:
          "P3 axis-role projection V1; no measured axis for this role",
      };
    }

    const weight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    const value =
      entries.reduce(
        (sum, entry) => sum + entry.score * entry.weight,
        0,
      ) / weight;

    return {
      roleCode: role,
      status: "available",
      sourceComponents: entries.map((entry) => entry.axisCode),
      value,
      coverage: 1,
      provenance:
        "P3 axis-role projection V1; existing axis configuration",
    };
  });
}

function projectKpis(
  mappings: Record<string, Record<string, number>>,
  roles: P3StructuredRole[],
): P3StructuredKPI[] {
  const roleMap = new Map(roles.map((role) => [role.roleCode, role]));

  return Object.entries(mappings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kpiCode, mapping]) => {
      const declaredWeight = Object.values(mapping).reduce(
        (sum, value) => sum + Number(value),
        0,
      );

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
          provenance:
            "P3 KPI projection V1; no measured mapped roles and no role imputation",
        };
      }

      const contributingWeight = entries.reduce(
        (sum, [, weight]) => sum + Number(weight),
        0,
      );
      const value =
        entries.reduce(
          (sum, [role, weight]) =>
            sum + Number(roleMap.get(role)!.value) * Number(weight),
          0,
        ) / contributingWeight;

      return {
        kpiCode,
        status:
          contributingWeight === declaredWeight ? "available" : "partial",
        value,
        inputComponents: entries.map(([role]) => role),
        coverage: contributingWeight / declaredWeight,
        mappingVersion: "P3_EXISTING_MAPPING_V1",
        provenance:
          "P3 KPI projection V1; existing mapping weights, no fallback/imputation",
      };
    });
}

function buildConsistencyFindings(
  selections: P3ResolvedSelection[],
  rules: P3ConsistencyRule[],
  pairs: P3ConsistencyPair[],
  assessmentSlug: string,
  assessmentVersion: string,
): P3ConsistencyFinding[] {
  const byQuestion = new Map(
    selections.map((item) => [item.questionCode, item]),
  );
  const findings: P3ConsistencyFinding[] = [];

  for (const pair of pairs) {
    const validator = byQuestion.get(pair.validatorQuestionCode);
    const target = byQuestion.get(pair.targetQuestionCode);
    if (!validator || !target) continue;

    const finding = evaluateP3Consistency(rules, {
      assessmentSlug,
      assessmentVersion,
      validator: { ...validator, assessmentSlug, assessmentVersion },
      target: { ...target, assessmentSlug, assessmentVersion },
      relationshipType: pair.relationshipType,
      scoreEffectOverride: pair.scoreEffectOverride,
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
  interpretationVersion: number;
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
  resultStatus?: P3StructuredResultV1["status"];
  engineIdentity?: string;
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
    interpretationVersion: input.interpretationVersion,
    selections: input.selections,
  });

  // Consistency is evaluated against the original interpreted selections.
  // Any declared score effect is then applied once, before numeric aggregation.
  const consistencyFindings = buildConsistencyFindings(
    scored.selections,
    input.consistencyRules ?? [],
    input.consistencyPairs ?? [],
    input.assessmentSlug,
    input.assessmentVersion,
  );
  const effectiveSelections = applyP3ConsistencyScoreEffects(
    scored.selections,
    consistencyFindings,
  );

  const byAxis = new Map<string, P3ResolvedSelection[]>();
  for (const item of effectiveSelections) {
    if (!item.axisCode) continue;
    const list = byAxis.get(item.axisCode) ?? [];
    list.push(item);
    byAxis.set(item.axisCode, list);
  }

  const axisResults = input.axes.map((axis) => {
    const weight = canonicalWeight(axis.weight);
    const measurement = axisMeasurement(byAxis.get(axis.code) ?? []);
    return {
      axisCode: axis.code,
      axisNameAr: axis.nameAr ?? axis.code,
      axisNameEn: axis.nameEn ?? axis.code,
      score: measurement.score,
      rawScore: measurement.rawScore,
      maxPossible: measurement.maxPossible,
      percentage: measurement.percentage,
      weight,
      weightedScore:
        measurement.percentage === null
          ? null
          : measurement.percentage * weight,
      status:
        measurement.score === null
          ? ("unavailable" as const)
          : ("measured" as const),
    };
  });

  const validAxes = axisResults.filter(
    (axis) => Number.isFinite(axis.score) && axis.weight > 0,
  );
  const weightSum = validAxes.reduce((sum, axis) => sum + axis.weight, 0);
  const overallScore = validAxes.length
    ? validAxes.reduce(
        (sum, axis) => sum + Number(axis.score) * axis.weight,
        0,
      ) / weightSum
    : null;

  const effectiveProfile = aggregateP3Profile(effectiveSelections);

  const coverageItems: P3CoverageItem[] = effectiveSelections.map((item) => ({
    questionCode: item.questionCode,
    answered: item.answered,
    interpreted: item.answered,
    scoreClass:
      item.scoreMode === "DIRECT_ANCHOR"
        ? item.scoreEligible &&
          Number.isFinite(item.anchorScore) &&
          Number.isFinite(item.anchorMax)
          ? "NUMERIC"
          : "UNSUPPORTED"
        : item.scoreMode === "SEMANTIC_ONLY"
          ? "SEMANTIC_ONLY"
          : item.scoreMode === "EVIDENCE_ONLY"
            ? "EVIDENCE_ONLY"
            : "SIGNAL_ONLY",
  }));

  const coverage = buildP3Coverage(
    coverageItems,
    effectiveSelections.length,
  );

  const criticalityItems: P3CriticalityItem[] = effectiveSelections.map(
    (item) => ({
      questionCode: item.questionCode,
      criticality: item.criticality ?? "NORMAL",
      answered: item.answered,
      interpreted: item.answered,
    }),
  );
  const criticality = evaluateP3Criticality(
    criticalityItems,
    coverage.coverageStatus,
  );

  const roles = projectRoles(axisResults, input.axisRoles);
  const kpis = projectKpis(input.kpiMappings, roles);
  const economics = calculateP3RecursiveReferralEconomic(
    input.economicInput ?? {
      averageVisitValue: null,
      relationshipYears: null,
      referralPercentage: null,
    },
  );

  const bandCode =
    overallScore === null
      ? null
      : overallScore >= 75
        ? "Q4"
        : overallScore >= 50
          ? "Q3"
          : overallScore >= 25
            ? "Q2"
            : "Q1";

  const structured = buildP3StructuredResultV1({
    sessionId: input.sessionId,
    assessmentFamilyId: input.assessmentFamilyId,
    assessmentTypeId: input.assessmentTypeId,
    assessmentVersion: input.assessmentVersion,
    resultId: input.resultId,
    calculatedAt: input.calculatedAt,
    engineIdentity:
      input.engineIdentity ?? "P3_INTEGRATED_SCORER_V1_NONPRODUCTION",
    scoringContractVersion: input.scoringContractVersion,
    assessmentConfigDigest: input.assessmentConfigDigest,
    interpretationVersion: String(scored.interpretationVersion),
    scoringEngineVersion: input.engineIdentity ?? "MD_CODE_ASSESSMENT_ENGINE",
    inputLineage: effectiveSelections
      .filter((item) => item.answered && item.optionId)
      .map((item) => `${item.questionCode}:${item.optionId}`),
    responses: effectiveSelections
      .filter(
        (item) =>
          item.answered && item.optionId && item.semanticStateKey,
      )
      .map((item) => ({
        questionCode: item.questionCode,
        optionId: item.optionId!,
        optionIndex: item.optionIndex!,
        sourceOptionValue: item.sourceOptionValue ?? null,
        semanticStateKey: item.semanticStateKey!,
      })),
    profile: effectiveProfile,
    overallScore,
    axisScores: axisResults,
    coverage,
    consistencyFindings,
    criticality,
    developmentSignals: input.developmentSignals,
    roles,
    kpis,
    resultStatus: input.resultStatus,
    classification: {
      bandCode,
      numericBasis: overallScore,
      bandDefinitionVersion: "P3_BANDS_V1",
      provenance:
        "P3 performance bands V1; Q1-Q4 are performance bands, not statistical quartiles.",
    },
    economics: {
      status:
        economics.status === "available" ? "COMPUTED" : "NOT_COMPUTED",
      modelCode: economics.modelCode,
      output: economics.output,
    },
  });

  return {
    ...structured,
    resolvedSelections: effectiveSelections,
  };
}

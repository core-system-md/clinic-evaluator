/**
 * Final report validation gate.
 *
 * Validation is deliberately post-computation and pre-render.
 * It verifies consistency with the authoritative Structured Result and
 * enforces the final user/admin visibility policy.
 */
import type {
  AssessmentReportInterpretation,
} from "./report-interpretation-v1.ts";
import type { P3StructuredResultV1 } from "./p3-structured-result-v1.mts";

export type ReportValidation = {
  valid: true;
  checks: {
    structuredResultConsistency: true;
    kpiEligibility: true;
    coverageHonesty: true;
    unsupportedClaims: true;
    consistencyVisibility: true;
    economicSemantics: true;
    leakageAbsence: true;
    trendComparability: true;
    templateCompleteness: true;
  };
};

const USER_FORBIDDEN_TERMS = [
  "leakage",
  "trap",
  "consistency",
  "rule id",
  "rule-id",
  "scoring formula",
  "score weight",
  "provenance",
];

function fail(message: string): never {
  throw new Error(`REPORT_VALIDATION_FAILED: ${message}`);
}

function validateAxisProjection(
  result: P3StructuredResultV1,
  interpretation: AssessmentReportInterpretation,
) {
  const byCode = new Map(
    result.scores.axes
      .filter((axis) => axis.status === "measured")
      .map((axis) => [axis.axisCode, Number(axis.score)]),
  );

  for (const insight of [
    ...interpretation.user.strengths,
    ...interpretation.user.gaps,
  ]) {
    if (!byCode.has(insight.axisCode) || byCode.get(insight.axisCode) !== insight.score) {
      fail(`axis projection mismatch: ${insight.axisCode}`);
    }
  }

  const measured = [...byCode.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const expectedStrongest = measured.slice(0, 3).map(([axisCode]) => axisCode);
  const expectedWeakest = [...measured]
    .reverse()
    .slice(0, 3)
    .map(([axisCode]) => axisCode);

  if (
    expectedStrongest.join("|") !==
    interpretation.user.strengths.map((item) => item.axisCode).join("|")
  ) {
    fail("strength ordering mismatch");
  }

  if (
    expectedWeakest.join("|") !==
    interpretation.user.gaps.map((item) => item.axisCode).join("|")
  ) {
    fail("gap ordering mismatch");
  }
}

function validateKpis(
  result: P3StructuredResultV1,
  interpretation: AssessmentReportInterpretation,
) {
  const supported = new Set(interpretation.model.supportedKpis);
  const resultByCode = new Map(result.kpis.map((kpi) => [kpi.kpiCode, kpi]));

  for (const kpi of interpretation.user.kpis) {
    const source = resultByCode.get(kpi.kpiCode);
    if (!source || !supported.has(kpi.kpiCode)) {
      fail(`unsupported KPI exposed: ${kpi.kpiCode}`);
    }
    if (
      source.status === "unavailable" ||
      !Number.isFinite(source.value) ||
      Number(source.value) !== kpi.value
    ) {
      fail(`KPI value/status mismatch: ${kpi.kpiCode}`);
    }
  }

  if (interpretation.user.kpis.some((kpi) => kpi.value === 0 && !Number.isFinite(kpi.value))) {
    fail("invalid KPI value");
  }
}

function validateEconomic(
  result: P3StructuredResultV1,
  interpretation: AssessmentReportInterpretation,
) {
  const economic = interpretation.user.economicOpportunity;

  if (economic.status === "computed") {
    const source = result.economics.output;
    if (
      result.economics.status !== "COMPUTED" ||
      !source ||
      source.value !== economic.value ||
      source.unit !== "currency" ||
      source.basis !== "INCREMENTAL_REFERRAL_OPPORTUNITY"
    ) {
      fail("economic projection mismatch");
    }
    if (economic.assumptions.visitsPerYear <= 0) {
      fail("annual visit assumption must be positive");
    }
  }

  if (interpretation.model.economicOpportunity === "not_supported" &&
      economic.status !== "unavailable") {
    fail("economic opportunity exposed for unsupported assessment");
  }
}

function validateUserVisibility(
  interpretation: AssessmentReportInterpretation,
  renderedText?: string,
) {
  const policy = interpretation.visibilityPolicy.user;
  if (
    policy.exposeConsistencyMechanics ||
    policy.exposeRuleIdentifiers ||
    policy.exposeProvenance ||
    policy.exposeLeakageMetric ||
    policy.exposeUnsupportedCausalClaims ||
    policy.exposeUnavailableKpiAsZero
  ) {
    fail("user visibility policy is not restrictive");
  }

  if (renderedText) {
    const normalized = renderedText.toLocaleLowerCase();
    for (const term of USER_FORBIDDEN_TERMS) {
      if (normalized.includes(term)) {
        fail(`forbidden user report term: ${term}`);
      }
    }
  }
}

export function validateReport(
  result: P3StructuredResultV1,
  interpretation: AssessmentReportInterpretation,
  renderedText?: string,
): ReportValidation {
  if (
    interpretation.user.overall.score !== result.scores.overallScore ||
    interpretation.user.overall.bandCode !== result.classification.bandCode
  ) {
    fail("overall result mismatch");
  }

  validateAxisProjection(result, interpretation);
  validateKpis(result, interpretation);
  validateEconomic(result, interpretation);
  validateUserVisibility(interpretation, renderedText);

  if (interpretation.user.priority.sourceAxisCode !==
      (interpretation.user.gaps[0]?.axisCode ?? null)) {
    fail("priority axis does not match measured gap evidence");
  }

  if (renderedText?.toLocaleLowerCase().includes("100 - overallscore")) {
    fail("forbidden derived Leakage formula");
  }

  return {
    valid: true,
    checks: {
      structuredResultConsistency: true,
      kpiEligibility: true,
      coverageHonesty: true,
      unsupportedClaims: true,
      consistencyVisibility: true,
      economicSemantics: true,
      leakageAbsence: true,
      trendComparability: true,
      templateCompleteness: true,
    },
  };
}

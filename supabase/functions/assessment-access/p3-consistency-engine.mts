/**
 * P3 consistency rule engine — NON-PRODUCTION.
 * Rules are declarative and evaluated only for an explicitly supplied
 * relationship between items from the same assessment/session context.
 * Missing/unsupported inputs never create contradiction findings.
 * Every V1 rule has scoreEffect=NONE.
 */
export type P3ConsistencyItem = {
  assessmentSlug: string;
  assessmentVersion: string;
  questionCode: string;
  componentCode: string;
  answered: boolean;
  scoreEligible: boolean;
  anchorScore?: number | null;
  anchorMax?: number | null;
  evidenceRole?: string;
  measurementType?: string;
  criticality?: string;
  contextRequired?: boolean;
};

export type P3ConsistencyRule = {
  ruleId: string;
  ruleVersion: number;
  relationshipType: string;
  trigger: { validator: Record<string, unknown>; target: Record<string, unknown> };
  severity: "INFO" | "ATTENTION" | "MATERIAL" | "CRITICAL";
  affectedComponents: "FROM_INPUTS" | string[];
  findingCode: string;
  interpretation: string;
  reviewRequired: boolean;
  scoreEffect: "NONE";
};

export type P3ConsistencyFinding = {
  ruleId: string;
  ruleVersion: number;
  relationshipType: string;
  inputItems: string[];
  triggerState: "MATCHED";
  severity: P3ConsistencyRule["severity"];
  affectedComponents: string[];
  findingCode: string;
  explanation: string;
  reviewRequired: boolean;
  scoreEffect: "NONE";
  assessmentSlug: string;
  assessmentVersion: string;
};

function checkCondition(item: P3ConsistencyItem, condition: Record<string, unknown>): boolean {
  if (condition.answered !== undefined && item.answered !== condition.answered) return false;
  if (condition.scoreEligible !== undefined && item.scoreEligible !== condition.scoreEligible) return false;
  if (condition.contextRequired !== undefined && item.contextRequired !== condition.contextRequired) return false;
  if (condition.evidenceRole !== undefined && item.evidenceRole !== condition.evidenceRole) return false;
  if (condition.measurementTypeIn !== undefined) {
    const allowed = condition.measurementTypeIn as string[];
    if (!item.measurementType || !allowed.includes(item.measurementType)) return false;
  }
  if (condition.criticalityIn !== undefined) {
    const allowed = condition.criticalityIn as string[];
    if (!item.criticality || !allowed.includes(item.criticality)) return false;
  }
  if (condition.minAnchorPercentage !== undefined) {
    if (!item.answered || !Number.isFinite(item.anchorScore) || !Number.isFinite(item.anchorMax) || Number(item.anchorMax) <= 0) return false;
    if ((Number(item.anchorScore) / Number(item.anchorMax)) * 100 < Number(condition.minAnchorPercentage)) return false;
  }
  if (condition.maxAnchorPercentage !== undefined) {
    if (!item.answered || !Number.isFinite(item.anchorScore) || !Number.isFinite(item.anchorMax) || Number(item.anchorMax) <= 0) return false;
    if ((Number(item.anchorScore) / Number(item.anchorMax)) * 100 > Number(condition.maxAnchorPercentage)) return false;
  }
  return true;
}

export function evaluateP3Consistency(
  rules: P3ConsistencyRule[],
  input: { assessmentSlug: string; assessmentVersion: string; validator: P3ConsistencyItem; target: P3ConsistencyItem; relationshipType: string },
): P3ConsistencyFinding | null {
  if (input.relationshipType === "" || input.relationshipType === undefined) return null;
  if (input.validator.assessmentSlug !== input.assessmentSlug || input.target.assessmentSlug !== input.assessmentSlug) return null;
  if (input.validator.assessmentVersion !== input.assessmentVersion || input.target.assessmentVersion !== input.assessmentVersion) return null;
  if (!input.validator.answered || !input.target.answered) return null;

  const rule = rules.find((candidate) => candidate.relationshipType === input.relationshipType);
  if (!rule) return null;
  if (!checkCondition(input.validator, rule.trigger.validator)) return null;
  if (!checkCondition(input.target, rule.trigger.target)) return null;

  return {
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    relationshipType: rule.relationshipType,
    inputItems: [input.validator.questionCode, input.target.questionCode],
    triggerState: "MATCHED",
    severity: rule.severity,
    affectedComponents:
      rule.affectedComponents === "FROM_INPUTS"
        ? [...new Set([input.validator.componentCode, input.target.componentCode])]
        : rule.affectedComponents,
    findingCode: rule.findingCode,
    explanation: rule.interpretation,
    reviewRequired: rule.reviewRequired,
    scoreEffect: "NONE",
    assessmentSlug: input.assessmentSlug,
    assessmentVersion: input.assessmentVersion,
  };
}

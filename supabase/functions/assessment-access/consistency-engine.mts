/**
 * P3 consistency rule engine — shared scoring layer.
 *
 * Rules are declarative and evaluated only for an explicitly supplied
 * relationship between items from the same assessment/session context.
 *
 * V1 behavior remains signal-only unless an explicit rule declares a
 * score-effect mode. Score effects are item-level caps, not percentage
 * penalties, and are applied once before axis aggregation.
 */
export type P3ConsistencyScoreEffect =
  | "NONE"
  | {
      mode: "CAP_VALIDATOR_ANCHOR";
      maxEffectiveAnchorScore?: number | null;
    };

export type P3ConsistencyItem = {
  assessmentSlug: string;
  assessmentVersion: string;
  questionCode: string;
  componentCode: string;
  answered: boolean;
  scoreEligible: boolean;
  scoreMode?: string;
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
  scoreEffect: P3ConsistencyScoreEffect;
};

export type P3ConsistencyScoreAdjustment = {
  questionCode: string;
  originalAnchorScore: number;
  effectiveAnchorScore: number;
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
  scoreEffect: P3ConsistencyScoreEffect;
  scoreAdjustment?: P3ConsistencyScoreAdjustment;
  assessmentSlug: string;
  assessmentVersion: string;
};

function checkCondition(
  item: P3ConsistencyItem,
  condition: Record<string, unknown>,
): boolean {
  if (condition.answered !== undefined && item.answered !== condition.answered) {
    return false;
  }
  if (
    condition.scoreEligible !== undefined &&
    item.scoreEligible !== condition.scoreEligible
  ) {
    return false;
  }
  if (condition.scoreMode !== undefined && item.scoreMode !== condition.scoreMode) {
    return false;
  }
  if (
    condition.contextRequired !== undefined &&
    item.contextRequired !== condition.contextRequired
  ) {
    return false;
  }
  if (condition.evidenceRole !== undefined && item.evidenceRole !== condition.evidenceRole) {
    return false;
  }
  if (condition.measurementTypeIn !== undefined) {
    const allowed = condition.measurementTypeIn as string[];
    if (!item.measurementType || !allowed.includes(item.measurementType)) return false;
  }
  if (condition.criticalityIn !== undefined) {
    const allowed = condition.criticalityIn as string[];
    if (!item.criticality || !allowed.includes(item.criticality)) return false;
  }
  if (condition.minAnchorPercentage !== undefined) {
    if (
      !item.answered ||
      !Number.isFinite(item.anchorScore) ||
      !Number.isFinite(item.anchorMax) ||
      Number(item.anchorMax) <= 0
    ) {
      return false;
    }
    if (
      (Number(item.anchorScore) / Number(item.anchorMax)) * 100 <
      Number(condition.minAnchorPercentage)
    ) {
      return false;
    }
  }
  if (condition.maxAnchorPercentage !== undefined) {
    if (
      !item.answered ||
      !Number.isFinite(item.anchorScore) ||
      !Number.isFinite(item.anchorMax) ||
      Number(item.anchorMax) <= 0
    ) {
      return false;
    }
    if (
      (Number(item.anchorScore) / Number(item.anchorMax)) * 100 >
      Number(condition.maxAnchorPercentage)
    ) {
      return false;
    }
  }
  return true;
}

function resolveScoreEffect(
  rule: P3ConsistencyRule,
  override: P3ConsistencyScoreEffect | undefined,
  validator: P3ConsistencyItem,
): P3ConsistencyScoreEffect {
  if (override !== undefined && rule.scoreEffect === "NONE") {
    throw new Error(
      `Consistency pair override is not permitted for signal-only rule ${rule.ruleId}`,
    );
  }

  const effect = override ?? rule.scoreEffect;
  if (effect === "NONE") return "NONE";

  if (
    !validator.answered ||
    !validator.scoreEligible ||
    validator.scoreMode !== "DIRECT_ANCHOR" ||
    !Number.isFinite(validator.anchorScore) ||
    !Number.isFinite(validator.anchorMax) ||
    Number(validator.anchorMax) <= 0
  ) {
    return "NONE";
  }

  if (effect.mode !== "CAP_VALIDATOR_ANCHOR") {
    throw new Error(`Unsupported consistency score effect mode for ${rule.ruleId}`);
  }

  const rawCap = effect.maxEffectiveAnchorScore;
  const cap = Number(rawCap);
  if (
    rawCap === null ||
    rawCap === undefined ||
    !Number.isFinite(cap) ||
    cap < 0 ||
    cap > Number(validator.anchorMax)
  ) {
    throw new Error(
      `Invalid consistency anchor cap for ${rule.ruleId}:${validator.questionCode}`,
    );
  }

  return {
    mode: "CAP_VALIDATOR_ANCHOR",
    maxEffectiveAnchorScore: cap,
  };
}

export function evaluateP3Consistency(
  rules: P3ConsistencyRule[],
  input: {
    assessmentSlug: string;
    assessmentVersion: string;
    validator: P3ConsistencyItem;
    target: P3ConsistencyItem;
    relationshipType: string;
    scoreEffectOverride?: P3ConsistencyScoreEffect;
  },
): P3ConsistencyFinding | null {
  if (!input.relationshipType) return null;

  if (
    input.validator.assessmentSlug !== input.assessmentSlug ||
    input.target.assessmentSlug !== input.assessmentSlug
  ) {
    return null;
  }

  if (
    input.validator.assessmentVersion !== input.assessmentVersion ||
    input.target.assessmentVersion !== input.assessmentVersion
  ) {
    return null;
  }

  if (!input.validator.answered || !input.target.answered) return null;

  const rule = rules.find(
    (candidate) => candidate.relationshipType === input.relationshipType,
  );
  if (!rule) return null;

  if (!checkCondition(input.validator, rule.trigger.validator)) return null;
  if (!checkCondition(input.target, rule.trigger.target)) return null;

  const scoreEffect = resolveScoreEffect(
    rule,
    input.scoreEffectOverride,
    input.validator,
  );

  let scoreAdjustment: P3ConsistencyScoreAdjustment | undefined;
  if (
    scoreEffect !== "NONE" &&
    scoreEffect.mode === "CAP_VALIDATOR_ANCHOR" &&
    Number.isFinite(scoreEffect.maxEffectiveAnchorScore) &&
    Number.isFinite(input.validator.anchorScore)
  ) {
    const originalAnchorScore = Number(input.validator.anchorScore);
    const effectiveAnchorScore = Math.min(
      originalAnchorScore,
      Number(scoreEffect.maxEffectiveAnchorScore),
    );
    scoreAdjustment = {
      questionCode: input.validator.questionCode,
      originalAnchorScore,
      effectiveAnchorScore,
    };
  }

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
    scoreEffect,
    scoreAdjustment,
    assessmentSlug: input.assessmentSlug,
    assessmentVersion: input.assessmentVersion,
  };
}

/**
 * Apply all matched consistency caps exactly once.
 *
 * A validator participating in several matched score-effect rules receives
 * the strictest declared cap, not repeated/stacked penalties. The function
 * returns fresh selection objects and never mutates the input array/items.
 */
export function applyP3ConsistencyScoreEffects<T extends P3ConsistencyItem>(
  selections: T[],
  findings: P3ConsistencyFinding[],
): T[] {
  const capByQuestion = new Map<string, number>();

  for (const finding of findings) {
    const adjustment = finding.scoreAdjustment;
    if (!adjustment) continue;
    const current = capByQuestion.get(adjustment.questionCode);
    const nextCap = adjustment.effectiveAnchorScore;
    capByQuestion.set(
      adjustment.questionCode,
      current === undefined ? nextCap : Math.min(current, nextCap),
    );
  }

  return selections.map((selection) => {
    const cap = capByQuestion.get(selection.questionCode);
    if (
      cap === undefined ||
      !selection.answered ||
      !selection.scoreEligible ||
      selection.scoreMode !== "DIRECT_ANCHOR" ||
      !Number.isFinite(selection.anchorScore) ||
      !Number.isFinite(selection.anchorMax) ||
      Number(selection.anchorMax) <= 0
    ) {
      return { ...selection };
    }

    return {
      ...selection,
      anchorScore: Math.min(Number(selection.anchorScore), cap),
    };
  });
}

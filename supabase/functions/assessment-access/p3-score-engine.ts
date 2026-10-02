/**
 * P3 scoring kernel — NON-PRODUCTION.
 *
 * This module intentionally does not replace score-engine.ts.
 * It builds the canonical structured result from already-resolved
 * response interpretations. Numeric aggregation remains explicit and
 * versioned outside this kernel until calibration is approved.
 */

export type P3ScoreMode =
  | "DIRECT_ANCHOR"
  | "SEMANTIC_ONLY"
  | "EVIDENCE_ONLY"
  | "SIGNAL_ONLY";

export type P3Criticality =
  | "NORMAL"
  | "ATTENTION"
  | "CRITICAL_FINDING"
  | "UNVERIFIED";

export type P3CoverageStatus =
  | "NOT_MEASURED"
  | "PARTIAL"
  | "ADEQUATE"
  | "FULL"
  | "UNSUPPORTED";

export type P3ItemInterpretation = {
  questionCode: string;
  optionId: string;
  optionIndex: number;
  semanticStateKey: string;
  measurementType: string;
  componentCode: string;
  measurementLayer: string;
  direction: "POSITIVE" | "NEGATIVE" | "CONTEXTUAL" | "NON_MONOTONIC";
  scoreMode: P3ScoreMode;
  anchorScore?: number;
  scoreEligible: boolean;
  criticality: P3Criticality;
  consistencyRole?: string;
  evidenceRole?: string;
  contextRequired?: boolean;
  rationale?: string;
};

export type P3Answer = {
  questionCode: string;
  optionId: string;
  optionIndex: number;
};

export type P3Coverage = {
  expectedApplicable: number;
  answered: number;
  scored: number;
  missing: number;
  semanticOnly: number;
  evidenceOnly: number;
  signalOnly: number;
  unsupported: number;
  notApplicable: number;
  coverageRatio: number;
  coverageStatus: P3CoverageStatus;
};

export type P3ItemResult = P3ItemInterpretation & {
  answered: boolean;
  selected: boolean;
};

export type P3ComponentProfile = {
  componentCode: string;
  layers: Record<string, {
    items: P3ItemResult[];
    coverage: P3Coverage;
    rawScore?: number;
    maxPossible?: number;
  }>;
  contextSignals: P3ItemResult[];
  consistencySignals: P3ItemResult[];
  criticalFindings: P3ItemResult[];
  developmentSignals: P3ItemResult[];
};

export type P3StructuredResult = {
  identity: {
    assessmentFamilyId: string;
    assessmentTypeId: string;
    assessmentVersion: string;
  };
  provenance: {
    interpretationVersion: string;
    scoringEngineVersion: string;
  };
  items: P3ItemResult[];
  profile: {
    components: P3ComponentProfile[];
  };
  coverage: P3Coverage;
  criticality: {
    findings: P3ItemResult[];
  };
};

function coverageStatus(c: Omit<P3Coverage, "coverageRatio" | "coverageStatus">): P3CoverageStatus {
  if (c.expectedApplicable === 0) return "NOT_MEASURED";
  if (c.answered === 0) return "PARTIAL";
  if (c.answered < c.expectedApplicable) return "PARTIAL";
  if (c.scored === 0) return "UNSUPPORTED";
  if (c.answered === c.scored && c.answered === c.expectedApplicable) return "FULL";
  return "ADEQUATE";
}

function buildCoverage(items: P3ItemResult[]): P3Coverage {
  const expectedApplicable = items.length;
  const answered = items.filter((x) => x.answered).length;
  const scored = items.filter((x) => x.answered && x.scoreEligible && x.scoreMode === "DIRECT_ANCHOR").length;
  const missing = expectedApplicable - answered;
  const semanticOnly = items.filter((x) => x.answered && x.scoreMode === "SEMANTIC_ONLY").length;
  const evidenceOnly = items.filter((x) => x.answered && x.scoreMode === "EVIDENCE_ONLY").length;
  const signalOnly = items.filter((x) => x.answered && x.scoreMode === "SIGNAL_ONLY").length;
  const unsupported = items.filter((x) => x.answered && !x.scoreEligible && x.scoreMode === "DIRECT_ANCHOR").length;
  const notApplicable = 0;
  const base = { expectedApplicable, answered, scored, missing, semanticOnly, evidenceOnly, signalOnly, unsupported, notApplicable };
  return {
    ...base,
    coverageRatio: expectedApplicable ? answered / expectedApplicable : 0,
    coverageStatus: coverageStatus(base),
  };
}

export function buildP3StructuredResult(input: {
  assessmentFamilyId: string;
  assessmentTypeId: string;
  assessmentVersion: string;
  interpretationVersion: string;
  scoringEngineVersion: string;
  answers: P3Answer[];
  interpretations: P3ItemInterpretation[];
}): P3StructuredResult {
  const answersByQuestion = new Map(input.answers.map((a) => [a.questionCode, a]));

  const items: P3ItemResult[] = input.interpretations.map((i) => {
    const answer = answersByQuestion.get(i.questionCode);
    return {
      ...i,
      answered: Boolean(answer),
      selected: Boolean(answer && answer.optionId === i.optionId),
    };
  });

  const selected = items.filter((i) => i.selected);
  const componentMap = new Map<string, P3ComponentProfile>();

  for (const item of selected) {
    const component = componentMap.get(item.componentCode) || {
      componentCode: item.componentCode,
      layers: {},
      contextSignals: [],
      consistencySignals: [],
      criticalFindings: [],
      developmentSignals: [],
    };

    const layer = component.layers[item.measurementLayer] || { items: [], coverage: buildCoverage([]) };
    layer.items.push(item);
    layer.coverage = buildCoverage(layer.items);
    component.layers[item.measurementLayer] = layer;

    if (item.contextRequired || item.direction === "CONTEXTUAL") component.contextSignals.push(item);
    if (item.consistencyRole) component.consistencySignals.push(item);
    if (item.criticality === "CRITICAL_FINDING" || item.criticality === "ATTENTION") component.criticalFindings.push(item);
    if (item.scoreMode !== "DIRECT_ANCHOR" || !item.scoreEligible) component.developmentSignals.push(item);

    componentMap.set(item.componentCode, component);
  }

  const coverage = buildCoverage(selected);
  return {
    identity: {
      assessmentFamilyId: input.assessmentFamilyId,
      assessmentTypeId: input.assessmentTypeId,
      assessmentVersion: input.assessmentVersion,
    },
    provenance: {
      interpretationVersion: input.interpretationVersion,
      scoringEngineVersion: input.scoringEngineVersion,
    },
    items,
    profile: { components: [...componentMap.values()] },
    coverage,
    criticality: { findings: selected.filter((i) => i.criticality !== "NORMAL") },
  };
}

/**
 * Numeric aggregation is deliberately explicit.
 * This helper only aggregates eligible direct-anchor items in one component/layer.
 * It does not apply weights, traps, penalties, or overall composites.
 */
export function aggregateDirectAnchors(items: P3ItemResult[]) {
  const eligible = items.filter(
    (i) => i.selected && i.answered && i.scoreEligible && i.scoreMode === "DIRECT_ANCHOR" && Number.isFinite(i.anchorScore),
  );
  if (!eligible.length) return { rawScore: null, maxPossible: null, percentage: null, count: 0 };

  const rawScore = eligible.reduce((sum, i) => sum + Number(i.anchorScore), 0);
  const maxPossible = eligible.length * 100;
  return {
    rawScore,
    maxPossible,
    percentage: Math.round((rawScore / maxPossible) * 100),
    count: eligible.length,
  };
}

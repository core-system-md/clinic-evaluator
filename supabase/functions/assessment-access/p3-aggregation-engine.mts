/**
 * P3 component aggregation — NON-PRODUCTION.
 *
 * Contract:
 * - one resolved measurement per question;
 * - primary component is authoritative;
 * - exact measurementLayer is preserved (mixed layers are not duplicated);
 * - numeric score uses eligible DIRECT_ANCHOR responses only;
 * - each numeric item has explicit anchorMax;
 * - current V1 uses equal item weighting;
 * - missing/semantic/evidence/context states never become numeric zero;
 * - no impact/trap weight, penalty, role imputation, or overall composite.
 */

export type P3AggregationScoreMode =
  | "DIRECT_ANCHOR"
  | "SEMANTIC_ONLY"
  | "EVIDENCE_ONLY"
  | "SIGNAL_ONLY";

export type P3ResolvedMeasurement = {
  questionCode: string;
  componentCode: string;
  primaryConstruct: string;
  measurementLayer: string;
  answered: boolean;
  scoreMode: P3AggregationScoreMode;
  scoreEligible: boolean;
  anchorScore?: number | null;
  anchorMax?: number | null;
};

export type P3CoverageStatus =
  | "NOT_MEASURED"
  | "PARTIAL"
  | "ADEQUATE"
  | "FULL"
  | "UNSUPPORTED";

export type P3ComponentLayerAggregation = {
  componentCode: string;
  primaryConstruct: string;
  measurementLayer: string;
  expectedItems: number;
  answered: number;
  scored: number;
  missing: number;
  semanticOnly: number;
  evidenceOnly: number;
  signalOnly: number;
  unsupported: number;
  notApplicable: number;
  interpretableAnswered: number;
  coverageRatio: number;
  coverageStatus: P3CoverageStatus;
  score: null | {
    rawScore: number;
    maxPossible: number;
    percentage: number;
    count: number;
    weighting: "EQUAL_ITEM_V1";
  };
};

export type P3ComponentAggregation = {
  componentCode: string;
  layers: P3ComponentLayerAggregation[];
};

export type P3ProfileAggregation = {
  components: P3ComponentAggregation[];
  overallComposite: null;
};

function layerStatus(expected: number, missing: number, unsupported: number): P3CoverageStatus {
  if (expected === 0) return "NOT_MEASURED";
  if (unsupported > 0) return "UNSUPPORTED";
  if (missing > 0) return "PARTIAL";
  return "FULL";
}

function numericScore(items: P3ResolvedMeasurement[]) {
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

  const rawScore = eligible.reduce((sum, item) => sum + Number(item.anchorScore), 0);
  const maxPossible = eligible.reduce((sum, item) => sum + Number(item.anchorMax), 0);
  const percentage =
    Math.round(
      (eligible.reduce(
        (sum, item) => sum + (Number(item.anchorScore) / Number(item.anchorMax)) * 100,
        0,
      ) / eligible.length) *
        100,
    ) / 100;

  return {
    rawScore,
    maxPossible,
    percentage,
    count: eligible.length,
    weighting: "EQUAL_ITEM_V1" as const,
  };
}

function aggregateLayer(
  items: P3ResolvedMeasurement[],
): P3ComponentLayerAggregation {
  const questionCodes = new Set(items.map((item) => item.questionCode));
  if (questionCodes.size !== items.length) {
    throw new Error("Duplicate questionCode inside one component/layer bucket");
  }

  const expectedItems = items.length;
  const answered = items.filter((item) => item.answered).length;
  const missing = expectedItems - answered;
  const scored = items.filter(
    (item) =>
      item.answered &&
      item.scoreEligible &&
      item.scoreMode === "DIRECT_ANCHOR" &&
      Number.isFinite(item.anchorScore) &&
      Number.isFinite(item.anchorMax) &&
      Number(item.anchorMax) > 0,
  ).length;
  const semanticOnly = items.filter(
    (item) => item.answered && item.scoreMode === "SEMANTIC_ONLY",
  ).length;
  const evidenceOnly = items.filter(
    (item) => item.answered && item.scoreMode === "EVIDENCE_ONLY",
  ).length;
  const signalOnly = items.filter(
    (item) => item.answered && item.scoreMode === "SIGNAL_ONLY",
  ).length;
  const unsupported = items.filter(
    (item) =>
      item.answered &&
      item.scoreMode === "DIRECT_ANCHOR" &&
      (
        !item.scoreEligible ||
        !Number.isFinite(item.anchorScore) ||
        !Number.isFinite(item.anchorMax) ||
        Number(item.anchorMax) <= 0
      ),
  ).length;
  const interpretableAnswered = answered - unsupported;
  const coverageRatio = expectedItems
    ? Math.round((interpretableAnswered / expectedItems) * 10000) / 10000
    : 0;

  return {
    componentCode: items[0]?.componentCode ?? "",
    primaryConstruct: items[0]?.primaryConstruct ?? "",
    measurementLayer: items[0]?.measurementLayer ?? "",
    expectedItems,
    answered,
    scored,
    missing,
    semanticOnly,
    evidenceOnly,
    signalOnly,
    unsupported,
    notApplicable: 0,
    interpretableAnswered,
    coverageRatio,
    coverageStatus: layerStatus(expectedItems, missing, unsupported),
    score: numericScore(items),
  };
}

export function aggregateP3Profile(
  items: P3ResolvedMeasurement[],
): P3ProfileAggregation {
  const buckets = new Map<string, P3ResolvedMeasurement[]>();

  for (const item of items) {
    if (!item.componentCode) throw new Error(`Missing component for ${item.questionCode}`);
    if (!item.primaryConstruct) throw new Error(`Missing construct for ${item.questionCode}`);
    if (!item.measurementLayer) throw new Error(`Missing measurementLayer for ${item.questionCode}`);

    const key = `${item.componentCode}|${item.primaryConstruct}|${item.measurementLayer}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(item);
    buckets.set(key, bucket);
  }

  const componentMap = new Map<string, P3ComponentAggregation>();

  for (const bucketItems of buckets.values()) {
    const aggregated = aggregateLayer(bucketItems);
    const component =
      componentMap.get(aggregated.componentCode) ??
      { componentCode: aggregated.componentCode, layers: [] };
    component.layers.push(aggregated);
    componentMap.set(aggregated.componentCode, component);
  }

  for (const component of componentMap.values()) {
    component.layers.sort(
      (a, b) =>
        a.primaryConstruct.localeCompare(b.primaryConstruct) ||
        a.measurementLayer.localeCompare(b.measurementLayer),
    );
  }

  return {
    components: [...componentMap.values()].sort((a, b) =>
      a.componentCode.localeCompare(b.componentCode),
    ),
    overallComposite: null,
  };
}

/**
 * P3 scorer V1 — ISOLATED / NON-PRODUCTION.
 *
 * Flow:
 * selected option identity
 *   -> response interpretation
 *   -> resolved measurement
 *   -> component/layer aggregation
 *   -> multi-dimensional profile
 *
 * This module intentionally does not replace score-engine.ts.
 * It never uses source option_value as a score.
 */

import registry from "../../../documentation/architecture/P3-RESPONSE-INTERPRETATION-REGISTRY-V1.json" with { type: "json" };
import { aggregateP3Profile, type P3ResolvedMeasurement } from "./p3-aggregation-engine.mts";

type RegistryEntry = (typeof registry.entries)[number];

export type P3Selection = {
  questionCode: string;
  optionId: string;
  optionIndex: number;
};

export type P3ResolvedSelection = P3ResolvedMeasurement & {
  optionId?: string | null;
  optionIndex?: number | null;
  sourceOptionValue?: number | null;
  semanticStateKey?: string;
};

export type P3ScorerV1Result = {
  scorerVersion: "P3_SCORER_V1_NONPRODUCTION";
  assessmentSlug: string;
  interpretationVersion: number;
  selections: P3ResolvedSelection[];
  profile: ReturnType<typeof aggregateP3Profile>;
};

const byQuestion = new Map<string, RegistryEntry[]>();
for (const entry of registry.entries as RegistryEntry[]) {
  const key = `${entry.assessmentSlug}|${entry.questionCode}`;
  const list = byQuestion.get(key) ?? [];
  list.push(entry);
  byQuestion.set(key, list);
}

function questionEntries(assessmentSlug: string): RegistryEntry[][] {
  return [...byQuestion.entries()]
    .filter(([key]) => key.startsWith(`${assessmentSlug}|`))
    .map(([, entries]) => entries);
}

function stableQuestionMeta(entries: RegistryEntry[]) {
  const first = entries[0];
  if (!first) throw new Error("Question has no registry entries");
  for (const entry of entries) {
    if (
      entry.componentCode !== first.componentCode ||
      entry.primaryConstruct !== first.primaryConstruct ||
      entry.measurementLayer !== first.measurementLayer
    ) {
      throw new Error(`Question metadata drift: ${first.questionCode}`);
    }
  }
  return first;
}

export function resolveP3Selections(
  assessmentSlug: string,
  selections: P3Selection[],
  interpretationVersion = 1,
): P3ResolvedSelection[] {
  const questions = questionEntries(assessmentSlug);
  if (!questions.length) throw new Error(`Unknown assessment family: ${assessmentSlug}`);

  const seenQuestions = new Set<string>();
  const selectionByQuestion = new Map<string, P3Selection>();

  for (const selection of selections) {
    if (seenQuestions.has(selection.questionCode)) {
      throw new Error(`Duplicate selection: ${selection.questionCode}`);
    }
    seenQuestions.add(selection.questionCode);
    selectionByQuestion.set(selection.questionCode, selection);
  }

  const resolved: P3ResolvedSelection[] = [];

  for (const entries of questions) {
    const meta = stableQuestionMeta(entries);
    const selection = selectionByQuestion.get(meta.questionCode);

    if (!selection) {
      resolved.push({
        questionCode: meta.questionCode,
        componentCode: meta.componentCode,
        primaryConstruct: meta.primaryConstruct,
        measurementLayer: meta.measurementLayer,
        answered: false,
        scoreMode: meta.scoreMode,
        scoreEligible: false,
        anchorScore: null,
        anchorMax: meta.anchorMax ?? null,
        optionId: null,
        optionIndex: null,
        sourceOptionValue: null,
        semanticStateKey: undefined,
      });
      continue;
    }

    const entry = entries.find(
      (candidate) =>
        candidate.optionId === selection.optionId &&
        candidate.optionIndex === selection.optionIndex &&
        candidate.interpretationVersion === interpretationVersion,
    );
    if (!entry) {
      throw new Error(
        `Unknown option identity for ${selection.questionCode}[${selection.optionIndex}]`,
      );
    }

    resolved.push({
      questionCode: entry.questionCode,
      componentCode: entry.componentCode,
      primaryConstruct: entry.primaryConstruct,
      measurementLayer: entry.measurementLayer,
      answered: true,
      scoreMode: entry.scoreMode as P3ResolvedMeasurement["scoreMode"],
      scoreEligible: entry.scoreEligible,
      anchorScore: entry.anchorScore,
      anchorMax: entry.anchorMax ?? null,
      optionId: entry.optionId,
      optionIndex: entry.optionIndex,
      sourceOptionValue: entry.sourceOptionValue,
      semanticStateKey: entry.semanticStateKey,
    });
  }

  return resolved;
}

export function scoreP3AssessmentV1(input: {
  assessmentSlug: string;
  interpretationVersion?: number;
  selections: P3Selection[];
}): P3ScorerV1Result {
  const interpretationVersion = input.interpretationVersion ?? 1;
  const resolved = resolveP3Selections(
    input.assessmentSlug,
    input.selections,
    interpretationVersion,
  );
  const profile = aggregateP3Profile(resolved);
  return {
    scorerVersion: "P3_SCORER_V1_NONPRODUCTION",
    assessmentSlug: input.assessmentSlug,
    interpretationVersion,
    selections: resolved,
    profile,
  };
}

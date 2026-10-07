/**
 * MD Code central assessment engine — canonical server runtime.
 *
 * This is the single official calculation entrypoint. Assessment-specific
 * interpretation is explicitly bound to an interpretation configuration;
 * calculation stages are composed from reusable internal modules.
 */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  scoreP3IntegratedV1,
  type P3EconomicInput,
  type P3IntegratedResult,
} from "./p3-integrated-scorer-v1.mts";
import { type P3ResolvedSelection } from "./p3-scorer-v1.mts";
import { type P3ConsistencyRule } from "./p3-consistency-engine.mts";
import registry from "./p3-response-interpretation-registry-v1.json" with { type: "json" };
import registryV2 from "./p3-response-interpretation-registry-v2.json" with { type: "json" };
import consistencyRuleRegistry from "./p3-consistency-rule-registry-v2.json" with { type: "json" };
import consistencyPairRegistry from "./p3-consistency-pair-registry-v1.json" with { type: "json" };

type AssessmentRow = {
  id: string;
  slug: string;
  family_id: string;
  title_ar: string;
  title_en: string | null;
  description: string | null;
  version: number | null;
  config_version: number | null;
  question_count: number;
  axis_count: number;
  has_traps: boolean | null;
  has_ev_simulator: boolean | null;
  axis_roles: Record<string, string> | null;
  kpi_mappings: Record<string, Record<string, number>> | null;
  ev_mappings: Record<string, number> | null;
};

type AxisRow = {
  id: string;
  code: string;
  title: string;
  title_ar: string | null;
  weight: number;
  display_order: number;
};

type QuestionRow = {
  id: string;
  code: string;
  axis_id: string;
  question_text: string;
  question_text_ar: string | null;
  question_type: string | null;
  display_order: number;
  is_required: boolean | null;
  impact: string | null;
  layer: string | null;
};

type OptionRow = {
  id: string;
  question_id: string;
  option_index: number;
  option_value: number;
};

type Runtime = {
  assessment: AssessmentRow;
  family: { id: string; slug: string };
  axes: AxisRow[];
  questions: QuestionRow[];
  options: OptionRow[];
};

type StoredAnswer = {
  question_id: string;
  option_index: number;
  option_value: number | null;
};

export type AssessmentComputation = {
  result: P3IntegratedResult;
  scoreRows: Array<Record<string, unknown>>;
  provenance: {
    assessmentVersion: number;
    interpretationVersion: number;
    scoringEngineVersion: string;
    scoringContractVersion: string;
    assessmentConfigDigest: string;
  };
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  const record = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stable(record[key]))
      .join(",") +
    "}"
  );
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ENGINE_IDENTITY = "MD_CODE_ASSESSMENT_ENGINE";
const SCORING_CONTRACT_ID = "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07";

type InterpretationBinding = {
  registry: typeof registry | typeof registryV2;
  interpretationVersion: number;
};

/**
 * Assessment-version to interpretation-version binding is explicit.
 * It must not be inferred from numeric equality between the two concepts.
 */
const INTERPRETATION_BINDINGS: Record<string, InterpretationBinding> = {
  "admin-reception-assessment:1": {
    registry,
    interpretationVersion: 1,
  },
  "clinic-performance:1": {
    registry,
    interpretationVersion: 1,
  },
  "comprehensive-clinic-assessment:1": {
    registry,
    interpretationVersion: 1,
  },
  "comprehensive-clinic-assessment:2": {
    registry: registryV2,
    interpretationVersion: 2,
  },
  "medical-team-assessment:1": {
    registry,
    interpretationVersion: 1,
  },
  "patient-journey:1": {
    registry,
    interpretationVersion: 1,
  },
};

function resolveInterpretationBinding(
  assessmentSlug: string,
  assessmentVersion: number,
): InterpretationBinding {
  const binding = INTERPRETATION_BINDINGS[`${assessmentSlug}:${assessmentVersion}`];
  if (!binding) {
    throw new Error(
      `No explicit interpretation binding for ${assessmentSlug}:${assessmentVersion}`,
    );
  }

  const entries = (binding.registry.entries as Array<Record<string, unknown>>)
    .filter((entry) => entry.assessmentSlug === assessmentSlug)
    .filter(
      (entry) =>
        Number(entry.interpretationVersion) === binding.interpretationVersion,
    );

  if (!entries.length) {
    throw new Error(
      `Interpretation binding resolves to no registry entries for ${assessmentSlug}:${binding.interpretationVersion}`,
    );
  }

  return binding;
}

type RuntimeConsistencyPair = {
  assessmentSlug: string;
  assessmentVersion: string;
  relationshipType: string;
  validatorQuestionCode: string;
  targetQuestionCode: string;
  scoreEffectOverride?: {
    mode: "CAP_VALIDATOR_ANCHOR";
    maxEffectiveAnchorScore?: number | null;
  };
};

function canonicalAxisConfigurations(
  axes: AxisRow[],
): Array<{ code: string; weight: number }> {
  const normalized = axes.map((axis) => {
    const raw = Number(axis.weight);
    if (!Number.isFinite(raw) || raw <= 0 || raw > 100) {
      throw new Error(`Invalid axis weight for ${axis.code}`);
    }

    // Legacy fractions are accepted only as a migration bridge.
    return {
      code: axis.code,
      weight: raw <= 1 ? raw * 100 : raw,
    };
  });

  const total = normalized.reduce((sum, axis) => sum + axis.weight, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(
      `Assessment axis weights must total 100 percentage points; got ${total}`,
    );
  }

  return normalized;
}

function validateInterpretationCoverage(
  runtime: Runtime,
  binding: InterpretationBinding,
) {
  const runtimeVersion = String(
    runtime.assessment.version ?? binding.interpretationVersion,
  );
  const registryEntries = (
    binding.registry.entries as Array<Record<string, unknown>>
  )
    .filter((entry) => entry.assessmentSlug === runtime.family.slug)
    .filter(
      (entry) =>
        Number(entry.interpretationVersion) === binding.interpretationVersion &&
        String(
          entry.assessmentVersion ?? String(binding.interpretationVersion),
        ) === runtimeVersion,
    );

  const axisCodeById = new Map(runtime.axes.map((axis) => [axis.id, axis.code]));
  const optionKeys = new Set<string>();

  for (const question of runtime.questions) {
    const options = runtime.options.filter(
      (option) => option.question_id === question.id,
    );
    if (!options.length) {
      throw new Error(`Question has no options: ${question.code}`);
    }

    for (const option of options) {
      optionKeys.add(`${question.code}|${Number(option.option_index)}`);
    }
  }

  const registryKeys = new Set(
    registryEntries.map(
      (entry) => `${String(entry.questionCode)}|${Number(entry.optionIndex)}`,
    ),
  );

  if (registryKeys.size !== registryEntries.length) {
    throw new Error("Duplicate interpretation registry entry");
  }

  const missing = [...optionKeys].filter((key) => !registryKeys.has(key));
  const extra = [...registryKeys].filter((key) => !optionKeys.has(key));
  if (missing.length || extra.length) {
    throw new Error(
      `Interpretation coverage mismatch: missing=${missing.length}, extra=${extra.length}`,
    );
  }

  const optionMap = new Map(
    runtime.options.map((option) => [option.id, option]),
  );

  for (const entry of registryEntries) {
    const question = runtime.questions.find(
      (candidate) => candidate.code === String(entry.questionCode),
    );
    const option = optionMap.get(String(entry.optionId));

    if (!question || !option || option.question_id !== question.id) {
      throw new Error(
        `Interpretation option identity mismatch: ${String(entry.questionCode)}[${String(entry.optionIndex)}]`,
      );
    }

    if (
      Number(option.option_index) !== Number(entry.optionIndex) ||
      Number(option.option_value) !== Number(entry.sourceOptionValue) ||
      String(axisCodeById.get(question.axis_id)) !== String(entry.axisCode)
    ) {
      throw new Error(
        `Interpretation scoring identity mismatch: ${String(entry.questionCode)}[${String(entry.optionIndex)}]`,
      );
    }
  }
}

function validateRoleKpiEconomicConfiguration(
  runtime: Runtime,
  canonicalAxes: Array<{ code: string; weight: number }>,
) {
  const axisRoles = runtime.assessment.axis_roles ?? {};

  for (const axis of canonicalAxes) {
    if (!String(axisRoles[axis.code] ?? "").trim()) {
      throw new Error(`Missing role mapping for axis ${axis.code}`);
    }
  }

  const allowedKpis = new Set([
    "TFI",
    "TAP",
    "PRP",
    "PLI",
    "PSI",
    "NPI",
    "EVI",
    "TCI",
    "RRI",
  ]);

  for (const [kpiCode, mapping] of Object.entries(
    runtime.assessment.kpi_mappings ?? {},
  )) {
    if (!allowedKpis.has(kpiCode)) {
      throw new Error(`Unknown KPI mapping: ${kpiCode}`);
    }
    if (
      kpiCode === "RRI" &&
      runtime.family.slug !== "admin-reception-assessment"
    ) {
      throw new Error("RRI is only supported for Admin & Reception");
    }

    const entries = Object.entries(mapping ?? {});
    if (!entries.length) {
      throw new Error(`KPI mapping is empty: ${kpiCode}`);
    }

    const weightSum = entries.reduce((sum, [role, weight]) => {
      if (!String(role).trim()) {
        throw new Error(`Invalid KPI role: ${kpiCode}`);
      }
      const value = Number(weight);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid KPI weight: ${kpiCode}`);
      }
      return sum + value;
    }, 0);

    if (Math.abs(weightSum - 1) > 0.001) {
      throw new Error(`KPI weights must total 1: ${kpiCode}`);
    }
  }

  const evMapping = runtime.assessment.ev_mappings ?? {};
  const evEntries = Object.entries(evMapping);

  if (runtime.assessment.has_ev_simulator && !evEntries.length) {
    throw new Error("EV simulator is enabled without EV mappings");
  }

  if (evEntries.length) {
    const evTotal = evEntries.reduce((sum, [role, weight]) => {
      if (!String(role).trim()) {
        throw new Error("Invalid EV mapping role");
      }
      const value = Number(weight);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error("Invalid EV mapping weight");
      }
      return sum + value;
    }, 0);

    if (Math.abs(evTotal - 1) > 0.001) {
      throw new Error("EV mapping weights must total 1");
    }
  }

  // KPI roles may be absent from a family and must then report partial/unavailable.
}

function validateConsistencyDependencies(
  runtime: Runtime,
  configuration: ReturnType<typeof scopedConsistencyConfiguration>,
) {
  const questionCodes = new Set(runtime.questions.map((question) => question.code));
  const seenPairs = new Set<string>();
  const rules = configuration.rules as Array<Record<string, unknown>>;
  const ruleTypes = new Set(
    rules.map((rule) => String(rule.relationshipType ?? "")).filter(Boolean),
  );

  for (const pair of configuration.pairs) {
    if (
      !questionCodes.has(pair.validatorQuestionCode) ||
      !questionCodes.has(pair.targetQuestionCode)
    ) {
      throw new Error(
        `Consistency pair references an unknown question: ${pair.validatorQuestionCode}|${pair.targetQuestionCode}`,
      );
    }
    if (!ruleTypes.has(pair.relationshipType)) {
      throw new Error(
        `Consistency pair has no matching rule: ${pair.relationshipType}`,
      );
    }
    const key = [
      pair.relationshipType,
      pair.validatorQuestionCode,
      pair.targetQuestionCode,
    ].join("|");

    if (seenPairs.has(key)) {
      throw new Error(`Duplicate consistency pair: ${key}`);
    }
    seenPairs.add(key);
  }
}

function scopedConsistencyConfiguration(
  assessmentSlug: string,
  assessmentVersion: number,
) {
  const version = String(assessmentVersion);
  const rules = consistencyRuleRegistry.rules as Array<Record<string, unknown>>;
  const pairs = (consistencyPairRegistry.pairs as RuntimeConsistencyPair[]).filter(
    (pair) =>
      pair.assessmentSlug === assessmentSlug &&
      pair.assessmentVersion === version,
  );

  return {
    rules,
    pairs,
  };
}

function bandFor(score: number | null): string | null {
  if (!Number.isFinite(score)) return null;
  const value = Number(score);
  if (value >= 75) return "Q4";
  if (value >= 50) return "Q3";
  if (value >= 25) return "Q2";
  return "Q1";
}

function axisPersistenceRows(
  selections: P3ResolvedSelection[],
  axes: AxisRow[],
): Array<Record<string, unknown>> {
  const byAxis = new Map<string, P3ResolvedSelection[]>();

  for (const item of selections) {
    if (!item.axisCode) continue;
    const bucket = byAxis.get(item.axisCode) ?? [];
    bucket.push(item);
    byAxis.set(item.axisCode, bucket);
  }

  return axes.flatMap((axis) => {
    const items = byAxis.get(axis.code) ?? [];
    const eligible = items.filter(
      (item) =>
        item.answered &&
        item.scoreEligible &&
        item.scoreMode === "DIRECT_ANCHOR" &&
        Number.isFinite(item.anchorScore) &&
        Number.isFinite(item.anchorMax) &&
        Number(item.anchorMax) > 0,
    );

    if (!eligible.length) return [];

    const rawScore = eligible.reduce(
      (sum, item) => sum + Number(item.anchorScore),
      0,
    );
    const maxPossible = eligible.reduce(
      (sum, item) => sum + Number(item.anchorMax),
      0,
    );
    const percentage =
      eligible.reduce(
        (sum, item) =>
          sum + (Number(item.anchorScore) / Number(item.anchorMax)) * 100,
        0,
      ) / eligible.length;
    const weight = axis.weight > 1 ? axis.weight / 100 : axis.weight;

    return [
      {
        axis_id: axis.code,
        axis_name_ar: axis.title_ar || axis.title,
        axis_name_en: axis.title,
        raw_score: Math.round(rawScore),
        max_possible: Math.round(maxPossible),
        percentage,
        weight,
        weighted_score: percentage * weight,
        grade: bandFor(percentage),
      },
    ];
  });
}

async function loadRuntime(
  client: SupabaseClient,
  assessmentTypeId: string,
): Promise<Runtime> {
  const [{ data: assessment, error: assessmentError }, { data: axes, error: axesError }, { data: questions, error: questionsError }] =
    await Promise.all([
      client
        .from("assessment_types")
        .select(
          "id, slug, family_id, title_ar, title_en, description, version, config_version, question_count, axis_count, has_traps, has_ev_simulator, axis_roles, kpi_mappings, ev_mappings",
        )
        .eq("id", assessmentTypeId)
        .maybeSingle(),
      client
        .from("axes")
        .select("id, code, title, title_ar, weight, display_order")
        .eq("assessment_type_id", assessmentTypeId)
        .order("display_order", { ascending: true }),
      client
        .from("questions")
        .select(
          "id, code, axis_id, question_text, question_text_ar, question_type, display_order, is_required, impact, layer",
        )
        .eq("assessment_type_id", assessmentTypeId)
        .order("display_order", { ascending: true }),
    ]);

  if (assessmentError || axesError || questionsError) {
    throw assessmentError || axesError || questionsError;
  }
  if (!assessment) throw new Error("Assessment not found");

  const { data: family, error: familyError } = await client
    .from("assessment_families")
    .select("id, slug")
    .eq("id", assessment.family_id)
    .maybeSingle();
  if (familyError) throw familyError;
  if (!family) throw new Error("Assessment family not found");

  const questionIds = (questions || []).map((question) => question.id);
  const { data: options, error: optionsError } = questionIds.length
    ? await client
        .from("options")
        .select("id, question_id, option_index, option_value")
        .in("question_id", questionIds)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (optionsError) throw optionsError;

  return {
    assessment: assessment as AssessmentRow,
    family,
    axes: (axes || []) as AxisRow[],
    questions: (questions || []) as QuestionRow[],
    options: (options || []) as OptionRow[],
  };
}

function buildSelections(
  runtime: Runtime,
  answers: StoredAnswer[],
): Array<{
  questionCode: string;
  optionId: string;
  optionIndex: number;
}> {
  const questionMap = new Map(runtime.questions.map((question) => [question.code, question]));
  const selections = [];

  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (!question) throw new Error("Answer integrity check failed");

    const option = runtime.options.find(
      (candidate) =>
        candidate.question_id === question.id &&
        Number(candidate.option_index) === Number(answer.option_index),
    );

    if (
      !option ||
      answer.option_value === null ||
      Number(answer.option_value) !== Number(option.option_value)
    ) {
      throw new Error("Answer integrity check failed");
    }

    selections.push({
      questionCode: question.code,
      optionId: option.id,
      optionIndex: Number(option.option_index),
    });
  }

  return selections;
}

export async function calculateAssessment(
  client: SupabaseClient,
  input: {
    sessionId: string;
    economicInput?: P3EconomicInput;
    answerSnapshot?: StoredAnswer[];
  },
): Promise<AssessmentComputation> {
  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select(
      "id, lead_id, assessment_type_id, assessment_user_id, assessment_version, status",
    )
    .eq("id", input.sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) throw new Error("Assessment session not found");
  if (session.status !== "in_progress" && session.status !== "completed") {
    throw new Error("Assessment session is not completable");
  }

  const runtime = await loadRuntime(client, session.assessment_type_id);
  const assessmentVersion = Number(
    runtime.assessment.version ??
      runtime.assessment.config_version ??
      1,
  );

  if (Number(session.assessment_version ?? 1) !== assessmentVersion) {
    throw new Error(
      "Assessment version changed; this session must be completed with its pinned version",
    );
  }

  let answerRows: StoredAnswer[];
  if (input.answerSnapshot !== undefined) {
    answerRows = input.answerSnapshot;
  } else {
    const { data: dbAnswers, error: answersError } = await client
      .from("answers")
      .select("question_id, option_index, option_value")
      .eq("session_id", session.id);

    if (answersError) throw answersError;
    answerRows = (dbAnswers || []) as StoredAnswer[];
  }

  const requiredQuestionCodes = runtime.questions
    .filter((question) => question.is_required !== false)
    .map((question) => question.code);
  const questionCodeById = new Map(
    runtime.questions.map((question) => [question.id, question.code]),
  );
  const answerQuestionCodes = new Set(
    answerRows
      .map((answer) => questionCodeById.get(answer.question_id))
      .filter((code): code is string => Boolean(code)),
  );
  const missing = requiredQuestionCodes.filter(
    (questionCode) => !answerQuestionCodes.has(questionCode),
  );
  if (missing.length) {
    throw new Error(
      "Assessment incomplete",
    );
  }

  const selections = buildSelections(runtime, answerRows);

  const interpretationBinding = resolveInterpretationBinding(
    runtime.family.slug,
    assessmentVersion,
  );
  const interpretationRegistry = interpretationBinding.registry;
  const canonicalAxes = canonicalAxisConfigurations(runtime.axes);
  validateInterpretationCoverage(runtime, interpretationBinding);
  validateRoleKpiEconomicConfiguration(runtime, canonicalAxes);

  const versionedConfig = {
    assessment: {
      id: runtime.assessment.id,
      familyId: runtime.family.id,
      slug: runtime.family.slug,
      version: assessmentVersion,
      configVersion: runtime.assessment.config_version ?? null,
      questionCount: runtime.questions.length,
      axisCount: runtime.axes.length,
      axisRoles: runtime.assessment.axis_roles ?? {},
      kpiMappings: runtime.assessment.kpi_mappings ?? {},
    },
    axes: runtime.axes
      .map((axis) => ({
        id: axis.id,
        code: axis.code,
        weight: canonicalAxes.find((item) => item.code === axis.code)!.weight,
        title: axis.title,
        titleAr: axis.title_ar,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    questions: runtime.questions
      .map((question) => ({
        id: question.id,
        code: question.code,
        axisId: question.axis_id,
        layer: question.layer ?? null,
        impact: question.impact ?? null,
        required: question.is_required !== false,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    options: runtime.options
      .map((option) => ({
        id: option.id,
        questionId: option.question_id,
        optionIndex: Number(option.option_index),
        optionValue: Number(option.option_value),
      }))
      .sort(
        (a, b) =>
          a.questionId.localeCompare(b.questionId) ||
          a.optionIndex - b.optionIndex,
      ),
    interpretation: {
      schemaVersion: interpretationRegistry.schemaVersion,
      interpretationVersion: interpretationBinding.interpretationVersion,
      entries: (interpretationRegistry.entries as Array<Record<string, unknown>>)
        .filter((entry) => entry.assessmentSlug === runtime.family.slug)
        .filter((entry) => String(entry.assessmentVersion ?? String(assessmentVersion)) === String(assessmentVersion))
        .sort(
          (a, b) =>
            String(a.questionCode).localeCompare(String(b.questionCode)) ||
            Number(a.optionIndex) - Number(b.optionIndex),
        )
        .map((entry) => ({ ...entry })),
    },
    consistency: {
      schemaVersion: consistencyRuleRegistry.schemaVersion,
      ruleRegistryVersion: consistencyRuleRegistry.schemaVersion,
      rules: (consistencyRuleRegistry.rules as Array<Record<string, unknown>>).map((rule) => ({ ...rule })),
      pairRegistryVersion: consistencyPairRegistry.schemaVersion,
      pairs: (consistencyPairRegistry.pairs as RuntimeConsistencyPair[])
        .filter(
          (pair) =>
            pair.assessmentSlug === runtime.family.slug &&
            pair.assessmentVersion === String(assessmentVersion),
        )
        .map((pair) => ({ ...pair })),
    },
  };

  const consistencyConfiguration = scopedConsistencyConfiguration(
    runtime.family.slug,
    assessmentVersion,
  );
  validateConsistencyDependencies(runtime, consistencyConfiguration);

  const assessmentConfigDigest = await sha256Hex(stable(versionedConfig));
  const resultId = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();

  const result = scoreP3IntegratedV1({
    sessionId: session.id,
    assessmentFamilyId: runtime.family.id,
    assessmentTypeId: runtime.assessment.id,
    assessmentVersion: String(assessmentVersion),
    resultId,
    calculatedAt,
    scoringContractVersion: SCORING_CONTRACT_ID,
    assessmentConfigDigest,
    assessmentSlug: runtime.family.slug,
    interpretationVersion: interpretationBinding.interpretationVersion,
    selections,
    axes: runtime.axes.map((axis) => ({
      code: axis.code,
      weight: canonicalAxes.find((item) => item.code === axis.code)!.weight,
    })),
    axisRoles: runtime.assessment.axis_roles ?? {},
    kpiMappings: runtime.assessment.kpi_mappings ?? {},
    consistencyRules: consistencyConfiguration.rules as P3ConsistencyRule[],
    consistencyPairs: consistencyConfiguration.pairs.map((pair) => ({
      relationshipType: pair.relationshipType,
      validatorQuestionCode: pair.validatorQuestionCode,
      targetQuestionCode: pair.targetQuestionCode,
      scoreEffectOverride: pair.scoreEffectOverride,
    })),
    economicInput: input.economicInput,
    resultStatus: "PRODUCTION",
    engineIdentity: ENGINE_IDENTITY,
  });

  const scoreRows = axisPersistenceRows(
    result.resolvedSelections,
    runtime.axes,
  );

  return {
    result,
    scoreRows,
    provenance: {
      assessmentVersion,
      interpretationVersion: interpretationBinding.interpretationVersion,
      scoringEngineVersion: ENGINE_IDENTITY,
      scoringContractVersion: SCORING_CONTRACT_ID,
      assessmentConfigDigest,
    },
  };
}

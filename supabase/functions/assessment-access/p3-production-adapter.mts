/** P3 production adapter — server-authoritative runtime. */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  scoreP3IntegratedV1,
  type P3EconomicInput,
  type P3IntegratedResult,
} from "./p3-integrated-scorer-v1.mts";
import { type P3ResolvedSelection } from "./p3-scorer-v1.mts";
import registry from "./p3-response-interpretation-registry-v1.json" with { type: "json" };

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

export type P3ProductionComputation = {
  result: P3IntegratedResult;
  scoreRows: Array<Record<string, unknown>>;
  legacyProjection: {
    overallScore: number | null;
    classification: string | null;
    axisScores: Record<string, number>;
    kpis: Record<string, number>;
    traps: unknown[];
  };
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

export async function calculateP3Production(
  client: SupabaseClient,
  input: {
    sessionId: string;
    economicInput?: P3EconomicInput;
  },
): Promise<P3ProductionComputation> {
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

  const { data: dbAnswers, error: answersError } = await client
    .from("answers")
    .select("question_id, option_index, option_value")
    .eq("session_id", session.id);

  if (answersError) throw answersError;

  const required = runtime.questions
    .filter((question) => question.is_required !== false)
    .map((question) => question.code);
  const answerCodes = new Set(
    (dbAnswers || []).map((answer) => answer.question_id),
  );
  const missing = required.filter((code) => !answerCodes.has(code));
  if (missing.length) {
    throw new Error(
      "Assessment incomplete",
    );
  }

  const selections = buildSelections(
    runtime,
    (dbAnswers || []) as StoredAnswer[],
  );

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
        weight: Number(axis.weight),
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
      schemaVersion: registry.schemaVersion,
      entries: (registry.entries as Array<Record<string, unknown>>)
        .filter((entry) => entry.assessmentSlug === runtime.family.slug)
        .sort(
          (a, b) =>
            String(a.questionCode).localeCompare(String(b.questionCode)) ||
            Number(a.optionIndex) - Number(b.optionIndex),
        )
        .map((entry) => ({ ...entry })),
    },
  };

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
    scoringContractVersion: "P3_AGGREGATION_V1",
    assessmentConfigDigest,
    assessmentSlug: runtime.family.slug,
    selections,
    axes: runtime.axes.map((axis) => ({
      code: axis.code,
      weight: Number(axis.weight),
    })),
    axisRoles: runtime.assessment.axis_roles ?? {},
    kpiMappings: runtime.assessment.kpi_mappings ?? {},
    consistencyRules: [],
    consistencyPairs: [],
    economicInput: input.economicInput,
    resultStatus: "PRODUCTION",
    engineIdentity: "P3_INTEGRATED_SCORER_V1",
  });

  const scoreRows = axisPersistenceRows(
    result.resolvedSelections,
    runtime.axes,
  );

  const axisScores: Record<string, number> = {};
  for (const row of scoreRows) {
    const axisCode = String(row.axis_id);
    const percentage = Number(row.percentage);
    if (Number.isFinite(percentage)) axisScores[axisCode] = percentage;
  }

  const kpis: Record<string, number> = {};
  for (const kpi of result.kpis) {
    if (
      kpi.status !== "unavailable" &&
      Number.isFinite(kpi.value)
    ) {
      kpis[kpi.kpiCode] = Number(kpi.value);
    }
  }

  return {
    result,
    scoreRows,
    legacyProjection: {
      overallScore: result.scores.overallScore,
      classification: result.classification.bandCode,
      axisScores,
      kpis,
      traps: [],
    },
    provenance: {
      assessmentVersion,
      interpretationVersion: Number(result.provenance.interpretationVersion),
      scoringEngineVersion: "P3_SCORER_V1",
      scoringContractVersion: "P3_AGGREGATION_V1",
      assessmentConfigDigest,
    },
  };
}

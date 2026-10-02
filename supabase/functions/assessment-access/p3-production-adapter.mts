/** P3 production adapter — server-authoritative runtime. */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { scoreP3IntegratedV1, type P3EconomicInput } from "./p3-integrated-scorer-v1.mts";
import registry from "./p3-response-interpretation-registry-v1.json" with { type: "json" };

type Runtime = {
  assessment: any;
  family: any;
  axes: any[];
  questions: any[];
  options: any[];
};

export type P3ProductionComputation = {
  result: any;
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
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stable(record[key])).join(",") + "}";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bandFor(score: number | null): string | null {
  if (!Number.isFinite(score)) return null;
  const value = Number(score);
  if (value >= 75) return "Q4";
  if (value >= 50) return "Q3";
  if (value >= 25) return "Q2";
  return "Q1";
}

function axisRows(
  selections: Array<{ questionCode: string; answered: boolean; scoreEligible: boolean; scoreMode: string; anchorScore?: number | null; anchorMax?: number | null; }>,
  axes: Array<{ code: string; weight: number; title_ar?: string; title?: string }>,
) {
  const byAxis = new Map<string, typeof selections>();
  for (const item of selections) {
    const entry = byAxis.get((item as any).axisCode ?? "") ?? [];
    entry.push(item);
    byAxis.set((item as any).axisCode ?? "", entry);
  }
  return axes.flatMap((axis) => {
    const items = byAxis.get(axis.code) ?? [];
    const eligible = items.filter((item) =>
      item.answered &&
      item.scoreEligible &&
      item.scoreMode === "DIRECT_ANCHOR" &&
      Number.isFinite(item.anchorScore) &&
      Number.isFinite(item.anchorMax) &&
      Number(item.anchorMax) > 0
    );
    if (!eligible.length) return [];
    const rawScore = eligible.reduce((sum, item) => sum + Number(item.anchorScore), 0);
    const maxPossible = eligible.reduce((sum, item) => sum + Number(item.anchorMax), 0);
    const percentage = eligible.reduce((sum, item) => sum + (Number(item.anchorScore) / Number(item.anchorMax)) * 100, 0) / eligible.length;
    const weight = axis.weight > 1 ? axis.weight / 100 : axis.weight;
    return [{
      axis_id: axis.code,
      axis_name_ar: axis.title_ar || axis.title || axis.code,
      axis_name_en: axis.title || axis.code,
      raw_score: Math.round(rawScore),
      max_possible: Math.round(maxPossible),
      percentage,
      weight,
      weighted_score: percentage * weight,
      grade: bandFor(percentage),
    }];
  });
}

async function loadRuntime(client: SupabaseClient, assessmentTypeId: string): Promise<Runtime> {
  const [{ data: assessment, error: assessmentError }, { data: axes, error: axesError }, { data: questions, error: questionsError }, { data: family, error: familyError }] = await Promise.all([
    client.from("assessment_types").select("id, slug, family_id, title_ar, title_en, description, version, config_version, question_count, axis_count, has_traps, has_ev_simulator, axis_roles, kpi_mappings, ev_mappings").eq("id", assessmentTypeId).maybeSingle(),
    client.from("axes").select("id, code, title, title_ar, weight, display_order").eq("assessment_type_id", assessmentTypeId).order("display_order", { ascending: true }),
    client.from("questions").select("id, code, axis_id, question_text, question_text_ar, question_type, display_order, is_required, impact, layer").eq("assessment_type_id", assessmentTypeId).order("display_order", { ascending: true }),
    client.from("assessment_families").select("id, slug").eq("id", client.from("assessment_types").select("family_id").eq("id", assessmentTypeId)),
  ]);
  if (assessmentError || axesError || questionsError) throw assessmentError || axesError || questionsError;
  if (!assessment) throw new Error("Assessment not found");

  let resolvedFamily = family;
  if (!resolvedFamily || Array.isArray(resolvedFamily)) {
    const { data, error } = await client.from("assessment_families").select("id, slug").eq("id", assessment.family_id).maybeSingle();
    if (error) throw error;
    resolvedFamily = data;
  }
  if (!resolvedFamily) throw new Error("Assessment family not found");

  const questionIds = (questions || []).map((q) => q.id);
  const { data: options, error: optionsError } = questionIds.length
    ? await client.from("options").select("id, question_id, option_index, option_value").in("question_id", questionIds).order("display_order", { ascending: true })
    : { data: [], error: null };
  if (optionsError) throw optionsError;

  return { assessment, family: resolvedFamily, axes: axes || [], questions: questions || [], options: options || [] };
}

function buildSelections(runtime: Runtime, answers: Array<{ question_id: string; option_index: number; option_value: number | null }>) {
  const questionMap = new Map(runtime.questions.map((q) => [q.code, q]));
  const selections = [];
  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (!question) throw new Error("Answer integrity check failed");
    const option = runtime.options.find((o) => o.question_id === question.id && Number(o.option_index) === Number(answer.option_index));
    if (!option || Number(answer.option_value) !== Number(option.option_value)) throw new Error("Answer integrity check failed");
    selections.push({ questionCode: question.code, optionId: option.id, optionIndex: Number(option.option_index) });
  }
  return selections;
}

export async function calculateP3Production(
  client: SupabaseClient,
  input: {
    sessionId: string;
    assessmentUserId?: string | null;
    economicInput?: P3EconomicInput;
  },
): Promise<P3ProductionComputation> {
  const { data: session, error: sessionError } = await client
    .from("sessions")
    .select("id, lead_id, assessment_type_id, assessment_user_id, assessment_version, status")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new Error("Assessment session not found");

  const runtime = await loadRuntime(client, session.assessment_type_id);
  const assessmentVersion = Number(runtime.assessment.version ?? runtime.assessment.config_version ?? 1);
  if (Number(session.assessment_version ?? 1) !== assessmentVersion) throw new Error("Assessment version changed; this session must be completed with its pinned version");

  const { data: dbAnswers, error: answersError } = await client
    .from("answers")
    .select("question_id, option_index, option_value")
    .eq("session_id", session.id);
  if (answersError) throw answersError;

  const required = runtime.questions.filter((q) => q.is_required !== false).map((q) => q.code);
  const answerCodes = new Set((dbAnswers || []).map((a) => a.question_id));
  const missing = required.filter((code) => !answerCodes.has(code));
  if (missing.length) throw new Error("Assessment incomplete");

  const selections = buildSelections(runtime, dbAnswers || []);
  const versionedConfig = {
    assessment: {
      id: runtime.assessment.id,
      slug: runtime.family.slug,
      version: assessmentVersion,
      configVersion: runtime.assessment.config_version ?? null,
      questionCount: runtime.questions.length,
      axisCount: runtime.axes.length,
      axisRoles: runtime.assessment.axis_roles ?? {},
      kpiMappings: runtime.assessment.kpi_mappings ?? {},
    },
    axes: runtime.axes.map((a) => ({ id: a.id, code: a.code, weight: Number(a.weight), title: a.title, titleAr: a.title_ar })),
    questions: runtime.questions.map((q) => ({ id: q.id, code: q.code, axisId: q.axis_id, layer: q.layer ?? null, impact: q.impact ?? null, required: q.is_required !== false })).sort((a, b) => a.code.localeCompare(b.code)),
    options: runtime.options.map((o) => ({ id: o.id, questionId: o.question_id, optionIndex: Number(o.option_index), optionValue: Number(o.option_value) })).sort((a, b) => a.questionId.localeCompare(b.questionId) || a.optionIndex - b.optionIndex),
    interpretation: {
      schemaVersion: registry.schemaVersion,
      entries: (registry.entries as any[]).filter((e) => e.assessmentSlug === runtime.family.slug).sort((a, b) => a.questionCode.localeCompare(b.questionCode) || a.optionIndex - b.optionIndex).map((e) => ({ ...e })),
    },
  };
  const assessmentConfigDigest = await sha256Hex(stable(versionedConfig));

  const result = scoreP3IntegratedV1({
    sessionId: session.id,
    assessmentFamilyId: runtime.family.id,
    assessmentTypeId: runtime.assessment.id,
    assessmentVersion: String(assessmentVersion),
    resultId: crypto.randomUUID(),
    calculatedAt: new Date().toISOString(),
    scoringContractVersion: "P3_AGGREGATION_V1",
    assessmentConfigDigest,
    assessmentSlug: runtime.family.slug,
    selections,
    axes: runtime.axes.map((a) => ({ code: a.code, weight: Number(a.weight) })),
    axisRoles: runtime.assessment.axis_roles ?? {},
    kpiMappings: runtime.assessment.kpi_mappings ?? {},
    consistencyRules: [],
    consistencyPairs: [],
    economicInput: input.economicInput,
    resultStatus: "PRODUCTION",
    engineIdentity: "P3_INTEGRATED_SCORER_V1",
  });

  const axisRowsForDb = axisRows((result as any).resolvedSelections, runtime.axes);
  const axisScores: Record<string, number> = {};
  for (const row of axisRowsForDb) axisScores[String(row.axis_id)] = Number(row.percentage);

  const kpis: Record<string, number> = {};
  for (const kpi of result.kpis || []) {
    if ((kpi as any).status !== "unavailable" && Number.isFinite((kpi as any).value)) kpis[String((kpi as any).kpiCode)] = Number((kpi as any).value);
  }

  return {
    result,
    scoreRows: axisRowsForDb,
    legacyProjection: {
      overallScore: result.scores.overallScore,
      classification: (result as any).classification?.bandCode ?? bandFor(result.scores.overallScore),
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

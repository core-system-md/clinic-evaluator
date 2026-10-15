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
} from "./assessment-calculation-pipeline.mts";
import { projectScoreRowsFromStructuredResult } from "./result-persistence-projection.mts";
import { type P3ConsistencyRule } from "./consistency-engine.mts";
import registry from "./response-interpretation-registry-v1.json" with { type: "json" };
import registryV2 from "./response-interpretation-registry-v2.json" with { type: "json" };
import patientJourneyRegistryV2 from "./patient-journey-interpretation-registry-v2.json" with { type: "json" };
import consistencyRuleRegistry from "./consistency-rule-registry-v2.json" with { type: "json" };
import consistencyPairRegistry from "./consistency-pair-registry-v1.json" with { type: "json" };
import { assertPinnedAssessmentRelease, buildAssessmentConfigProjection, canonicalizeAssessmentConfig, CONFIG_CANONICALIZER_VERSION, sha256Hex } from "./assessment-config-digest.mjs";
import { C03_RUNTIME_ATTESTATION } from "../assessment-config-release/runtime-attestation.ts";

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
  description: string | null;
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
  trap_for: string | null;
};

type OptionRow = {
  id: string;
  question_id: string;
  option_index: number;
  option_value: number;
  label: string | null;
  label_ar: string | null;
  is_trap: boolean | null;
  display_order: number;
};

type TrapRow = {
  name: string;
  message: string | null;
  message_ar: string | null;
  question_id: string;
  validates: string | null;
  target_axis: string | null;
  penalty_base: number | null;
  penalty_max: number | null;
};

type Runtime = {
  assessment: AssessmentRow;
  family: { id: string; slug: string };
  axes: AxisRow[];
  questions: QuestionRow[];
  options: OptionRow[];
  traps: TrapRow[];
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
    assessmentSlug: string;
    assessmentVersion: number;
    interpretationVersion: number;
    scoringEngineVersion: string;
    scoringContractVersion: string;
    assessmentConfigDigest: string;
  };
};

const ENGINE_IDENTITY = "MD_CODE_ASSESSMENT_ENGINE";
const SCORING_CONTRACT_ID = "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07";

type InterpretationBinding = {
  registry: typeof registry | typeof registryV2 | typeof patientJourneyRegistryV2;
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
    // Final corrected content is published as product V1; its scoring semantics use interpretation registry V2.
    registry: registryV2,
    interpretationVersion: 2,
  },
  "medical-team-assessment:1": {
    registry,
    interpretationVersion: 1,
  },
  "patient-journey:1": {
    // Current published product V1 uses the family-specific interpretation V2 registry.
    registry: patientJourneyRegistryV2,
    interpretationVersion: 2,
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

async function loadRuntime(
  client: SupabaseClient,
  assessmentTypeId: string,
): Promise<Runtime> {
  const [
    { data: assessment, error: assessmentError },
    { data: axes, error: axesError },
    { data: questions, error: questionsError },
    { data: traps, error: trapsError },
  ] = await Promise.all([
    client
      .from("assessment_types")
      .select(
        "id, slug, family_id, title_ar, title_en, description, version, config_version, question_count, axis_count, has_traps, has_ev_simulator, axis_roles, kpi_mappings, ev_mappings",
      )
      .eq("id", assessmentTypeId)
      .maybeSingle(),
    client
      .from("axes")
      .select("id, code, title, title_ar, description, weight, display_order")
      .eq("assessment_type_id", assessmentTypeId)
      .order("display_order", { ascending: true }),
    client
      .from("questions")
      .select(
        "id, code, axis_id, question_text, question_text_ar, question_type, display_order, is_required, impact, layer, trap_for",
      )
      .eq("assessment_type_id", assessmentTypeId)
      .order("display_order", { ascending: true }),
    client
      .from("traps")
      .select("name, message, message_ar, question_id, validates, target_axis, penalty_base, penalty_max")
      .eq("assessment_type_id", assessmentTypeId),
  ]);

  if (assessmentError || axesError || questionsError || trapsError) {
    throw assessmentError || axesError || questionsError || trapsError;
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
        .select("id, question_id, option_index, option_value, label, label_ar, is_trap, display_order")
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
    traps: (traps || []) as TrapRow[],
  };
}

export async function computeAssessmentConfigReleaseEvidence(
  client: SupabaseClient,
  assessmentTypeId: string,
) {
  const runtime = await loadRuntime(client, assessmentTypeId);
  const assessmentVersion = Number(
    runtime.assessment.version ?? runtime.assessment.config_version ?? 1,
  );
  const binding = resolveInterpretationBinding(runtime.family.slug, assessmentVersion);
  const projection = buildAssessmentConfigProjection({
    runtime,
    assessmentVersion,
    interpretationRegistry: binding.registry,
    interpretationVersion: binding.interpretationVersion,
    consistencyRuleRegistry,
    consistencyPairRegistry,
  });
  return {
    familyId: runtime.family.id,
    familySlug: runtime.family.slug,
    assessmentTypeId: runtime.assessment.id,
    assessmentVersion,
    interpretationVersion: binding.interpretationVersion,
    configDigest: await sha256Hex(canonicalizeAssessmentConfig(projection)),
    interpretationRegistryDigest: await sha256Hex(canonicalizeAssessmentConfig(projection.interpretation)),
    scoringEngineVersion: ENGINE_IDENTITY,
    scoringContractVersion: SCORING_CONTRACT_ID,
    reportModelVersion: "REPORT_MODEL_V1",
    canonicalizerVersion: CONFIG_CANONICALIZER_VERSION,
    canonicalConfig: projection,
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
      "id, lead_id, assessment_type_id, assessment_user_id, assessment_version, assessment_release_id, status",
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
  const answerQuestionCodes = new Set(
    answerRows.map((answer) => answer.question_id),
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

  const versionedConfig = buildAssessmentConfigProjection({
    runtime,
    assessmentVersion,
    interpretationRegistry,
    interpretationVersion: interpretationBinding.interpretationVersion,
    consistencyRuleRegistry,
    consistencyPairRegistry,
  });

  const consistencyConfiguration = scopedConsistencyConfiguration(
    runtime.family.slug,
    assessmentVersion,
  );

  const assessmentConfigDigest = await sha256Hex(canonicalizeAssessmentConfig(versionedConfig));

  const { data: releaseSettings, error: releaseSettingsError } = await client
    .from("assessment_config_release_settings")
    .select("enabled")
    .eq("singleton", true)
    .maybeSingle();
  if (releaseSettingsError) throw releaseSettingsError;

  if (releaseSettings?.enabled === true) {
    if (!session.assessment_release_id) {
      assertPinnedAssessmentRelease({
        session,
        release: null,
        runtime,
        assessmentVersion,
        assessmentConfigDigest,
        runtimeRegistryDigest: "",
        interpretationVersion: interpretationBinding.interpretationVersion,
        engineIdentity: ENGINE_IDENTITY,
        scoringContractVersion: SCORING_CONTRACT_ID,
        canonicalizerVersion: CONFIG_CANONICALIZER_VERSION,
        runtimeMetadata: { gitCommitSha: "", edgeReleaseRef: "", fixtureSetVersion: "", migrationContractVersion: "" },
      });
    }

    const { data: release, error: releaseError } = await client
      .from("assessment_config_releases")
      .select("id, family_id, assessment_type_id, assessment_version, git_commit_sha, canonicalizer_version, config_digest, interpretation_version, interpretation_registry_digest, scoring_engine_version, scoring_contract_version, report_model_version, fixture_set_version, migration_contract_version, edge_release_ref, state, verified_config_digest, verified_registry_digest")
      .eq("id", session.assessment_release_id)
      .maybeSingle();
    if (releaseError) throw releaseError;

    const runtimeRegistryDigest = await sha256Hex(canonicalizeAssessmentConfig(versionedConfig.interpretation));
    assertPinnedAssessmentRelease({
      session,
      release,
      runtime,
      assessmentVersion,
      assessmentConfigDigest,
      runtimeRegistryDigest,
      interpretationVersion: interpretationBinding.interpretationVersion,
      engineIdentity: ENGINE_IDENTITY,
      scoringContractVersion: SCORING_CONTRACT_ID,
        canonicalizerVersion: CONFIG_CANONICALIZER_VERSION,
      runtimeMetadata: {
        gitCommitSha: C03_RUNTIME_ATTESTATION.gitCommitSha,
        edgeReleaseRef: C03_RUNTIME_ATTESTATION.edgeReleaseRef,
        fixtureSetVersion: C03_RUNTIME_ATTESTATION.fixtureSetVersion,
        migrationContractVersion: C03_RUNTIME_ATTESTATION.migrationContractVersion,
      },
    });
  }

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
      weight: Number(axis.weight),
      nameAr: axis.title_ar || axis.title,
      nameEn: axis.title,
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

  const { resolvedSelections: _resolvedSelections, axisPersistenceRows: _legacyAxisRows, ...structuredResult } = result;
  const scoreRows = projectScoreRowsFromStructuredResult(structuredResult);

  return {
    result,
    scoreRows,
    provenance: {
      assessmentSlug: runtime.family.slug,
      assessmentVersion,
      interpretationVersion: interpretationBinding.interpretationVersion,
      scoringEngineVersion: ENGINE_IDENTITY,
      scoringContractVersion: SCORING_CONTRACT_ID,
      assessmentConfigDigest,
    },
  };
}

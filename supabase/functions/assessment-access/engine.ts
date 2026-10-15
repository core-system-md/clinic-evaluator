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
import { assertInterpretationReleaseMatches, RUNTIME_EDGE_RELEASE_REF, selectInterpretationEntries } from "./interpretation-release-provenance.mjs";

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

function buildRuntimeOptionManifest(runtime: Runtime) {
  const questionCodeById = new Map(runtime.questions.map((question) => [question.id, question.code]));
  return runtime.options.map((option) => {
    const questionCode = questionCodeById.get(option.question_id);
    if (!questionCode) throw new Error("Runtime option references an unknown question");
    return {
      question_code: questionCode,
      option_id: option.id,
      option_index: Number(option.option_index),
      source_option_value: Number(option.option_value),
    };
  });
}


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
    interpretationRegistryDigest: string | null;
    interpretationSourceCommitSha: string | null;
    interpretationReleaseRef: string | null;
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

export async function attestInterpretationRelease(
  client: SupabaseClient,
  assessmentTypeId: string,
) {
  const runtime = await loadRuntime(client, assessmentTypeId);
  const assessmentVersion = Number(runtime.assessment.version ?? runtime.assessment.config_version ?? 1);
  const binding = resolveInterpretationBinding(runtime.family.slug, assessmentVersion);
  const registryEntries = selectInterpretationEntries(binding.registry, runtime.family.slug, binding.interpretationVersion);

  const { data: release, error: releaseError } = await client
    .from("assessment_interpretation_releases")
    .select("assessment_type_id, family_id, assessment_version, interpretation_version, registry_digest, config_digest, config_canonicalizer_version, source_commit_sha, edge_release_ref, option_manifest")
    .eq("assessment_type_id", runtime.assessment.id)
    .maybeSingle();
  if (releaseError) throw new Error("Interpretation release lookup failed: " + releaseError.message);
  if (!release) throw new Error("Interpretation release must be registered before runtime attestation");

  const { data: runtimeConfigDigest, error: configDigestError } = await client.rpc(
    "assessment_configuration_digest",
    { p_assessment_type_id: runtime.assessment.id },
  );
  if (configDigestError) throw new Error("Full assessment configuration digest lookup failed: " + configDigestError.message);

  const attestation = await assertInterpretationReleaseMatches({
    release,
    assessmentTypeId: runtime.assessment.id,
    familyId: runtime.family.id,
    assessmentVersion,
    interpretationVersion: binding.interpretationVersion,
    registryEntries,
    runtimeOptionManifest: buildRuntimeOptionManifest(runtime),
    runtimeConfigDigest: String(runtimeConfigDigest || ""),
    runtimeSourceCommitSha: Deno.env.get("C03_SOURCE_COMMIT_SHA") || null,
  });

  const { data: verification, error: verificationError } = await client.rpc(
    "mark_assessment_interpretation_release_runtime_verified_secure",
    {
      p_assessment_type_id: runtime.assessment.id,
      p_runtime_digest: attestation.registryDigest,
      p_runtime_config_digest: attestation.configDigest,
      p_runtime_edge_release_ref: RUNTIME_EDGE_RELEASE_REF,
      p_runtime_source_commit_sha: attestation.sourceCommitSha,
    },
  );
  if (verificationError) throw new Error("Runtime attestation could not be recorded: " + verificationError.message);

  return {
    assessmentTypeId: runtime.assessment.id,
    assessmentVersion,
    interpretationVersion: binding.interpretationVersion,
    ...attestation,
    verification,
  };
}

export async function assertAssessmentReleaseReady(
  client: SupabaseClient,
  assessmentTypeId: string,
) {
  const runtime = await loadRuntime(client, assessmentTypeId);
  const assessmentVersion = Number(runtime.assessment.version ?? runtime.assessment.config_version ?? 1);
  const binding = resolveInterpretationBinding(runtime.family.slug, assessmentVersion);
  const registryEntries = selectInterpretationEntries(binding.registry, runtime.family.slug, binding.interpretationVersion);

  const { data: release, error: releaseError } = await client
    .from("assessment_interpretation_releases")
    .select("assessment_type_id, family_id, assessment_version, interpretation_version, registry_digest, config_digest, config_canonicalizer_version, source_commit_sha, edge_release_ref, option_manifest, state, runtime_verified_at, runtime_verified_digest, runtime_verified_config_digest, runtime_verified_edge_release_ref, runtime_verified_source_commit_sha")
    .eq("assessment_type_id", runtime.assessment.id)
    .eq("is_current", true)
    .maybeSingle();
  if (releaseError) throw new Error("Interpretation release lookup failed: " + releaseError.message);
  if (!release) throw new Error("No current C-03 release is registered for this assessment version");
  if (release.state !== "PUBLISHED") throw new Error("Assessment release is not in PUBLISHED state");
  if (!release.runtime_verified_at) throw new Error("Assessment release has no runtime attestation");

  const { data: runtimeConfigDigest, error: configDigestError } = await client.rpc(
    "assessment_configuration_digest",
    { p_assessment_type_id: runtime.assessment.id },
  );
  if (configDigestError) throw new Error("Full assessment configuration digest lookup failed: " + configDigestError.message);

  const attestation = await assertInterpretationReleaseMatches({
    release,
    assessmentTypeId: runtime.assessment.id,
    familyId: runtime.family.id,
    assessmentVersion,
    interpretationVersion: binding.interpretationVersion,
    registryEntries,
    runtimeOptionManifest: buildRuntimeOptionManifest(runtime),
    runtimeConfigDigest: String(runtimeConfigDigest || ""),
    runtimeSourceCommitSha: Deno.env.get("C03_SOURCE_COMMIT_SHA") || null,
  });

  if (
    release.runtime_verified_digest !== attestation.registryDigest ||
    release.runtime_verified_config_digest !== attestation.configDigest ||
    release.runtime_verified_edge_release_ref !== attestation.edgeReleaseRef ||
    release.runtime_verified_source_commit_sha !== attestation.sourceCommitSha
  ) {
    throw new Error("Stored runtime attestation does not match the current Edge runtime and configuration");
  }
  return { ready: true, assessmentTypeId: runtime.assessment.id, configDigest: attestation.configDigest };
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

  const interpretationEntries = selectInterpretationEntries(
    interpretationRegistry,
    runtime.family.slug,
    interpretationBinding.interpretationVersion,
  );
  const { data: interpretationRelease, error: interpretationReleaseError } = await client
    .from("assessment_interpretation_releases")
    .select("assessment_type_id, family_id, assessment_version, interpretation_version, registry_digest, config_digest, config_canonicalizer_version, source_commit_sha, edge_release_ref, option_manifest")
    .eq("assessment_type_id", runtime.assessment.id)
    .maybeSingle();
  if (interpretationReleaseError) {
    throw new Error("Interpretation release lookup failed: " + interpretationReleaseError.message);
  }
  if (!interpretationRelease && Deno.env.get("C03_RELEASE_GATE_ENFORCED") === "true") {
    throw new Error("No verified C-03 interpretation/configuration release is registered for this assessment version");
  }

  let releaseProvenance: {
    registryDigest: string | null;
    configDigest: string | null;
    sourceCommitSha: string | null;
    edgeReleaseRef: string | null;
  } = {
    registryDigest: null,
    configDigest: null,
    sourceCommitSha: null,
    edgeReleaseRef: null,
  };
  if (interpretationRelease) {
    const { data: runtimeConfigDigest, error: configDigestError } = await client.rpc(
      "assessment_configuration_digest",
      { p_assessment_type_id: runtime.assessment.id },
    );
    if (configDigestError) {
      throw new Error("Full assessment configuration digest lookup failed: " + configDigestError.message);
    }
    releaseProvenance = await assertInterpretationReleaseMatches({
      release: interpretationRelease,
      assessmentTypeId: runtime.assessment.id,
      familyId: runtime.family.id,
      assessmentVersion,
      interpretationVersion: interpretationBinding.interpretationVersion,
      registryEntries: interpretationEntries,
      runtimeOptionManifest: buildRuntimeOptionManifest(runtime),
      runtimeConfigDigest: String(runtimeConfigDigest || ""),
      runtimeSourceCommitSha: Deno.env.get("C03_SOURCE_COMMIT_SHA") || null,
    });
  }

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
      schemaVersion: interpretationRegistry.schemaVersion,
      interpretationVersion: interpretationBinding.interpretationVersion,
      entries: (interpretationRegistry.entries as Array<Record<string, unknown>>)
        .filter((entry) => entry.assessmentSlug === runtime.family.slug)
        .filter((entry) => Number(entry.interpretationVersion) === interpretationBinding.interpretationVersion)
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

  const assessmentConfigDigest = releaseProvenance.configDigest || await sha256Hex(stable(versionedConfig));
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
      interpretationRegistryDigest: releaseProvenance.registryDigest,
      interpretationSourceCommitSha: releaseProvenance.sourceCommitSha,
      interpretationReleaseRef: releaseProvenance.edgeReleaseRef,
    },
  };
}

function normalizeJsonValue(value) {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return value.normalize("NFC");
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Configuration digest cannot contain non-finite numbers.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === undefined || typeof item === "function" || typeof item === "symbol") {
        throw new TypeError("Configuration digest cannot contain non-JSON array values.");
      }
      return normalizeJsonValue(item);
    });
  }
  if (typeof value === "object") {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item === undefined || typeof item === "function" || typeof item === "symbol") {
        throw new TypeError("Configuration digest cannot contain non-JSON object values.");
      }
      normalized[key.normalize("NFC")] = normalizeJsonValue(item);
    }
    return normalized;
  }
  throw new TypeError("Configuration digest contains a non-JSON value.");
}

export function canonicalizeAssessmentConfig(value) {
  return JSON.stringify(normalizeJsonValue(value));
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function buildAssessmentConfigProjection({
  runtime,
  assessmentVersion,
  interpretationRegistry,
  interpretationVersion,
  consistencyRuleRegistry,
  consistencyPairRegistry,
}) {
  const slug = runtime.family.slug;
  const version = String(assessmentVersion);
  const registryEntries = (interpretationRegistry.entries || [])
    .filter((entry) => entry.assessmentSlug === slug)
    .filter((entry) => Number(entry.interpretationVersion) === interpretationVersion)
    .map((entry) => ({ ...entry }))
    .sort((a, b) =>
      String(a.questionCode).localeCompare(String(b.questionCode)) ||
      Number(a.optionIndex) - Number(b.optionIndex)
    );
  const consistencyRules = [...(consistencyRuleRegistry.rules || [])]
    .map((rule) => ({ ...rule }))
    .sort((a, b) => canonicalizeAssessmentConfig(a).localeCompare(canonicalizeAssessmentConfig(b)));
  const consistencyPairs = (consistencyPairRegistry.pairs || [])
    .filter((pair) => pair.assessmentSlug === slug && pair.assessmentVersion === version)
    .map((pair) => ({ ...pair }))
    .sort((a, b) =>
      String(a.validatorQuestionCode).localeCompare(String(b.validatorQuestionCode)) ||
      String(a.targetQuestionCode).localeCompare(String(b.targetQuestionCode)) ||
      String(a.relationshipType).localeCompare(String(b.relationshipType))
    );

  return {
    assessment: {
      id: runtime.assessment.id,
      familyId: runtime.family.id,
      slug,
      versionSlug: runtime.assessment.slug,
      version: assessmentVersion,
      configVersion: runtime.assessment.config_version ?? null,
      titleAr: runtime.assessment.title_ar,
      titleEn: runtime.assessment.title_en,
      description: runtime.assessment.description,
      declaredQuestionCount: runtime.assessment.question_count,
      declaredAxisCount: runtime.assessment.axis_count,
      questionCount: runtime.questions.length,
      axisCount: runtime.axes.length,
      hasTraps: runtime.assessment.has_traps ?? false,
      hasEvSimulator: runtime.assessment.has_ev_simulator ?? false,
      axisRoles: runtime.assessment.axis_roles ?? {},
      kpiMappings: runtime.assessment.kpi_mappings ?? {},
      evMappings: runtime.assessment.ev_mappings ?? {},
    },
    axes: runtime.axes.map((axis) => ({
      id: axis.id,
      code: axis.code,
      weight: Number(axis.weight),
      title: axis.title,
      titleAr: axis.title_ar,
      description: axis.description,
      displayOrder: Number(axis.display_order),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    questions: runtime.questions.map((question) => ({
      id: question.id,
      code: question.code,
      axisId: question.axis_id,
      text: question.question_text,
      textAr: question.question_text_ar,
      type: question.question_type,
      displayOrder: Number(question.display_order),
      layer: question.layer ?? null,
      impact: question.impact ?? null,
      trapFor: question.trap_for ?? null,
      required: question.is_required !== false,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    options: runtime.options.map((option) => ({
      id: option.id,
      questionId: option.question_id,
      optionIndex: Number(option.option_index),
      optionValue: Number(option.option_value),
      label: option.label,
      labelAr: option.label_ar,
      isTrap: option.is_trap ?? false,
      displayOrder: Number(option.display_order),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    traps: [...(runtime.traps || [])]
      .map((trap) => ({ ...trap }))
      .sort((a, b) =>
        String(a.question_id).localeCompare(String(b.question_id)) ||
        String(a.name).localeCompare(String(b.name))
      ),
    interpretation: {
      schemaVersion: interpretationRegistry.schemaVersion,
      interpretationVersion,
      entries: registryEntries,
    },
    consistency: {
      schemaVersion: consistencyRuleRegistry.schemaVersion,
      ruleRegistryVersion: consistencyRuleRegistry.schemaVersion,
      rules: consistencyRules,
      pairRegistryVersion: consistencyPairRegistry.schemaVersion,
      pairs: consistencyPairs,
    },
  };
}

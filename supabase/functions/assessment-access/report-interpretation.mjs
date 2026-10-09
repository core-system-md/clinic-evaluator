const COMMON_PERMITTED_CONCLUSIONS = [
  "report_measured_overall_score",
  "report_measured_axis_values",
  "identify_lowest_and_highest_measured_axes",
  "show_only_available_kpis",
  "show_economic_output_only_when_computed",
  "compare_trend_only_when_provenance_is_compatible"
];

export const REPORT_MODELS = Object.freeze({
  "admin-reception-assessment": {
    modelVersion: "REPORT_MODEL_V1", purpose: "جاهزية الإدارة والاستقبال وتنسيق التشغيل",
    axisRoles: { AX85a6e9: "SCHEDULING", AX765ca8: "RECEPTION", AXa23fa3: "ADMIN", AXc39190: "COORDINATION" },
    measuredConstructs: ["SCHEDULING", "RECEPTION", "ADMIN", "COORDINATION"],
    userKpis: ["RRI", "TFI", "PSI", "TCI", "EVI", "NPI", "PLI", "PRP", "TAP"],
    economicAllowed: true, economicPolicySource: "assessment_types.has_ev_simulator",
    diagnosticMeanings: { lowestMeasuredAxis: "lowest_measured_axis_only", highestMeasuredAxis: "highest_measured_axis_only" },
    permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
    textTemplateCatalog: ["quartiles.Q1", "quartiles.Q2", "quartiles.Q3", "quartiles.Q4", "kpis.RRI", "kpis.TFI", "kpis.PSI", "kpis.TCI", "kpis.EVI", "kpis.NPI", "kpis.PLI", "kpis.PRP", "kpis.TAP", "report.overall_score", "report.axis_summary"]
  },
  "clinic-performance": {
    modelVersion: "REPORT_MODEL_V1", purpose: "أداء العيادة في التحويل والتواصل والاستبقاء",
    axisRoles: { A1: "TRUST", A2: "COMMUNICATION", A3: "RETENTION" },
    measuredConstructs: ["TRUST", "COMMUNICATION", "RETENTION"],
    userKpis: ["TFI", "TAP", "PRP", "PLI", "PSI", "NPI", "EVI", "TCI"],
    economicAllowed: true, economicPolicySource: "assessment_types.has_ev_simulator",
    diagnosticMeanings: { lowestMeasuredAxis: "lowest_measured_axis_only", highestMeasuredAxis: "highest_measured_axis_only" },
    permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
    textTemplateCatalog: ["quartiles.Q1", "quartiles.Q2", "quartiles.Q3", "quartiles.Q4", "kpis.TFI", "kpis.TAP", "kpis.PRP", "kpis.PLI", "kpis.PSI", "kpis.NPI", "kpis.EVI", "kpis.TCI", "report.overall_score", "report.axis_summary"]
  },
  "comprehensive-clinic-assessment": {
    modelVersion: "REPORT_MODEL_V1", purpose: "الصورة التشغيلية الشاملة للعيادة",
    axisRoles: { AX6f5aa5: "JOURNEY", AX80c09a: "CONVERSION", AXaadfb4: "OPERATIONS", AX2572cc: "TEAM", AX6a52b4: "RETENTION", AX15afd8: "GROWTH" },
    measuredConstructs: ["JOURNEY", "CONVERSION", "OPERATIONS", "TEAM", "RETENTION", "GROWTH"],
    userKpis: ["TFI", "TAP", "PRP", "PLI", "PSI", "NPI", "EVI", "TCI"],
    economicAllowed: false, economicPolicySource: "assessment_types.has_ev_simulator",
    diagnosticMeanings: { lowestMeasuredAxis: "lowest_measured_axis_only", highestMeasuredAxis: "highest_measured_axis_only" },
    permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
    textTemplateCatalog: ["quartiles.Q1", "quartiles.Q2", "quartiles.Q3", "quartiles.Q4", "report.overall_score", "report.axis_summary", "report.structural_diagnosis"]
  },
  "medical-team-assessment": {
    modelVersion: "REPORT_MODEL_V1", purpose: "أداء الفريق الطبي في الثقة والتواصل والتحويل والعمل الجماعي",
    axisRoles: { A1: "TRUST", A2: "COMMUNICATION", A3: "CONVERSION", A4: "TEAMWORK" },
    measuredConstructs: ["TRUST", "COMMUNICATION", "CONVERSION", "TEAMWORK"],
    userKpis: ["TFI", "TAP", "TCI", "PSI", "NPI"],
    economicAllowed: true, economicPolicySource: "assessment_types.has_ev_simulator",
    diagnosticMeanings: { lowestMeasuredAxis: "lowest_measured_axis_only", highestMeasuredAxis: "highest_measured_axis_only" },
    permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
    textTemplateCatalog: ["quartiles.Q1", "quartiles.Q2", "quartiles.Q3", "quartiles.Q4", "kpis.TFI", "kpis.TAP", "kpis.TCI", "kpis.PSI", "kpis.NPI", "report.overall_score", "report.axis_summary"]
  },
  "patient-journey": {
    modelVersion: "REPORT_MODEL_V1", purpose: "جودة رحلة المريض من الثقة إلى الولاء",
    axisRoles: { A1: "TRUST", A2: "COMMUNICATION", A3: "CONVERSION", A4: "RETENTION", A5: "LOYALTY" },
    measuredConstructs: ["TRUST", "COMMUNICATION", "CONVERSION", "RETENTION", "LOYALTY"],
    userKpis: ["TFI", "TAP", "PRP", "PLI", "PSI", "NPI", "EVI", "TCI"],
    economicAllowed: true, economicPolicySource: "assessment_types.has_ev_simulator",
    diagnosticMeanings: { lowestMeasuredAxis: "lowest_measured_axis_only", highestMeasuredAxis: "highest_measured_axis_only" },
    permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
    textTemplateCatalog: ["quartiles.Q1", "quartiles.Q2", "quartiles.Q3", "quartiles.Q4", "kpis.TFI", "kpis.TAP", "kpis.PRP", "kpis.PLI", "kpis.PSI", "kpis.NPI", "kpis.EVI", "kpis.TCI", "report.overall_score", "report.axis_summary"]
  }
});

const BAND_LABELS = { Q1: "مرحلة التأسيس", Q2: "مرحلة التفعيل", Q3: "مرحلة النمو", Q4: "مرحلة الريادة" };

export function axisBandCode(percentage) {
  if (!Number.isFinite(percentage)) return null;
  if (percentage >= 75) return "Q4";
  if (percentage >= 50) return "Q3";
  if (percentage >= 25) return "Q2";
  return "Q1";
}

export function compatibleTrend(current, previous) {
  if (!previous) return { status: "unavailable", reason: "no_comparison" };
  const fields = [
    [previous.assessmentFamilyId, current?.identity?.assessmentFamilyId],
    [previous.assessmentVersion, current?.identity?.assessmentVersion],
    [previous.scoringEngineVersion, current?.provenance?.scoringEngineVersion],
    [previous.scoringContractVersion, current?.provenance?.scoringContractVersion],
    [previous.assessmentConfigDigest, current?.provenance?.assessmentConfigDigest]
  ];
  if (fields.some(([left, right]) =>
    left === null || left === undefined || right === null || right === undefined ||
    String(left).trim() === "" || String(right).trim() === ""
  )) return { status: "unavailable", reason: "comparison_provenance_incomplete" };
  if (fields.some(([left, right]) => String(left) !== String(right))) {
    return { status: "unavailable", reason: "incompatible_comparison_basis" };
  }
  const previousScore = Number(previous.overallScore);
  const currentScore = Number(current?.scores?.overallScore);
  if (!Number.isFinite(previousScore) || !Number.isFinite(currentScore)) {
    return { status: "unavailable", reason: "missing_score" };
  }
  const delta = currentScore - previousScore;
  return {
    status: "available", previousScore, currentScore, delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "stable",
    completedAt: previous.completedAt || null
  };
}

export function projectCompletionResponse(structuredResult, previousSession = null) {
  if (!structuredResult || !structuredResult.identity || !structuredResult.scores ||
      !Array.isArray(structuredResult.scores.axes) || !structuredResult.classification) {
    throw new Error("Structured Result does not contain the required report fields.");
  }
  const slug = String(structuredResult?.provenance?.assessmentSlug || structuredResult?.identity?.assessmentSlug || "");
  const model = REPORT_MODELS[slug];
  if (!model) throw new Error("No approved report model for assessment family: " + (slug || "unknown"));

  const seenCodes = new Set();
  for (const axis of structuredResult.scores.axes) {
    const code = String(axis?.axisCode || "");
    if (!code || seenCodes.has(code)) throw new Error("Structured Result axis identity is missing or duplicated.");
    seenCodes.add(code);
    if (!Object.hasOwn(model.axisRoles, code)) {
      throw new Error("Structured Result axis is outside the approved family report model: " + code);
    }
  }

  const axes = structuredResult.scores.axes
    .filter(axis => axis?.status === "measured" && Number.isFinite(axis?.percentage))
    .map(axis => ({
      code: String(axis.axisCode),
      nameAr: String(axis.axisNameAr || axis.axisCode),
      nameEn: String(axis.axisNameEn || axis.axisCode),
      percentage: Number(axis.percentage),
      bandCode: axisBandCode(Number(axis.percentage)),
      status: "measured"
    }))
    .sort((a, b) => a.percentage - b.percentage || a.code.localeCompare(b.code));

  const allowedKpis = new Set(model.userKpis);
  const availableKpis = (structuredResult.kpis || [])
    .filter(kpi => allowedKpis.has(String(kpi?.kpiCode)) && kpi?.status === "available" && Number.isFinite(kpi?.value))
    .map(kpi => ({ code: String(kpi.kpiCode), value: Number(kpi.value) }));

  const economic = structuredResult.economics || {};
  const economicAssumptions = economic.output?.assumptions || {};
  const visitsPerYear = Number(economicAssumptions.visitsPerYear);
  const referralPercentage = Number(economicAssumptions.referralPercentage);
  const economicOpportunity = model.economicAllowed &&
      economic.status === "COMPUTED" && economic.output &&
      Number.isFinite(Number(economic.output.value)) &&
      Number.isFinite(visitsPerYear) && visitsPerYear > 0 &&
      Number.isFinite(referralPercentage) && referralPercentage >= 0 && referralPercentage <= 100
    ? { status: "available", value: Number(economic.output.value), unit: "currency", visitsPerYear, referralPercentage }
    : null;

  const bandCode = structuredResult.classification.bandCode || null;
  const userReport = {
    audience: "user",
    assessment: {
      familyId: structuredResult.identity.assessmentFamilyId || null,
      version: structuredResult.identity.assessmentVersion ?? null,
      purpose: model.purpose
    },
    overall: {
      value: Number.isFinite(structuredResult.scores.overallScore) ? Number(structuredResult.scores.overallScore) : null,
      bandCode,
      label: bandCode ? (BAND_LABELS[bandCode] || bandCode) : "غير متاح"
    },
    axes,
    priority: axes.length ? {
      axisCode: axes[0].code, axisNameAr: axes[0].nameAr, percentage: axes[0].percentage,
      meaning: model.diagnosticMeanings.lowestMeasuredAxis
    } : null,
    strength: axes.length ? {
      axisCode: axes[axes.length - 1].code, axisNameAr: axes[axes.length - 1].nameAr, percentage: axes[axes.length - 1].percentage,
      meaning: model.diagnosticMeanings.highestMeasuredAxis
    } : null,
    kpis: availableKpis,
    economicOpportunity,
    trend: compatibleTrend(structuredResult, previousSession),
    coverage: {
      status: ["FULL", "PARTIAL", "UNKNOWN"].includes(structuredResult.coverage?.coverageStatus)
        ? structuredResult.coverage.coverageStatus : "UNKNOWN",
      ratio: Number.isFinite(structuredResult.coverage?.coverageRatio)
        ? Number(structuredResult.coverage.coverageRatio) : null
    }
  };

  return {
    overallScore: userReport.overall.value,
    classification: userReport.overall.bandCode,
    axisScores: Object.fromEntries(axes.map(axis => [axis.code, axis.percentage])),
    kpis: Object.fromEntries(availableKpis.map(kpi => [kpi.code, kpi.value])),
    evSimulator: null,
    traps: [],
    userReport
  };
}

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MDReportInterpretation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BAND_LABELS = {
    Q1: 'مرحلة التأسيس',
    Q2: 'مرحلة التفعيل',
    Q3: 'مرحلة النمو',
    Q4: 'مرحلة الريادة'
  };

  const COMMON_PERMITTED_CONCLUSIONS = [
    'report_measured_overall_score',
    'report_measured_axis_values',
    'identify_lowest_and_highest_measured_axes',
    'show_only_available_kpis',
    'show_economic_output_only_when_computed_and_family_enabled',
    'compare_trend_only_when_provenance_is_compatible'
  ];

  /*
   * Family-specific report semantics, distinct from score calculation.
   */
  const REPORT_MODELS = {
    'admin-reception-assessment': {
      modelVersion: 'REPORT_MODEL_V1',
      purpose: 'جاهزية الإدارة والاستقبال وتنسيق التشغيل',
      measuredConstructs: [
        { axisCode: 'AX85a6e9', constructRole: 'SCHEDULING' },
        { axisCode: 'AX765ca8', constructRole: 'RECEPTION' },
        { axisCode: 'AXa23fa3', constructRole: 'ADMIN' },
        { axisCode: 'AXc39190', constructRole: 'COORDINATION' }
      ],
      supportedKpis: ['RRI', 'TFI', 'PSI', 'TCI', 'EVI', 'NPI', 'PLI', 'PRP', 'TAP'],
      economic: { enabled: true, annualVisits: 3, source: 'assessment.has_ev_simulator' },
      diagnosticMeanings: { priority: 'lowest_measured_axis', strength: 'highest_measured_axis', evidenceBoundary: 'measured_result_only' },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textTemplateCatalog: ['quartiles.Q1', 'quartiles.Q2', 'quartiles.Q3', 'quartiles.Q4', 'kpis.RRI', 'kpis.TFI', 'kpis.PSI', 'kpis.TCI', 'kpis.EVI', 'kpis.NPI', 'kpis.PLI', 'kpis.PRP', 'kpis.TAP', 'report.overall_score', 'report.axis_summary']
    },
    'clinic-performance': {
      modelVersion: 'REPORT_MODEL_V1',
      purpose: 'أداء العيادة في التحويل والتواصل والاستبقاء',
      measuredConstructs: [
        { axisCode: 'A1', constructRole: 'TRUST' },
        { axisCode: 'A2', constructRole: 'COMMUNICATION' },
        { axisCode: 'A3', constructRole: 'RETENTION' }
      ],
      supportedKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economic: { enabled: true, annualVisits: 3, source: 'assessment.has_ev_simulator' },
      diagnosticMeanings: { priority: 'lowest_measured_axis', strength: 'highest_measured_axis', evidenceBoundary: 'measured_result_only' },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textTemplateCatalog: ['quartiles.Q1', 'quartiles.Q2', 'quartiles.Q3', 'quartiles.Q4', 'kpis.TFI', 'kpis.TAP', 'kpis.PRP', 'kpis.PLI', 'kpis.PSI', 'kpis.NPI', 'kpis.EVI', 'kpis.TCI', 'report.overall_score', 'report.axis_summary']
    },
    'comprehensive-clinic-assessment': {
      modelVersion: 'REPORT_MODEL_V1',
      purpose: 'الصورة التشغيلية الشاملة للعيادة',
      measuredConstructs: [
        { axisCode: 'AX6f5aa5', constructRole: 'JOURNEY' },
        { axisCode: 'AX80c09a', constructRole: 'CONVERSION' },
        { axisCode: 'AXaadfb4', constructRole: 'OPERATIONS' },
        { axisCode: 'AX2572cc', constructRole: 'TEAM' },
        { axisCode: 'AX6a52b4', constructRole: 'RETENTION' },
        { axisCode: 'AX15afd8', constructRole: 'GROWTH' }
      ],
      supportedKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economic: { enabled: false, annualVisits: 3, source: 'assessment.has_ev_simulator' },
      diagnosticMeanings: { priority: 'lowest_measured_axis', strength: 'highest_measured_axis', evidenceBoundary: 'measured_result_only' },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textTemplateCatalog: ['quartiles.Q1', 'quartiles.Q2', 'quartiles.Q3', 'quartiles.Q4', 'report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
    },
    'medical-team-assessment': {
      modelVersion: 'REPORT_MODEL_V1',
      purpose: 'أداء الفريق الطبي في الثقة والتواصل والتحويل والعمل الجماعي',
      measuredConstructs: [
        { axisCode: 'A1', constructRole: 'TRUST' },
        { axisCode: 'A2', constructRole: 'COMMUNICATION' },
        { axisCode: 'A3', constructRole: 'CONVERSION' },
        { axisCode: 'A4', constructRole: 'TEAMWORK' }
      ],
      supportedKpis: ['TFI', 'TAP', 'TCI', 'PSI', 'NPI'],
      economic: { enabled: true, annualVisits: 3, source: 'assessment.has_ev_simulator' },
      diagnosticMeanings: { priority: 'lowest_measured_axis', strength: 'highest_measured_axis', evidenceBoundary: 'measured_result_only' },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textTemplateCatalog: ['quartiles.Q1', 'quartiles.Q2', 'quartiles.Q3', 'quartiles.Q4', 'kpis.TFI', 'kpis.TAP', 'kpis.TCI', 'kpis.PSI', 'kpis.NPI', 'report.overall_score', 'report.axis_summary']
    },
    'patient-journey': {
      modelVersion: 'REPORT_MODEL_V1',
      purpose: 'جودة رحلة المريض من الثقة إلى الولاء',
      measuredConstructs: [
        { axisCode: 'A1', constructRole: 'TRUST' },
        { axisCode: 'A2', constructRole: 'COMMUNICATION' },
        { axisCode: 'A3', constructRole: 'CONVERSION' },
        { axisCode: 'A4', constructRole: 'RETENTION' },
        { axisCode: 'A5', constructRole: 'LOYALTY' }
      ],
      supportedKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economic: { enabled: true, annualVisits: 3, source: 'assessment.has_ev_simulator' },
      diagnosticMeanings: { priority: 'lowest_measured_axis', strength: 'highest_measured_axis', evidenceBoundary: 'measured_result_only' },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textTemplateCatalog: ['quartiles.Q1', 'quartiles.Q2', 'quartiles.Q3', 'quartiles.Q4', 'kpis.TFI', 'kpis.TAP', 'kpis.PRP', 'kpis.PLI', 'kpis.PSI', 'kpis.NPI', 'kpis.EVI', 'kpis.TCI', 'report.overall_score', 'report.axis_summary']
    }
  };

  function assertStructuredResult(result) {
    if (!result || result.schemaVersion !== 'P3_STRUCTURED_RESULT_V1') {
      throw new Error('Report interpretation requires a P3 structured result.');
    }
    if (result.status !== 'PRODUCTION') {
      throw new Error('Only production Structured Results may produce a final report.');
    }
    if (!result.identity || !result.identity.assessmentFamilyId || !result.identity.assessmentVersion) {
      throw new Error('Structured Result identity is incomplete.');
    }
    if (!result.classification || !result.scores || !Array.isArray(result.scores.axes)) {
      throw new Error('Structured Result report fields are incomplete.');
    }
    return result;
  }

  function modelFor(result, assessmentSlug) {
    const embeddedSlug = result?.provenance?.assessmentSlug || result?.identity?.assessmentSlug || null;
    const slug = assessmentSlug || embeddedSlug;
    const model = REPORT_MODELS[slug];
    if (!model) throw new Error('No approved report model for assessment family: ' + String(slug || 'unknown'));
    if (assessmentSlug && embeddedSlug && assessmentSlug !== embeddedSlug) {
      throw new Error('Report model family does not match Structured Result identity.');
    }
    return model;
  }

  function axisBandCode(percentage) {
    if (!Number.isFinite(percentage)) return null;
    if (percentage >= 75) return 'Q4';
    if (percentage >= 50) return 'Q3';
    if (percentage >= 25) return 'Q2';
    return 'Q1';
  }

  function measuredAxes(result, model) {
    const modeledAxes = new Map(model.measuredConstructs.map((item) => [item.axisCode, item.constructRole]));
    const resultAxes = result.scores.axes;
    const observedCodes = resultAxes.map((axis) => String(axis?.axisCode || ''));
    const observedSet = new Set(observedCodes);
    if (observedSet.size !== observedCodes.length) throw new Error('Structured Result contains duplicate axis identities.');
    const unknown = observedCodes.filter((code) => !modeledAxes.has(code));
    if (unknown.length) throw new Error('Structured Result contains axes outside the approved family report model.');

    return resultAxes
      .filter((axis) => axis?.status === 'measured' && Number.isFinite(axis?.percentage))
      .map((axis) => ({
        code: String(axis.axisCode),
        constructRole: modeledAxes.get(String(axis.axisCode)),
        nameAr: axis.axisNameAr || axis.axisCode,
        nameEn: axis.axisNameEn || axis.axisCode,
        percentage: Number(axis.percentage),
        bandCode: axisBandCode(Number(axis.percentage)),
        status: axis.status
      }))
      .sort((a, b) => a.percentage - b.percentage || a.code.localeCompare(b.code));
  }

  function userKpis(result, model) {
    const allowed = new Set(model.supportedKpis);
    return (result.kpis || [])
      .filter((kpi) => allowed.has(kpi.kpiCode) && kpi.status === 'available' && Number.isFinite(kpi.value))
      .map((kpi) => ({ code: String(kpi.kpiCode), value: Number(kpi.value) }));
  }

  function economicProjection(result, model) {
    const economic = result.economics || {};
    if (!model.economic.enabled || economic.status !== 'COMPUTED' || !economic.output) return null;
    return {
      status: 'available',
      value: Number(economic.output.value),
      unit: 'currency',
      visitsPerYear: Number(economic.output.assumptions?.visitsPerYear),
      referralPercentage: Number(economic.output.assumptions?.referralPercentage)
    };
  }

  function compatibleTrend(current, previous) {
    if (!previous) return { status: 'unavailable', reason: 'no_comparison' };
    const currentProvenance = current.provenance || {};
    const comparisonFields = [
      [previous.assessmentFamilyId, current.identity?.assessmentFamilyId],
      [previous.assessmentVersion, current.identity?.assessmentVersion],
      [previous.scoringEngineVersion, currentProvenance.scoringEngineVersion],
      [previous.scoringContractVersion, currentProvenance.scoringContractVersion],
      [previous.assessmentConfigDigest, currentProvenance.assessmentConfigDigest]
    ];
    if (comparisonFields.some(([left, right]) =>
      left === null || left === undefined || right === null || right === undefined ||
      String(left).trim() === '' || String(right).trim() === ''
    )) return { status: 'unavailable', reason: 'comparison_provenance_incomplete' };
    if (comparisonFields.some(([left, right]) => String(left) !== String(right))) {
      return { status: 'unavailable', reason: 'incompatible_comparison_basis' };
    }
    const previousScore = Number(previous.overallScore);
    const currentScore = Number(current.scores.overallScore);
    if (!Number.isFinite(previousScore) || !Number.isFinite(currentScore)) {
      return { status: 'unavailable', reason: 'missing_score' };
    }
    const delta = currentScore - previousScore;
    return {
      status: 'available', delta,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
      previousScore, currentScore, completedAt: previous.completedAt || null
    };
  }

  function projectUserReport(result, previousSession, assessmentSlug) {
    const current = assertStructuredResult(result);
    const model = modelFor(current, assessmentSlug);
    const axes = measuredAxes(current, model);
    const lowest = axes[0] || null;
    const highest = axes.length ? axes[axes.length - 1] : null;
    const overall = Number.isFinite(current.scores.overallScore) ? Number(current.scores.overallScore) : null;
    const bandCode = current.classification.bandCode || null;

    return {
      audience: 'user',
      assessment: {
        familyId: current.identity.assessmentFamilyId,
        version: current.identity.assessmentVersion,
        purpose: model.purpose
      },
      overall: {
        value: overall,
        bandCode,
        label: bandCode ? (BAND_LABELS[bandCode] || bandCode) : 'غير متاح'
      },
      axes,
      priority: lowest ? {
        axisCode: lowest.code,
        axisNameAr: lowest.nameAr,
        percentage: lowest.percentage,
        meaning: model.diagnosticMeanings.priority
      } : null,
      strength: highest ? {
        axisCode: highest.code,
        axisNameAr: highest.nameAr,
        percentage: highest.percentage,
        meaning: model.diagnosticMeanings.strength
      } : null,
      kpis: userKpis(current, model),
      economicOpportunity: economicProjection(current, model),
      trend: compatibleTrend(current, previousSession),
      coverage: {
        status: current.coverage?.coverageStatus || 'UNKNOWN',
        ratio: Number.isFinite(current.coverage?.coverageRatio) ? Number(current.coverage.coverageRatio) : null
      }
    };
  }

  function projectAdminReport(result, previousSession, assessmentSlug) {
    const current = assertStructuredResult(result);
    const model = modelFor(current, assessmentSlug);
    return {
      audience: 'admin',
      assessment: {
        familyId: current.identity.assessmentFamilyId,
        typeId: current.identity.assessmentTypeId,
        version: current.identity.assessmentVersion,
        modelPurpose: model.purpose
      },
      identity: current.identity,
      provenance: current.provenance,
      inputs: current.inputs,
      measurement: current.measurement,
      scores: current.scores,
      coverage: current.coverage,
      consistency: current.consistency,
      criticality: current.criticality,
      development: current.development,
      roles: current.roles,
      kpis: current.kpis,
      economics: current.economics,
      classification: current.classification,
      diagnostics: current.diagnostics,
      audit: current.audit,
      trend: compatibleTrend(current, previousSession)
    };
  }

  return {
    REPORT_MODELS,
    assertStructuredResult,
    projectUserReport,
    projectAdminReport,
    compatibleTrend,
    axisBandCode
  };
});

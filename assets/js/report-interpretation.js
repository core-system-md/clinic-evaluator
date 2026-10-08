(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MDReportInterpretation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BAND_LABEL_KEYS = {
    Q1: 'quartiles.Q1.label',
    Q2: 'quartiles.Q2.label',
    Q3: 'quartiles.Q3.label',
    Q4: 'quartiles.Q4.label'
  };

  const AXIS_BAND_RULES = [
    { min: 75, code: 'Q4' },
    { min: 50, code: 'Q3' },
    { min: 25, code: 'Q2' },
    { min: -Infinity, code: 'Q1' }
  ];

  const COMMON_PERMITTED_CONCLUSIONS = [
    'overall_band',
    'measured_axis_priority',
    'measured_axis_strength',
    'eligible_kpi',
    'economic_opportunity_when_enabled_and_computed',
    'trend_when_server_verified_compatible'
  ];

  /*
   * Each family owns an explicit report model. The model describes the
   * measured scope and the claims the report layer may make; it never scores.
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
      economic: {
        enabled: true,
        annualVisits: 3,
        source: 'assessment.has_ev_simulator'
      },
      diagnosticMeanings: {
        priority: 'lowest_measured_axis',
        strength: 'highest_measured_axis',
        evidenceBoundary: 'measured_result_only'
      },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textCatalog: {
        overallBand: 'quartiles.{bandCode}.label',
        kpi: 'kpis.{kpiCode}',
        sections: ['report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
      }
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
      economic: {
        enabled: true,
        annualVisits: 3,
        source: 'assessment.has_ev_simulator'
      },
      diagnosticMeanings: {
        priority: 'lowest_measured_axis',
        strength: 'highest_measured_axis',
        evidenceBoundary: 'measured_result_only'
      },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textCatalog: {
        overallBand: 'quartiles.{bandCode}.label',
        kpi: 'kpis.{kpiCode}',
        sections: ['report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
      }
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
      economic: {
        enabled: false,
        annualVisits: 3,
        source: 'assessment.has_ev_simulator'
      },
      diagnosticMeanings: {
        priority: 'lowest_measured_axis',
        strength: 'highest_measured_axis',
        evidenceBoundary: 'measured_result_only'
      },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textCatalog: {
        overallBand: 'quartiles.{bandCode}.label',
        kpi: 'kpis.{kpiCode}',
        sections: ['report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
      }
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
      economic: {
        enabled: true,
        annualVisits: 3,
        source: 'assessment.has_ev_simulator'
      },
      diagnosticMeanings: {
        priority: 'lowest_measured_axis',
        strength: 'highest_measured_axis',
        evidenceBoundary: 'measured_result_only'
      },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textCatalog: {
        overallBand: 'quartiles.{bandCode}.label',
        kpi: 'kpis.{kpiCode}',
        sections: ['report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
      }
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
      economic: {
        enabled: true,
        annualVisits: 3,
        source: 'assessment.has_ev_simulator'
      },
      diagnosticMeanings: {
        priority: 'lowest_measured_axis',
        strength: 'highest_measured_axis',
        evidenceBoundary: 'measured_result_only'
      },
      permittedConclusions: COMMON_PERMITTED_CONCLUSIONS,
      textCatalog: {
        overallBand: 'quartiles.{bandCode}.label',
        kpi: 'kpis.{kpiCode}',
        sections: ['report.overall_score', 'report.axis_summary', 'report.structural_diagnosis']
      }
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

  function resolveAssessmentSlug(result, assessmentSlug) {
    const slug = assessmentSlug || result?.provenance?.assessmentSlug || result?.identity?.assessmentSlug;
    if (!slug || !REPORT_MODELS[slug]) {
      throw new Error('No explicit report model for assessment family: ' + String(slug || 'unknown'));
    }
    return slug;
  }

  function modelFor(result, assessmentSlug) {
    return REPORT_MODELS[resolveAssessmentSlug(result, assessmentSlug)];
  }

  function axisBandCode(percentage) {
    for (const rule of AXIS_BAND_RULES) {
      if (percentage >= rule.min) return rule.code;
    }
    return 'Q1';
  }

  function measuredAxes(result, model) {
    const expected = new Set(model.measuredConstructs.map(item => item.axisCode));
    const measured = result.scores.axes
      .filter((axis) => axis?.status === 'measured' && Number.isFinite(axis?.percentage))
      .map((axis) => {
        const code = String(axis.axisCode);
        if (!expected.has(code)) {
          throw new Error('Structured Result contains an axis outside the report model: ' + code);
        }
        return {
          code,
          nameAr: axis.axisNameAr || axis.axisCode,
          nameEn: axis.axisNameEn || axis.axisCode,
          percentage: Number(axis.percentage),
          status: axis.status,
          bandCode: axisBandCode(Number(axis.percentage))
        };
      })
      .sort((a, b) => a.percentage - b.percentage || a.code.localeCompare(b.code));

    const missingExpected = model.measuredConstructs
      .filter(item => !measured.some(axis => axis.code === item.axisCode))
      .map(item => item.axisCode);

    if (missingExpected.length) {
      throw new Error('Report model axis completeness failure: ' + missingExpected.join(','));
    }
    return measured;
  }

  function userKpis(result, model) {
    const allowed = new Set(model.supportedKpis);
    return (result.kpis || [])
      .filter((kpi) => allowed.has(kpi.kpiCode) && kpi.status === 'available' && Number.isFinite(kpi.value))
      .map((kpi) => ({
        code: String(kpi.kpiCode),
        value: Number(kpi.value),
        textKey: model.textCatalog.kpi.replace('{kpiCode}', String(kpi.kpiCode))
      }));
  }

  function economicProjection(result, model) {
    const economic = result.economics || {};
    if (
      !model.economic.enabled ||
      economic.status !== 'COMPUTED' ||
      !economic.output
    ) return null;

    const visitsPerYear = Number(economic.output.assumptions?.visitsPerYear);
    const referralPercentage = Number(economic.output.assumptions?.referralPercentage);

    if (visitsPerYear !== model.economic.annualVisits) {
      throw new Error('Economic Opportunity annual basis is incompatible with the report model.');
    }

    return {
      status: 'available',
      value: Number(economic.output.value),
      unit: 'currency',
      visitsPerYear,
      referralPercentage: Number.isFinite(referralPercentage) ? referralPercentage : null
    };
  }

  function compatibleTrend(current, previous) {
    if (!previous) return { status: 'unavailable', reason: 'no_comparison' };

    /*
     * The server may verify the comparison basis before crossing the browser
     * boundary. That safe result uses comparisonStatus instead of exposing the
     * technical provenance required to make the decision.
     */
    if (previous.comparisonStatus === 'compatible') {
      const previousScore = Number(previous.overallScore);
      const currentScore = Number(current.scores.overallScore);
      if (!Number.isFinite(previousScore) || !Number.isFinite(currentScore)) {
        return { status: 'unavailable', reason: 'missing_score' };
      }
      const delta = currentScore - previousScore;
      return {
        status: 'available',
        delta,
        previousScore,
        currentScore,
        completedAt: previous.completedAt || null,
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
      };
    }

    if (previous.comparisonStatus && previous.comparisonStatus !== 'compatible') {
      return {
        status: 'unavailable',
        reason: previous.comparisonReason || 'incompatible_comparison_basis'
      };
    }

    // Unit-test/reference compatibility path. Technical provenance is never
    // copied into the user projection.
    const sameFamily = String(previous.assessmentFamilyId || '') === String(current.identity.assessmentFamilyId || '');
    const sameVersion = String(previous.assessmentVersion || '') === String(current.identity.assessmentVersion || '');
    const sameEngine = String(previous.scoringEngineVersion || '') === String(current.provenance?.scoringEngineVersion || '');
    const sameContract = String(previous.scoringContractVersion || '') === String(current.provenance?.scoringContractVersion || '');
    const sameConfig = String(previous.assessmentConfigDigest || '') === String(current.provenance?.assessmentConfigDigest || '');
    if (!(sameFamily && sameVersion && sameEngine && sameContract && sameConfig)) {
      return { status: 'unavailable', reason: 'incompatible_comparison_basis' };
    }

    const previousScore = Number(previous.overallScore);
    const currentScore = Number(current.scores.overallScore);
    if (!Number.isFinite(previousScore) || !Number.isFinite(currentScore)) {
      return { status: 'unavailable', reason: 'missing_score' };
    }

    const delta = currentScore - previousScore;
    return {
      status: 'available',
      delta,
      previousScore,
      currentScore,
      completedAt: previous.completedAt || null,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
    };
  }

  function interpretConclusion(axis, type) {
    if (!axis) return null;
    if (type === 'priority') {
      return {
        axisCode: axis.code,
        axisNameAr: axis.nameAr,
        percentage: axis.percentage,
        statement: 'هذا المحور هو الأقل ضمن المحاور المقاسة في هذا التقييم.'
      };
    }
    return {
      axisCode: axis.code,
      axisNameAr: axis.nameAr,
      percentage: axis.percentage,
      statement: 'هذا المحور هو الأعلى ضمن المحاور المقاسة في هذا التقييم.'
    };
  }

  function trendPresentation(trend) {
    if (!trend || trend.status !== 'available') return trend;
    return {
      ...trend,
      statementKey:
        trend.direction === 'up'
          ? 'trend.up'
          : trend.direction === 'down'
            ? 'trend.down'
            : 'trend.stable'
    };
  }

  function projectUserReport(result, previousSession, assessmentSlug) {
    const current = assertStructuredResult(result);
    const model = modelFor(current, assessmentSlug);
    const resolvedSlug = resolveAssessmentSlug(current, assessmentSlug);
    const axes = measuredAxes(current, model);
    const lowest = axes[0] || null;
    const highest = axes.length ? axes[axes.length - 1] : null;
    const overall = Number.isFinite(current.scores.overallScore) ? Number(current.scores.overallScore) : null;
    const bandCode = current.classification.bandCode || null;

    if (!bandCode || !BAND_LABEL_KEYS[bandCode]) {
      throw new Error('Structured Result classification is not mapped to a report text template.');
    }

    const trend = trendPresentation(compatibleTrend(current, previousSession));

    return {
      audience: 'user',
      modelVersion: model.modelVersion,
      assessment: {
        familyId: current.identity.assessmentFamilyId,
        version: current.identity.assessmentVersion,
        slug: resolvedSlug,
        purpose: model.purpose
      },
      overall: {
        value: overall,
        bandCode,
        labelKey: model.textCatalog.overallBand.replace('{bandCode}', bandCode)
      },
      axes,
      priority: interpretConclusion(lowest, 'priority'),
      strength: interpretConclusion(highest, 'strength'),
      kpis: userKpis(current, model),
      economicOpportunity: economicProjection(current, model),
      trend,
      coverage: {
        status: current.coverage?.coverageStatus || 'UNKNOWN',
        ratio: Number.isFinite(current.coverage?.coverageRatio) ? Number(current.coverage.coverageRatio) : null
      },
      claimPolicy: {
        permittedConclusions: model.permittedConclusions,
        diagnosticMeaning: model.diagnosticMeanings
      }
    };
  }

  function projectAdminReport(result, previousSession, assessmentSlug) {
    const current = assertStructuredResult(result);
    const model = modelFor(current, assessmentSlug);
    const resolvedSlug = resolveAssessmentSlug(current, assessmentSlug);

    return {
      audience: 'admin',
      modelVersion: model.modelVersion,
      assessment: {
        familyId: current.identity.assessmentFamilyId,
        typeId: current.identity.assessmentTypeId,
        version: current.identity.assessmentVersion,
        slug: resolvedSlug,
        modelPurpose: model.purpose,
        measuredConstructs: model.measuredConstructs,
        supportedKpis: model.supportedKpis,
        economic: model.economic,
        permittedConclusions: model.permittedConclusions,
        diagnosticMeanings: model.diagnosticMeanings,
        textCatalog: model.textCatalog
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
    AXIS_BAND_RULES,
    assertStructuredResult,
    projectUserReport,
    projectAdminReport,
    compatibleTrend
  };
});

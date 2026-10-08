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

  const REPORT_MODELS = {
    'admin-reception-assessment': {
      purpose: 'جاهزية الإدارة والاستقبال وتنسيق التشغيل',
      userKpis: ['RRI', 'TFI', 'PSI', 'TCI', 'EVI', 'NPI', 'PLI', 'PRP', 'TAP'],
      economicAllowed: true
    },
    'clinic-performance': {
      purpose: 'أداء العيادة في التحويل والتواصل والاستبقاء',
      userKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economicAllowed: true
    },
    'comprehensive-clinic-assessment': {
      purpose: 'الصورة التشغيلية الشاملة للعيادة',
      userKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economicAllowed: true
    },
    'medical-team-assessment': {
      purpose: 'أداء الفريق الطبي في الثقة والتواصل والتحويل والعمل الجماعي',
      userKpis: ['TFI', 'TAP', 'TCI', 'PSI', 'NPI'],
      economicAllowed: true
    },
    'patient-journey': {
      purpose: 'جودة رحلة المريض من الثقة إلى الولاء',
      userKpis: ['TFI', 'TAP', 'PRP', 'PLI', 'PSI', 'NPI', 'EVI', 'TCI'],
      economicAllowed: true
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
    const slug = assessmentSlug || result?.provenance?.assessmentSlug || result?.identity?.assessmentSlug;
    return REPORT_MODELS[slug] || {
      purpose: 'نتيجة التقييم',
      userKpis: [],
      economicAllowed: false
    };
  }

  function measuredAxes(result) {
    return result.scores.axes
      .filter((axis) => axis?.status === 'measured' && Number.isFinite(axis?.percentage))
      .map((axis) => ({
        code: String(axis.axisCode),
        nameAr: axis.axisNameAr || axis.axisCode,
        nameEn: axis.axisNameEn || axis.axisCode,
        percentage: Number(axis.percentage),
        status: axis.status
      }))
      .sort((a, b) => a.percentage - b.percentage || a.code.localeCompare(b.code));
  }

  function userKpis(result, model) {
    const allowed = new Set(model.userKpis);
    return (result.kpis || [])
      .filter((kpi) => allowed.has(kpi.kpiCode) && kpi.status === 'available' && Number.isFinite(kpi.value))
      .map((kpi) => ({
        code: String(kpi.kpiCode),
        value: Number(kpi.value)
      }));
  }

  function economicProjection(result, model) {
    const economic = result.economics || {};
    if (!model.economicAllowed || economic.status !== 'COMPUTED' || !economic.output) return null;
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
    return {
      status: 'available',
      delta: currentScore - previousScore,
      previousScore,
      currentScore,
      completedAt: previous.completedAt || null
    };
  }

  function projectUserReport(result, previousSession, assessmentSlug) {
    const current = assertStructuredResult(result);
    const model = modelFor(current, assessmentSlug);
    const axes = measuredAxes(current);
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
        percentage: lowest.percentage
      } : null,
      strength: highest ? {
        axisCode: highest.code,
        axisNameAr: highest.nameAr,
        percentage: highest.percentage
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
    compatibleTrend
  };
});

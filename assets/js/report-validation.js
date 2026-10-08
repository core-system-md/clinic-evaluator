(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MDReportValidation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const USER_FORBIDDEN_KEYS = [
    'consistency',
    'trap',
    'traps',
    'ruleId',
    'inputLineage',
    'provenance',
    'rawScore',
    'maxPossible',
    'weight',
    'leakageIndex'
  ];

  const USER_FORBIDDEN_TERMS = [
    'leakage',
    'trap',
    'ruleid',
    '100 -',
    'cause'
  ];

  function issue(code, message, path) {
    return { code, message, path: path || null };
  }

  function validateUserReport(structured, report, renderedText) {
    const issues = [];

    if (!structured || structured.schemaVersion !== 'P3_STRUCTURED_RESULT_V1' || structured.status !== 'PRODUCTION') {
      issues.push(issue('RESULT_NOT_PRODUCTION', 'User report requires a production Structured Result.'));
      return { ok: false, issues };
    }

    if (!report || report.audience !== 'user') {
      issues.push(issue('PROJECTION_INVALID', 'User report projection is missing or has the wrong audience.'));
      return { ok: false, issues };
    }

    const serialized = JSON.stringify(report).toLowerCase();
    for (const key of USER_FORBIDDEN_KEYS) {
      if (serialized.includes(key.toLowerCase())) {
        issues.push(issue('INTERNAL_FIELD_VISIBLE', 'User report contains a prohibited internal field.', key));
      }
    }
    const text = String(renderedText || '').toLowerCase();
    for (const term of USER_FORBIDDEN_TERMS) {
      if (text.includes(term.toLowerCase())) {
        issues.push(issue('PROHIBITED_CLAIM', 'User report contains prohibited internal/unsupported language.', term));
      }
    }

    const expectedOverall = structured.scores?.overallScore;
    if (report.overall?.value !== expectedOverall) {
      issues.push(issue('OVERALL_MISMATCH', 'Report overall value differs from Structured Result.', 'overall.value'));
    }
    if (report.overall?.bandCode !== (structured.classification?.bandCode || null)) {
      issues.push(issue('BAND_MISMATCH', 'Report band differs from Structured Result.', 'overall.bandCode'));
    }

    const sourceAxes = (structured.scores?.axes || []).filter((axis) =>
      axis?.status === 'measured' && Number.isFinite(axis?.percentage)
    );
    const reportAxes = Array.isArray(report.axes) ? report.axes : [];
    if (reportAxes.length !== sourceAxes.length) {
      issues.push(issue('AXIS_COMPLETENESS', 'Report axis set does not match measured Structured Result axes.', 'axes'));
    }

    const sourceByCode = new Map(sourceAxes.map((axis) => [String(axis.axisCode), axis]));
    for (const axis of reportAxes) {
      const source = sourceByCode.get(String(axis.code));
      if (!source) {
        issues.push(issue('AXIS_UNKNOWN', 'Report contains an axis not present in the Structured Result.', axis.code));
        continue;
      }
      if (axis.percentage !== Number(source.percentage)) {
        issues.push(issue('AXIS_MISMATCH', 'Report axis value differs from Structured Result.', axis.code));
      }
      if (!axis.nameAr) {
        issues.push(issue('AXIS_TEMPLATE_INCOMPLETE', 'Report axis is missing its display name.', axis.code));
      }
    }

    const expectedAvailableKpis = new Set(
      (structured.kpis || [])
        .filter((kpi) => kpi.status === 'available' && Number.isFinite(kpi.value))
        .map((kpi) => String(kpi.kpiCode))
    );
    const actualKpis = Array.isArray(report.kpis) ? report.kpis : [];
    for (const kpi of actualKpis) {
      if (!expectedAvailableKpis.has(String(kpi.code))) {
        issues.push(issue('KPI_INELIGIBLE', 'Report includes a KPI that is not available for user presentation.', kpi.code));
        continue;
      }
      const source = structured.kpis.find((item) => String(item.kpiCode) === String(kpi.code));
      if (!source || Number(source.value) !== Number(kpi.value)) {
        issues.push(issue('KPI_MISMATCH', 'Report KPI value differs from Structured Result.', kpi.code));
      }
    }

    if (actualKpis.length !== expectedAvailableKpis.size) {
      issues.push(issue('KPI_COMPLETENESS', 'Report KPI projection does not match the available KPI set.', 'kpis'));
    }

    const economic = report.economicOpportunity;
    const sourceEconomic = structured.economics || {};
    if (economic === null) {
      if (sourceEconomic.status === 'COMPUTED' && sourceEconomic.output) {
        issues.push(issue('ECONOMIC_MISSING', 'Computed Economic Opportunity was omitted from the report.'));
      }
    } else {
      if (sourceEconomic.status !== 'COMPUTED' || !sourceEconomic.output) {
        issues.push(issue('ECONOMIC_INELIGIBLE', 'Economic Opportunity is shown without a computed Structured Result.'));
      } else {
        if (Number(economic.value) !== Number(sourceEconomic.output.value)) {
          issues.push(issue('ECONOMIC_MISMATCH', 'Economic value differs from Structured Result.', 'economicOpportunity.value'));
        }
        if (economic.unit !== 'currency') {
          issues.push(issue('ECONOMIC_UNIT', 'Economic output must declare currency units.', 'economicOpportunity.unit'));
        }
        if (Number(economic.visitsPerYear) !== Number(sourceEconomic.output.assumptions?.visitsPerYear)) {
          issues.push(issue('ECONOMIC_VISITS', 'Annual visit assumption differs from Structured Result.', 'economicOpportunity.visitsPerYear'));
        }
        if (Number(economic.referralPercentage) !== Number(sourceEconomic.output.assumptions?.referralPercentage)) {
          issues.push(issue('ECONOMIC_REFERRAL', 'Referral assumption differs from Structured Result.', 'economicOpportunity.referralPercentage'));
        }
        if (!(Number.isFinite(economic.visitsPerYear) && economic.visitsPerYear > 0)) {
          issues.push(issue('ECONOMIC_VISITS_INVALID', 'Annual visit assumption must be positive.', 'economicOpportunity.visitsPerYear'));
        }
        if (!(Number.isFinite(economic.referralPercentage) && economic.referralPercentage >= 0 && economic.referralPercentage < 100)) {
          issues.push(issue('ECONOMIC_REFERRAL_INVALID', 'Referral assumption must be between 0% and below 100%.', 'economicOpportunity.referralPercentage'));
        }
      }
    }

    if (!report.coverage || !['FULL', 'PARTIAL', 'UNKNOWN'].includes(report.coverage.status)) {
      issues.push(issue('COVERAGE_INVALID', 'Coverage status is missing or invalid.', 'coverage.status'));
    }
    if (report.coverage?.ratio !== null && !(Number.isFinite(report.coverage.ratio) && report.coverage.ratio >= 0 && report.coverage.ratio <= 1)) {
      issues.push(issue('COVERAGE_RATIO_INVALID', 'Coverage ratio must be between 0 and 1.', 'coverage.ratio'));
    }

    if (report.trend?.status === 'available') {
      if (!Number.isFinite(report.trend.delta) || !Number.isFinite(report.trend.previousScore) || !Number.isFinite(report.trend.currentScore)) {
        issues.push(issue('TREND_INVALID', 'Available trend must contain numeric comparison values.', 'trend'));
      }
    } else if (report.trend && report.trend.delta !== undefined) {
      issues.push(issue('TREND_UNAVAILABLE_WITH_DATA', 'Unavailable trend must not expose comparison data.', 'trend'));
    }

    if (!report.assessment?.familyId || !report.assessment?.version) {
      issues.push(issue('TEMPLATE_METADATA', 'Report assessment identity is incomplete.', 'assessment'));
    }

    return { ok: issues.length === 0, issues };
  }

  function validateAdminReport(structured, report) {
    const issues = [];
    if (!structured || structured.schemaVersion !== 'P3_STRUCTURED_RESULT_V1' || structured.status !== 'PRODUCTION') {
      issues.push(issue('RESULT_NOT_PRODUCTION', 'Admin report requires a production Structured Result.'));
    }
    if (!report || report.audience !== 'admin') {
      issues.push(issue('PROJECTION_INVALID', 'Admin report projection is missing or has the wrong audience.'));
    }
    if (report?.identity?.resultId !== structured?.identity?.resultId) {
      issues.push(issue('IDENTITY_MISMATCH', 'Admin report identity differs from Structured Result.', 'identity.resultId'));
    }
    if (report?.provenance?.assessmentConfigDigest !== structured?.provenance?.assessmentConfigDigest) {
      issues.push(issue('PROVENANCE_MISMATCH', 'Admin report provenance differs from Structured Result.', 'provenance.assessmentConfigDigest'));
    }
    if (!Array.isArray(report?.consistency?.findings)) {
      issues.push(issue('CONSISTENCY_MISSING', 'Admin report must preserve consistency evidence.', 'consistency.findings'));
    }
    return { ok: issues.length === 0, issues };
  }

  return {
    USER_FORBIDDEN_KEYS,
    validateUserReport,
    validateAdminReport
  };
});

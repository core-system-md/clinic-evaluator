(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MDReportValidation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const USER_FORBIDDEN_KEYS = [
    'consistency', 'criticality', 'trap', 'traps', 'ruleId',
    'inputLineage', 'provenance', 'rawScore', 'maxPossible',
    'weight', 'leakageIndex', 'scoringEngineVersion',
    'scoringContractVersion', 'assessmentConfigDigest'
  ];

  const USER_FORBIDDEN_TERMS = [
    'leakage', 'trap', 'ruleid', '100 -', '100−',
    'score effect', 'score-effect'
  ];

  function issue(code, message, path = null) {
    return { code, message, path };
  }

  function validateUserReport(source, report, renderedText = '') {
    const issues = [];

    if (!source || source.schemaVersion !== 'P3_REPORT_SOURCE_V1' || source.status !== 'READY_FOR_USER_REPORT') {
      return { ok: false, issues: [issue('REPORT_SOURCE_INVALID', 'User report requires the approved public report source.')] };
    }
    if (!source.assessment?.slug || !source.assessment?.version) {
      issues.push(issue('SOURCE_IDENTITY_INCOMPLETE', 'Public report source assessment identity is incomplete.', 'assessment'));
    }
    if (!report || report.audience !== 'user') {
      return { ok: false, issues: [issue('PROJECTION_INVALID', 'User report projection is invalid.')] };
    }

    const sourceSerialized = JSON.stringify(source).toLowerCase();
    for (const key of USER_FORBIDDEN_KEYS) {
      if (sourceSerialized.includes(key.toLowerCase())) {
        issues.push(issue('INTERNAL_FIELD_VISIBLE', 'Public report source contains a prohibited internal field.', key));
      }
    }

    const serialized = JSON.stringify(report).toLowerCase();
    for (const key of USER_FORBIDDEN_KEYS) {
      if (serialized.includes(key.toLowerCase())) {
        issues.push(issue('INTERNAL_FIELD_VISIBLE', 'User projection contains a prohibited internal field.', key));
      }
    }

    const text = String(renderedText || '').toLowerCase();
    for (const term of USER_FORBIDDEN_TERMS) {
      if (text.includes(term.toLowerCase())) {
        issues.push(issue('PROHIBITED_LANGUAGE', 'Rendered user report contains prohibited internal language.', term));
      }
    }

    if (report.overall?.value !== source.overall?.value) {
      issues.push(issue('OVERALL_MISMATCH', 'Overall value differs from public report source.', 'overall.value'));
    }
    if (report.overall?.bandCode !== (source.overall?.bandCode || null)) {
      issues.push(issue('BAND_MISMATCH', 'Band differs from public report source.', 'overall.bandCode'));
    }
    if (report.assessment?.slug !== source.assessment?.slug ||
        Number(report.assessment?.version) !== Number(source.assessment?.version)) {
      issues.push(issue('IDENTITY_MISMATCH', 'Report assessment identity differs from public report source.', 'assessment'));
    }

    const sourceAxes = (source.axes || []).filter(
      axis => axis?.status === 'measured' && Number.isFinite(axis?.percentage)
    );
    const reportAxes = Array.isArray(report.axes) ? report.axes : [];
    if (reportAxes.length !== sourceAxes.length) {
      issues.push(issue('AXIS_COMPLETENESS', 'Report axes do not match measured Structured Result axes.', 'axes'));
    }
    const sourceByCode = new Map(sourceAxes.map(axis => [String(axis.axisCode), axis]));
    for (const axis of reportAxes) {
      const source = sourceByCode.get(String(axis.code));
      if (!source) {
        issues.push(issue('AXIS_UNKNOWN', 'Report contains an unknown axis.', axis.code));
        continue;
      }
      if (Number(axis.percentage) !== Number(source.percentage)) {
        issues.push(issue('AXIS_MISMATCH', 'Report axis percentage differs from Structured Result.', axis.code));
      }
      if (!axis.nameAr) {
        issues.push(issue('AXIS_NAME_MISSING', 'Measured report axis has no display name.', axis.code));
      }
    }

    const expectedKpis = new Map(
      (source.kpis || [])
        .filter(kpi => kpi.status === 'available' && Number.isFinite(kpi.value))
        .map(kpi => [String(kpi.kpiCode), Number(kpi.value)])
    );
    const actualKpis = Array.isArray(report.kpis) ? report.kpis : [];
    if (actualKpis.length !== expectedKpis.size) {
      issues.push(issue('KPI_COMPLETENESS', 'User KPI projection does not match available KPI evidence.', 'kpis'));
    }
    for (const kpi of actualKpis) {
      const expected = expectedKpis.get(String(kpi.code));
      if (expected === undefined) {
        issues.push(issue('KPI_INELIGIBLE', 'User report contains an unavailable or ineligible KPI.', kpi.code));
      } else if (Number(kpi.value) !== expected) {
        issues.push(issue('KPI_MISMATCH', 'KPI value differs from Structured Result.', kpi.code));
      }
    }

    const sourceEconomic = source.economics || {};
    const economic = report.economicOpportunity;
    if (economic) {
      if (sourceEconomic.status !== 'COMPUTED' || !sourceEconomic.output) {
        issues.push(issue('ECONOMIC_INELIGIBLE', 'Economic Opportunity is shown without computed evidence.', 'economicOpportunity'));
      } else {
        const assumptions = sourceEconomic.output.assumptions || {};
        if (Number(economic.value) !== Number(sourceEconomic.output.value)) {
          issues.push(issue('ECONOMIC_MISMATCH', 'Economic value differs from Structured Result.', 'economicOpportunity.value'));
        }
        if (economic.unit !== 'currency') {
          issues.push(issue('ECONOMIC_UNIT', 'Economic output must declare currency units.', 'economicOpportunity.unit'));
        }
        if (Number(economic.visitsPerYear) !== Number(assumptions.visitsPerYear) ||
            !Number.isFinite(economic.visitsPerYear) || economic.visitsPerYear <= 0) {
          issues.push(issue('ECONOMIC_ANNUAL_VISITS', 'Economic output must preserve a positive annual visit assumption.', 'economicOpportunity.visitsPerYear'));
        }
        if (Number(economic.referralPercentage) !== Number(assumptions.referralPercentage) ||
            !Number.isFinite(economic.referralPercentage) ||
            economic.referralPercentage < 0 || economic.referralPercentage > 100) {
          issues.push(issue('ECONOMIC_REFERRAL', 'Economic output must preserve the referral assumption from Structured Result.', 'economicOpportunity.referralPercentage'));
        }
      }
    } else if (sourceEconomic.status === 'COMPUTED' && sourceEconomic.output) {
      issues.push(issue('ECONOMIC_MISSING', 'Computed Economic Opportunity was omitted from the user projection.', 'economicOpportunity'));
    }

    if (!report.coverage || !['FULL', 'PARTIAL', 'UNKNOWN'].includes(report.coverage.status)) {
      issues.push(issue('COVERAGE_INVALID', 'Coverage status is invalid.', 'coverage.status'));
    }
    if (report.coverage?.ratio !== null &&
        !(Number.isFinite(report.coverage?.ratio) && report.coverage.ratio >= 0 && report.coverage.ratio <= 1)) {
      issues.push(issue('COVERAGE_RATIO_INVALID', 'Coverage ratio is outside 0..1.', 'coverage.ratio'));
    }

    if (report.trend?.status === 'available') {
      if (![report.trend.previousScore, report.trend.currentScore, report.trend.delta].every(Number.isFinite)) {
        issues.push(issue('TREND_INVALID', 'Available trend must contain numeric comparison values.', 'trend'));
      }
    } else if (report.trend && ('delta' in report.trend || 'previousScore' in report.trend || 'currentScore' in report.trend)) {
      issues.push(issue('TREND_FAIL_CLOSED', 'Unavailable trend must not expose comparison values.', 'trend'));
    }

    return { ok: issues.length === 0, issues };
  }

  function validateAdminReport(structured, report) {
    const issues = [];
    if (!structured || structured.schemaVersion !== 'P3_STRUCTURED_RESULT_V1' || structured.status !== 'PRODUCTION') {
      issues.push(issue('RESULT_NOT_PRODUCTION', 'Admin report requires a production Structured Result.'));
    }
    if (!report || report.audience !== 'admin') {
      issues.push(issue('PROJECTION_INVALID', 'Admin report projection is invalid.'));
    }
    if (report?.identity?.resultId !== structured?.identity?.resultId) {
      issues.push(issue('IDENTITY_MISMATCH', 'Admin projection does not preserve result identity.', 'identity.resultId'));
    }
    if (report?.provenance?.assessmentConfigDigest !== structured?.provenance?.assessmentConfigDigest) {
      issues.push(issue('PROVENANCE_MISMATCH', 'Admin projection does not preserve provenance.', 'provenance.assessmentConfigDigest'));
    }
    if (!Array.isArray(report?.consistency?.findings)) {
      issues.push(issue('CONSISTENCY_MISSING', 'Admin projection must preserve consistency evidence.', 'consistency.findings'));
    }
    return { ok: issues.length === 0, issues };
  }

  function assertValidUserReport(source, report, renderedText = '') {
    const result = validateUserReport(source, report, renderedText);
    if (!result.ok) {
      const detail = result.issues.map(item => item.code + (item.path ? ':' + item.path : '')).join(', ');
      throw new Error('REPORT_VALIDATION_FAILED: ' + detail);
    }
    return report;
  }

  return {
    USER_FORBIDDEN_KEYS,
    USER_FORBIDDEN_TERMS,
    validateUserReport,
    validateAdminReport,
    assertValidUserReport
  };
});

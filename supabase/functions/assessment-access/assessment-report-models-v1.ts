/**
 * Final report-model boundary.
 *
 * This file defines report semantics per assessment family. It is not a
 * scoring source and must never calculate a score.
 */

export type AssessmentReportModel = {
  modelCode: string;
  familySlug: string;
  finalVersion: 1;
  purpose: string;
  supportedKpis: string[];
  economicOpportunity: "supported" | "not_supported";
  axisMeaning: "assessment_specific";
};

export const ASSESSMENT_REPORT_MODELS: Record<string, AssessmentReportModel> = {
  "admin-reception-assessment": {
    modelCode: "ADMIN_RECEPTION_REPORT_V1",
    familySlug: "admin-reception-assessment",
    finalVersion: 1,
    purpose: "Evaluate front-desk, scheduling, coordination, communication, and administrative operating performance.",
    supportedKpis: ["EVI", "NPI", "PLI", "PRP", "PSI", "RRI", "TAP", "TCI", "TFI"],
    economicOpportunity: "supported",
    axisMeaning: "assessment_specific",
  },
  "clinic-performance": {
    modelCode: "CLINIC_PERFORMANCE_REPORT_V1",
    familySlug: "clinic-performance",
    finalVersion: 1,
    purpose: "Evaluate clinic process maturity, patient engagement, and relationship sustainability.",
    supportedKpis: ["EVI", "NPI", "PLI", "PRP", "PSI", "TAP", "TCI", "TFI"],
    economicOpportunity: "supported",
    axisMeaning: "assessment_specific",
  },
  "comprehensive-clinic-assessment": {
    modelCode: "COMPREHENSIVE_CLINIC_REPORT_V1",
    familySlug: "comprehensive-clinic-assessment",
    finalVersion: 1,
    purpose: "Evaluate the clinic as an integrated system across operations, patient journey, treatment conversion, follow-up, team, and growth.",
    supportedKpis: ["EVI", "NPI", "PLI", "PRP", "PSI", "TAP", "TCI", "TFI"],
    economicOpportunity: "not_supported",
    axisMeaning: "assessment_specific",
  },
  "medical-team-assessment": {
    modelCode: "MEDICAL_TEAM_REPORT_V1",
    familySlug: "medical-team-assessment",
    finalVersion: 1,
    purpose: "Evaluate medical communication, professionalism, clinical/regulatory commitment, and teamwork.",
    supportedKpis: ["EVI", "NPI", "PLI", "PRP", "PSI", "TAP", "TCI", "TFI"],
    economicOpportunity: "supported",
    axisMeaning: "assessment_specific",
  },
  "patient-journey": {
    modelCode: "PATIENT_JOURNEY_REPORT_V1",
    familySlug: "patient-journey",
    finalVersion: 1,
    purpose: "Evaluate the patient journey from first impression and emotional safety through consultation, treatment commitment, continuity, and loyalty.",
    supportedKpis: ["EVI", "NPI", "PLI", "PRP", "PSI", "TAP", "TCI", "TFI"],
    economicOpportunity: "supported",
    axisMeaning: "assessment_specific",
  },
};

export function getAssessmentReportModel(
  familySlug: string,
): AssessmentReportModel {
  const model = ASSESSMENT_REPORT_MODELS[familySlug];
  if (!model) throw new Error(`No report model for assessment family: ${familySlug}`);
  return model;
}

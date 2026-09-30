type Option = { value: number; is_trap?: boolean };
type Question = {
  code: string;
  axis_id: string;
  layer?: string;
  impact?: string;
  options: Option[];
};
type Axis = { code: string; weight?: number };
type Trap = {
  question_id: string;
  validates: string;
  target_axis: string;
  penalty_base: number;
  penalty_max: number;
};
type Assessment = {
  axes: Axis[];
  questions: Question[];
  traps: Trap[];
  axis_roles?: Record<string, string>;
  kpi_mappings?: Record<string, Record<string, number>>;
  ev_mappings?: Record<string, number>;
  simulator?: { enabled?: boolean; delta_c_max?: number };
};

const impactMultiplier: Record<string, number> = { high: 1.5, medium: 1, low: 0.5 };

function quartile(score: number) {
  if (score >= 75) return "Q4";
  if (score >= 50) return "Q3";
  if (score >= 25) return "Q2";
  return "Q1";
}

export function calculateAssessment(
  assessment: Assessment,
  answers: Record<string, number>,
  simulatorVars: { flow?: number; ltv?: number } = {},
) {
  const raw: Record<string, { earned: number; maxPossible: number }> = {};

  for (const axis of assessment.axes) {
    raw[axis.code] = { earned: 0, maxPossible: 0 };
  }

  for (const q of assessment.questions.filter((x) => x.layer !== "B")) {
    const value = answers[q.code];
    if (value === undefined) continue;
    const multiplier = impactMultiplier[q.impact || "medium"] || 1;
    if (!raw[q.axis_id]) raw[q.axis_id] = { earned: 0, maxPossible: 0 };
    raw[q.axis_id].earned += value * multiplier;
    raw[q.axis_id].maxPossible += 100 * multiplier;
  }

  const penalties: Record<string, number> = {};
  const triggeredTraps: Array<{ name: string; penaltyApplied: number }> = [];

  for (const trap of assessment.traps || []) {
    const target = answers[trap.validates];
    const validator = answers[trap.question_id];
    if (target === undefined || validator === undefined || target !== 100) continue;
    const severity = Math.abs(target - validator) / 100;
    const penaltyPercent = trap.penalty_base + severity * (trap.penalty_max - trap.penalty_base);
    const axisEarned = raw[trap.target_axis]?.earned || 0;
    const penalty = axisEarned * (penaltyPercent / 100);
    penalties[trap.target_axis] = (penalties[trap.target_axis] || 0) + penalty;
    triggeredTraps.push({ name: trap.question_id, penaltyApplied: Math.round(penaltyPercent) });
  }

  const axisScores: Record<string, number> = {};
  for (const axis of assessment.axes) {
    const r = raw[axis.code] || { earned: 0, maxPossible: 0 };
    const penalty = penalties[axis.code] || 0;
    axisScores[axis.code] = r.maxPossible === 0
      ? 0
      : Math.round(Math.max(0, Math.min(100, ((r.earned - penalty) / r.maxPossible) * 100)));
  }

  const totalWeight = assessment.axes.reduce((sum, axis) => sum + (axis.weight || 1), 0);
  const weightedSum = assessment.axes.reduce((sum, axis) => sum + axisScores[axis.code] * (axis.weight || 1), 0);
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  const roleScores: Record<string, number> = {};
  const available = Object.values(axisScores);
  const average = available.length ? available.reduce((a, b) => a + b, 0) / available.length : 50;
  for (const [axisId, score] of Object.entries(axisScores)) {
    const role = assessment.axis_roles?.[axisId];
    if (!role) continue;
    roleScores[role] = roleScores[role] === undefined ? score : (roleScores[role] + score) / 2;
  }
  const roles = ["TRUST", "COMMUNICATION", "CONVERSION", "RETENTION", "LOYALTY", "SCHEDULING", "RECEPTION", "ADMIN", "COORDINATION", "JOURNEY", "OPERATIONS", "TEAM", "GROWTH", "PROFESSIONALISM", "TEAMWORK"];
  for (const role of roles) if (roleScores[role] === undefined) roleScores[role] = average;

  const kpis: Record<string, number> = {};
  for (const [code, mapping] of Object.entries(assessment.kpi_mappings || {})) {
    let weighted = 0;
    let weight = 0;
    for (const [role, w] of Object.entries(mapping)) {
      weighted += (roleScores[role] || 0) * w;
      weight += w;
    }
    kpis[code] = weight > 0 ? Math.round(weighted / weight) : 0;
  }

  let ev = null;
  if (assessment.simulator?.enabled) {
    const flow = simulatorVars.flow || 50;
    const ltv = simulatorVars.ltv || 5000;
    const deltaMax = assessment.simulator.delta_c_max || 0.35;
    let weighted = 0;
    let weight = 0;
    for (const [role, w] of Object.entries(assessment.ev_mappings || {})) {
      weighted += (roleScores[role] || 0) * w;
      weight += w;
    }
    const normalized = weight ? weighted / weight : 0;
    const base = (normalized / 100) * deltaMax * flow * ltv;
    ev = { currentEV: Math.round(base * 0.7), potentialEV: Math.round(base * 1.25), gap: Math.round(base * 0.55) };
  }

  return {
    overallScore,
    classification: quartile(overallScore),
    leakageIndex: Math.round(100 - overallScore),
    axisScores,
    kpis,
    ev,
    traps: triggeredTraps,
  };
}

/**
 * ============================================================
 * Centralized Assessment Engine v3.0 — CLEAN VERSION
 * Generic Engine — يقرأ config.json وينفذ المنطق بالكامل
 * Compatible with app.js v5.0
 * ============================================================
 * CHANGELOG:
 *   - SupabaseClient removed (moved to supabase-client.js)
 *   - Engine focuses on calculation logic only
 *   - 12 validation checks preserved
 * ============================================================
 */

class AssessmentEngine {
  constructor(config, reportTexts) {
    this.config = config;
    this.reportTexts = reportTexts || {};
    this.currentAssessment = null;
    this.answers = new Map();
  }

  loadAssessment(typeSlug) {
    if (this.config.assessment_types && this.config.assessment_types[typeSlug]) {
      this.currentAssessment = this.config.assessment_types[typeSlug];
    } else {
      this.currentAssessment = this.config;
    }
    this.validateConfig();
    this.answers.clear();
    return this.currentAssessment;
  }

  validateConfig() {
    const cfg = this.currentAssessment || this.config;
    const errors = [];
    const axes = cfg.axes || [];
    const questions = cfg.questions || [];
    const traps = cfg.traps || [];
    const validAxisIds = new Set(axes.map(a => a.id));
    const validQuestionIds = new Set(questions.map(q => q.id));
    const validImpacts = new Set(['high', 'medium', 'low']);
    const validLayers = new Set(['A', 'B']);
    const validValues = new Set([0, 40, 100]);

    for (const q of questions) {
      if (!validAxisIds.has(q.axis_id)) errors.push(`[V01] INVALID_AXIS_ID: "${q.axis_id}" in "${q.id}"`);
      if (!validImpacts.has(q.impact)) errors.push(`[V02] INVALID_IMPACT: "${q.impact}" in "${q.id}"`);
      if (!validLayers.has(q.layer)) errors.push(`[V03] INVALID_LAYER: "${q.layer}" in "${q.id}"`);
      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (!validValues.has(opt.value)) errors.push(`[V04] INVALID_VALUE: ${opt.value} in "${q.id}"`);
        }
      }
    }
    for (const trap of traps) {
      if (!validQuestionIds.has(trap.question_id)) errors.push(`[V05] INVALID_TRAP: "${trap.question_id}"`);
      if (!validQuestionIds.has(trap.validates)) errors.push(`[V06] INVALID_TRAP: validates "${trap.validates}"`);
      if (!validAxisIds.has(trap.target_axis)) errors.push(`[V07] INVALID_TRAP_AXIS: "${trap.target_axis}"`);
      const pb = trap.penalty_base, pm = trap.penalty_max;
      if (typeof pb !== 'number' || pb < 0 || pb > 100 || typeof pm !== 'number' || pm < 0 || pm > 100 || pb > pm) {
        errors.push(`[V09] INVALID_PENALTY: ${pb}-${pm}`);
      }
    }
    for (const q of questions) {
      if (q.layer === 'B' && (!q.trap_for || !Array.isArray(q.trap_for) || q.trap_for.length === 0)) {
        errors.push(`[V08] ORPHAN_TRAP: "${q.id}"`);
      }
    }
    const questionIds = questions.map(q => q.id);
    const duplicates = questionIds.filter((item, index) => questionIds.indexOf(item) !== index);
    if (duplicates.length > 0) errors.push(`[V11] DUPLICATES: ${[...new Set(duplicates)].join(', ')}`);
    for (const axis of axes) {
      if (!questions.filter(q => q.axis_id === axis.id && q.layer === 'A').length) {
        errors.push(`[V12] EMPTY_AXIS: "${axis.id}"`);
      }
    }
    if (errors.length > 0) {
      console.error('[ENGINE] VALIDATION FAILED');
      errors.forEach(e => console.error(`  ${e}`));
      throw new Error(`Config validation failed: ${errors.length} error(s)`);
    }
    console.log('[ENGINE] ✅ Validation passed');
  }

  calculateRawScores(answers) {
    const cfg = this.currentAssessment || this.config;
    const rawScores = {};
    for (const axis of cfg.axes) {
      const axisQuestions = cfg.questions.filter(q => q.axis_id === axis.id && q.layer === 'A');
      let earned = 0, maxPossible = 0;
      for (const q of axisQuestions) {
        const answerValue = answers[q.id];
        if (answerValue === undefined || answerValue === null) continue;
        const multiplier = this.getMultiplier(q.impact);
        earned += answerValue * multiplier;
        maxPossible += 100 * multiplier;
      }
      rawScores[axis.id] = { earned, maxPossible };
    }
    return rawScores;
  }

  applyPenalties(answers, rawScores) {
    const cfg = this.currentAssessment || this.config;
    const penalties = {};
    let totalPenalty = 0;
    for (const trap of cfg.traps || []) {
      const targetVal = answers[trap.validates];
      const validatorVal = answers[trap.question_id];
      if (targetVal === undefined || validatorVal === undefined) continue;
      if (targetVal !== 100) continue;
      const severity = Math.abs(targetVal - validatorVal) / 100;
      const penaltyPercent = trap.penalty_base + (severity * (trap.penalty_max - trap.penalty_base));
      const axisEarned = rawScores[trap.target_axis].earned;
      const axisPenalty = axisEarned * (penaltyPercent / 100);
      penalties[trap.target_axis] = (penalties[trap.target_axis] || 0) + axisPenalty;
      totalPenalty += axisPenalty;
    }
    return { penalties, totalPenalty };
  }

  calculateFinalScores(rawScores, penalties) {
    const cfg = this.currentAssessment || this.config;
    const finalScores = {};
    for (const axis of cfg.axes) {
      const raw = rawScores[axis.id];
      const penalty = penalties[axis.id] || 0;
      if (raw.maxPossible === 0) { finalScores[axis.id] = 0; continue; }
      let score = ((raw.earned - penalty) / raw.maxPossible) * 100;
      score = Math.max(0, Math.min(100, score));
      finalScores[axis.id] = Math.round(score);
    }
    return finalScores;
  }

  calculateGlobal(finalScores) {
    const cfg = this.currentAssessment || this.config;
    const totalWeight = cfg.axes.reduce((sum, axis) => sum + (axis.weight || 1.0), 0);
    const weightedSum = cfg.axes.reduce((sum, axis) => sum + (finalScores[axis.id] * (axis.weight || 1.0)), 0);
    const globalScore = weightedSum / totalWeight;
    const quartiles = {};
    for (const axis of cfg.axes) quartiles[axis.id] = this.getQuartile(finalScores[axis.id]).q;
    const overallQ = this.getQuartile(globalScore).q;
    quartiles.overall = overallQ;
    return {
      globalScore: Math.round(globalScore),
      leakageIndex: Math.round(100 - globalScore),
      axisScores: finalScores,
      quartiles: quartiles,
      totalEarned: weightedSum,
      totalWeight: totalWeight
    };
  }

  calculateKPIs(finalScores) {
    const ids = Object.keys(finalScores);
    const getScore = (id) => finalScores[id] || 0;
    const a1 = ids.find(id => id.includes('1')) || ids[0];
    const a2 = ids.find(id => id.includes('2')) || ids[1];
    const a3 = ids.find(id => id.includes('3')) || ids[2];
    const a4 = ids.find(id => id.includes('4')) || ids[3];
    const a5 = ids.find(id => id.includes('5')) || ids[4];
    return {
      TFI: Math.round((getScore(a1) + getScore(a2)) / 2),
      TAP: Math.round((getScore(a3) + getScore(a4)) / 2),
      PRP: Math.round(getScore(a5)),
      PLI: Math.round(getScore(a5))
    };
  }

  calculateEV(axisScores, simulatorVars) {
    const cfg = this.currentAssessment || this.config;
    if (!cfg.simulator || cfg.simulator.enabled !== true) return null;
    const ids = Object.keys(axisScores);
    const a3 = ids.find(id => id.includes('3')) || ids[2];
    const a4 = ids.find(id => id.includes('4')) || ids[3];
    const a5 = ids.find(id => id.includes('5')) || ids[4];
    const deltaCMax = cfg.simulator.delta_c_max || 0.35;
    const flow = simulatorVars?.flow || 50;
    const ltv = simulatorVars?.ltv || 5000;
    if (deltaCMax <= 0 || flow <= 0 || ltv <= 0) return null;
    const weightedScore = (axisScores[a3] || 0) * 0.4 + (axisScores[a4] || 0) * 0.4 + (axisScores[a5] || 0) * 0.2;
    const deltaC = (weightedScore / 100) * deltaCMax;
    const EV_base = deltaC * flow * ltv;
    return { currentEV: Math.round(EV_base * 0.7), potentialEV: Math.round(EV_base * 1.25), gap: Math.round(EV_base * 0.55) };
  }

  getQuartile(score) {
    if (score >= 75) return { q: 'Q4', label: 'أداء متميز', color: '#2A6F5D' };
    if (score >= 50) return { q: 'Q3', label: 'أداء مستقر', color: '#5C6B73' };
    if (score >= 25) return { q: 'Q2', label: 'تذبذب ملحوظ', color: '#C67D47' };
    return { q: 'Q1', label: 'فجوة هيكلية حرجة', color: '#A33B3B' };
  }

  getMultiplier(impact) {
    return { high: 1.5, medium: 1.0, low: 0.5 }[impact] || 1.0;
  }

  setAnswer(questionId, value) {
    const cfg = this.currentAssessment || this.config;
    const q = cfg.questions.find(q => q.id === questionId);
    if (!q) throw new Error(`Question '${questionId}' not found`);
    this.answers.set(questionId, { questionId: q.id, axisId: q.axis_id, questionText: q.text, value: parseInt(value), isTrap: q.layer === 'B', answeredAt: new Date().toISOString() });
  }

  getAnswer(questionId) { return this.answers.get(questionId) || null; }

  detectTraps() {
    const answers = {};
    this.answers.forEach((ans, qid) => { answers[qid] = ans.value; });
    const rawScores = this.calculateRawScores(answers);
    const { penalties } = this.applyPenalties(answers, rawScores);
    const cfg = this.currentAssessment || this.config;
    const triggered = [];
    for (const trap of cfg.traps || []) {
      const targetVal = answers[trap.validates];
      const validatorVal = answers[trap.question_id];
      if (targetVal === undefined || validatorVal === undefined) continue;
      if (targetVal !== 100) continue;
      const severity = Math.abs(targetVal - validatorVal) / 100;
      const penaltyPercent = trap.penalty_base + (severity * (trap.penalty_max - trap.penalty_base));
      triggered.push({ name: trap.name, message: trap.message_ar || trap.message, penaltyApplied: Math.round(penaltyPercent) });
    }
    return triggered;
  }

  evaluate(answers, assessmentKey, metadata) {
    if (assessmentKey) this.loadAssessment(assessmentKey);
    for (const [qid, val] of Object.entries(answers)) this.setAnswer(qid, val);
    const rawScores = this.calculateRawScores(answers);
    const { penalties, totalPenalty } = this.applyPenalties(answers, rawScores);
    const finalScores = this.calculateFinalScores(rawScores, penalties);
    const globalResult = this.calculateGlobal(finalScores);
    const kpis = this.calculateKPIs(finalScores);
    const traps = this.detectTraps();
    const evSimulator = this.calculateEV(finalScores, metadata);
    return { classification: globalResult.quartiles.overall, overallScore: globalResult.globalScore, axisScores: finalScores, kpis: kpis, traps: traps, evSimulator: evSimulator };
  }

  calculateScores() {
    const answers = {};
    this.answers.forEach((ans, qid) => { answers[qid] = ans.value; });
    const rawScores = this.calculateRawScores(answers);
    const { penalties } = this.applyPenalties(answers, rawScores);
    const finalScores = this.calculateFinalScores(rawScores, penalties);
    const globalResult = this.calculateGlobal(finalScores);
    const scores = [];
    const cfg = this.currentAssessment || this.config;
    for (const axis of cfg.axes) {
      scores.push({ axisId: axis.id, axisNameAr: axis.name_ar, axisNameEn: axis.name_en, weight: axis.weight, percentage: finalScores[axis.id], grade: this.getQuartile(finalScores[axis.id]).q });
    }
    return { axes: scores, overall: { percentage: globalResult.globalScore, grade: globalResult.quartiles.overall, title: this.getQuartile(globalResult.globalScore).label, body: `الدرجة الكلية: ${globalResult.globalScore}%` } };
  }

  buildReport(answers, leadData = {}, simulatorVars = {}) {
    const rawScores = this.calculateRawScores(answers);
    const { penalties } = this.applyPenalties(answers, rawScores);
    const finalScores = this.calculateFinalScores(rawScores, penalties);
    const globalResult = this.calculateGlobal(finalScores);
    const evResult = this.calculateEV(finalScores, simulatorVars);
    const globalQ = this.getQuartile(globalResult.globalScore).q;
    const qData = this.getQuartile(globalResult.globalScore);
    return { _debug: { rawScores, penalties, finalScores, globalResult, evResult }, global: { score: globalResult.globalScore, quartile: globalQ, label: qData.label, color: qData.color }, leakage: { index: globalResult.leakageIndex }, axes: finalScores, ev: evResult };
  }
}

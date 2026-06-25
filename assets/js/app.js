/**
 * Clinic Evaluator — app.js (FIXED v4.1)
 * Constitution v4.0 Compliant
 * Fixes: Corrected fetch paths for JSON files (was loading 404 HTML instead of JSON)
 */

class ClinicEvaluatorApp {
  constructor() {
    this.config = null;
    this.texts = null;
    this.currentAssessmentKey = null;
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.metadata = {};
    this.assessment = null;
    this.questions = [];
    this.useOpt = false;
  }

  async init() {
    console.log('[app.js] init started');
    try {
      await Promise.all([this.loadConfig(), this.loadTexts()]);
      console.log('[app.js] config & texts loaded');
      this.useOpt = document.getElementById('lead-specialty') !== null;
      console.log('[app.js] useOpt:', this.useOpt);
      this.setupLeadForm();
      this.setupNavigation();
      this.setupEVSimulator();
      this.setupPrint();
      if (window.preSelectedAssessment) {
        this.assessment = this.config.assessment_types?.[window.preSelectedAssessment];
        if (this.assessment) {
          this.questions = this.assessment.questions;
          console.log('[app.js] assessment pre-loaded, questions:', this.questions.length);
        }
      }
    } catch (err) {
      console.error('[app.js] Init failed:', err);
      this.showError(this.t('errors.init_failed'));
    }
  }

  /* ============================================================
     FIX #1: Corrected JSON fetch paths
     app.js lives in assets/js/  →  JSON files are in data/
     Relative path must go up two levels: ../../data/
     ============================================================ */
  async loadConfig() {
    const res = await fetch('../../data/config.json');
    if (!res.ok) throw new Error('data/config.json not found (HTTP ' + res.status + ')');
    this.config = await res.json();
  }

  async loadTexts() {
    const res = await fetch('../../data/report_texts.json');
    if (!res.ok) throw new Error('data/report_texts.json not found (HTTP ' + res.status + ')');
    this.texts = await res.json();
  }

  t(path, vars = {}) {
    const keys = path.split('.');
    let val = this.texts;
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) return path;
    }
    if (typeof val !== 'string') return val;
    return val.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  setupLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.collectMetadata();
      this.startAssessment();
    });
  }

  collectMetadata() {
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    this.metadata = {
      name: getVal('lead-name'),
      email: getVal('lead-email'),
      phone: getVal('lead-phone'),
      clinic: getVal('lead-clinic'),
      country: getVal('lead-country'),
      specialty: getVal('lead-specialty') || getVal('meta-specialty'),
      years: getVal('lead-years') || getVal('meta-years'),
      team: getVal('lead-staff') || getVal('meta-team')
    };
  }

  startAssessment() {
    this.currentAssessmentKey = window.preSelectedAssessment;
    this.assessment = this.config.assessment_types?.[this.currentAssessmentKey];
    if (!this.assessment) {
      this.showError(this.t('errors.assessment_not_found'));
      return;
    }
    this.questions = this.assessment.questions;
    this.answers = {};
    this.currentQuestionIndex = 0;

    const leadForm = document.getElementById('view-lead-form');
    const assessmentView = document.getElementById('view-assessment');
    if (leadForm) leadForm.classList.add('hidden');
    if (assessmentView) assessmentView.classList.remove('hidden');

    this.renderQuestion();
    this.updateProgress();
    this.updateNavButtons();
  }

  renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;
    const q = this.questions[this.currentQuestionIndex];
    const num = this.currentQuestionIndex + 1;

    if (this.useOpt) {
      container.innerHTML = this.renderOptQuestion(q, num);
    } else {
      container.innerHTML = this.renderLikertQuestion(q, num);
    }
    this.attachOptionHandlers(container, q.id);
  }

  renderOptQuestion(q, num) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    let optsHtml = '';
    q.options.forEach((opt, i) => {
      const letter = letters[i] || '';
      const selected = this.answers[q.id] === opt.value ? 'sel' : '';
      optsHtml += `
        <div class="opt ${selected}" data-value="${opt.value}">
          <span class="opt-letter">${letter}</span>
          <span class="opt-label">${opt.label}</span>
        </div>`;
    });
    return `
      <div class="question-card">
        <div class="question-meta">السؤال ${num} من ${this.questions.length}</div>
        <h3 class="question-text">${q.text}</h3>
        <div class="options-grid">${optsHtml}</div>
      </div>`;
  }

  renderLikertQuestion(q, num) {
    let optsHtml = '';
    q.options.forEach((opt) => {
      const selected = this.answers[q.id] === opt.value ? 'selected' : '';
      optsHtml += `
        <div class="likert-option ${selected}" data-value="${opt.value}">
          <div class="likert-value">${opt.value}</div>
          <div class="likert-label">${opt.label}</div>
        </div>`;
    });
    return `
      <div class="question-card">
        <div class="question-meta">السؤال ${num} من ${this.questions.length}</div>
        <h3 class="question-text">${q.text}</h3>
        <div class="likert-row">${optsHtml}</div>
      </div>`;
  }

  attachOptionHandlers(container, qid) {
    const selector = this.useOpt ? '.opt' : '.likert-option';
    const opts = container.querySelectorAll(selector);
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = parseInt(opt.dataset.value);
        this.answers[qid] = val;
        opts.forEach(o => o.classList.remove('sel', 'selected'));
        opt.classList.add(this.useOpt ? 'sel' : 'selected');
        this.updateProgress();
      });
    });
  }

  setupNavigation() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentQuestionIndex > 0) {
          this.currentQuestionIndex--;
          this.renderQuestion();
          this.updateProgress();
          this.updateNavButtons();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const currentQ = this.questions[this.currentQuestionIndex];
        if (this.answers[currentQ.id] === undefined) {
          this.shakeQuestion();
          return;
        }
        if (this.currentQuestionIndex < this.questions.length - 1) {
          this.currentQuestionIndex++;
          this.renderQuestion();
          this.updateProgress();
          this.updateNavButtons();
        } else {
          this.submitAssessment();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      const assessmentView = document.getElementById('view-assessment');
      if (!assessmentView || assessmentView.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        const nextBtn = document.getElementById('btn-next');
        if (nextBtn && !nextBtn.disabled) nextBtn.click();
      } else if (e.key === 'ArrowLeft') {
        const prevBtn = document.getElementById('btn-prev');
        if (prevBtn && !prevBtn.disabled) prevBtn.click();
      } else if (['1','2','3','4','5'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        const currentQ = this.questions[this.currentQuestionIndex];
        if (currentQ && currentQ.options[idx]) {
          const val = currentQ.options[idx].value;
          this.answers[currentQ.id] = val;
          const container = document.getElementById('question-container');
          const selector = this.useOpt ? '.opt' : '.likert-option';
          const opts = container.querySelectorAll(selector);
          opts.forEach(o => o.classList.remove('sel', 'selected'));
          if (opts[idx]) opts[idx].classList.add(this.useOpt ? 'sel' : 'selected');
          this.updateProgress();
        }
      }
    });
  }

  updateProgress() {
    const total = this.questions.length;
    const done = Object.keys(this.answers).length;
    const pct = Math.round((done / total) * 100);
    const bar = document.getElementById('progress-fill');
    const txt = document.getElementById('progress-text');
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = `${done} من ${total} — ${pct}%`;
  }

  updateNavButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;
    if (nextBtn) {
      const isLast = this.currentQuestionIndex === this.questions.length - 1;
      nextBtn.textContent = isLast ? this.t('ui.buttons.submit') : 'التالي ←';
    }
  }

  shakeQuestion() {
    const card = document.querySelector('.question-card');
    if (card) {
      card.style.animation = 'shake 0.5s ease';
      setTimeout(() => card.style.animation = '', 600);
    }
    this.showError(this.t('errors.missing_answers', { count: 1 }));
  }

  async submitAssessment() {
    const assessmentView = document.getElementById('view-assessment');
    const loadingView = document.getElementById('view-loading');
    if (assessmentView) assessmentView.classList.add('hidden');
    if (loadingView) loadingView.classList.remove('hidden');

    const loadBar = document.getElementById('load-bar');
    const loadStatus = document.getElementById('load-status');
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      if (loadBar) loadBar.style.width = `${progress}%`;
      if (loadStatus) loadStatus.textContent = `${Math.round(progress)}%`;
    }, 200);

    try {
      if (typeof AssessmentEngine === 'undefined') {
        throw new Error('engine.js not loaded');
      }
      this.engine = new AssessmentEngine(this.config);
      const results = this.engine.evaluate(this.answers, this.currentAssessmentKey, this.metadata);
      clearInterval(interval);
      if (loadBar) loadBar.style.width = '100%';
      if (loadStatus) loadStatus.textContent = '100%';
      setTimeout(() => {
        if (loadingView) loadingView.classList.add('hidden');
        this.renderResults(results);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      this.showError(this.t('errors.processing_error'));
      if (loadingView) loadingView.classList.add('hidden');
      if (assessmentView) assessmentView.classList.remove('hidden');
    }
  }

  renderResults(res) {
    const resultsView = document.getElementById('view-results');
    if (resultsView) resultsView.classList.remove('hidden');

    const q = res.classification || 'Q2';
    const qData = this.texts.quartiles[q] || this.texts.quartiles.Q2;
    const score = (res.overallScore ?? 0).toFixed(1);

    const circle = document.getElementById('result-score-circle');
    const scoreVal = document.getElementById('result-score-value');
    const scoreLabel = document.getElementById('result-score-label');
    const title = document.getElementById('result-title');
    const body = document.getElementById('result-body');

    if (circle) circle.style.borderColor = qData.color;
    if (scoreVal) { scoreVal.textContent = score + '%'; scoreVal.style.color = qData.color; }
    if (scoreLabel) scoreLabel.textContent = qData.label;
    if (title) title.textContent = qData.label;
    if (body) body.textContent = `درجتك الكلية: ${score} من 100`;

    const axesContainer = document.getElementById('axes-scores');
    if (axesContainer && res.axisScores) {
      axesContainer.innerHTML = '';
      const a = this.assessment;
      Object.entries(res.axisScores).forEach(([aid, score]) => {
        const axis = a.axes.find(x => x.id === aid);
        const barColor = score >= 75 ? '#2A6F5D' : score >= 50 ? '#5C6B73' : score >= 25 ? '#C67D47' : '#A33B3B';
        const row = document.createElement('div');
        row.className = 'axis-score-row';
        row.innerHTML = `
          <div class="axis-info">
            <span class="axis-name">${axis ? axis.name_ar : aid}</span>
            <span class="axis-score" style="color:${barColor}">${score.toFixed(1)}%</span>
          </div>
          <div class="axis-bar-bg"><div class="axis-bar-fill" style="width:${score}%;background:${barColor}"></div></div>`;
        axesContainer.appendChild(row);
      });
    }

    if (res.kpis) {
      const kpiCard = document.createElement('div');
      kpiCard.className = 'form-card';
      kpiCard.style.marginBottom = '20px';
      kpiCard.innerHTML = `<h3 class="card-title">${this.t('sections.kpis')}</h3>`;
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:16px;';
      Object.entries(res.kpis).forEach(([k, v]) => {
        const kpiInfo = this.texts.kpis[k] || { name: k, short_name: k };
        const card = document.createElement('div');
        card.style.cssText = 'background:#f8fafc;border-radius:12px;padding:18px;text-align:center;border:1px solid #e5e7eb;';
        card.innerHTML = `
          <div style="font-size:12px;color:#5C6B73;margin-bottom:4px">${kpiInfo.name}</div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">${kpiInfo.short_name}</div>
          <div style="font-size:24px;font-weight:700;color:#0f766e">${v.toFixed(1)}</div>`;
        grid.appendChild(card);
      });
      kpiCard.appendChild(grid);
      const scoreCard = resultsView.querySelector('.form-card.text-center');
      if (scoreCard && scoreCard.nextSibling) {
        resultsView.insertBefore(kpiCard, scoreCard.nextSibling);
      } else if (scoreCard) {
        resultsView.appendChild(kpiCard);
      }
    }

    const trapsContainer = document.getElementById('traps-container');
    if (trapsContainer && res.traps && res.traps.length) {
      trapsContainer.classList.remove('hidden');
      const titleEl = trapsContainer.querySelector('.card-title');
      if (titleEl) titleEl.textContent = this.t('sections.gaps');
      const existing = trapsContainer.querySelectorAll('.trap-alert, .insight-box');
      existing.forEach(el => el.remove());
      res.traps.forEach(t => {
        const alert = document.createElement('div');
        alert.className = 'trap-alert';
        alert.innerHTML = `⚠️
          <h4>${t.name}</h4>
          <p>${t.message}</p>`;
        trapsContainer.appendChild(alert);
      });
    } else if (trapsContainer) {
      trapsContainer.classList.add('hidden');
    }

    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
      recContainer.classList.remove('hidden');
      const titleEl = recContainer.querySelector('.card-title');
      if (titleEl) titleEl.textContent = this.t('report.structural_diagnosis');
      const existing = recContainer.querySelectorAll('.insight-box');
      existing.forEach(el => el.remove());
      if (res.axisScores) {
        const sorted = Object.entries(res.axisScores).sort((a, b) => a[1] - b[1]);
        const weakest = sorted[0];
        const axis = this.assessment.axes.find(x => x.id === weakest[0]);
        const box = document.createElement('div');
        box.className = 'insight-box';
        box.innerHTML = `
          <h4>أولوية التحسين: ${axis ? axis.name_ar : weakest[0]}</h4>
          <p>هذا المحور يحتاج إلى اهتمام فوري لأنه الأقل أداءً (${weakest[1].toFixed(1)}%).</p>`;
        recContainer.appendChild(box);
      }
    }

    if (res.evSimulator) {
      const evCard = document.createElement('div');
      evCard.className = 'form-card';
      evCard.style.marginBottom = '20px';
      evCard.innerHTML = `<h3 class="card-title">${this.t('sections.ev_simulator')}</h3>`;
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;';
      grid.innerHTML = `
        <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center;border:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#5C6B73;margin-bottom:8px">${this.t('sections.ev_current')}</div>
          <div style="font-size:20px;font-weight:700;color:#0f766e">$${(res.evSimulator.currentEV || 0).toLocaleString()}</div>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center;border:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#5C6B73;margin-bottom:8px">${this.t('sections.ev_potential')}</div>
          <div style="font-size:20px;font-weight:700;color:#0f766e">$${(res.evSimulator.potentialEV || 0).toLocaleString()}</div>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:18px;text-align:center;border:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#5C6B73;margin-bottom:8px">${this.t('sections.ev_gap')}</div>
          <div style="font-size:20px;font-weight:700;color:#0f766e">+$${(res.evSimulator.gap || 0).toLocaleString()}</div>
        </div>`;
      evCard.appendChild(grid);
      const recContainer = document.getElementById('recommendations-container');
      if (recContainer && recContainer.nextSibling) {
        resultsView.insertBefore(evCard, recContainer.nextSibling);
      } else {
        resultsView.appendChild(evCard);
      }
    }
  }

  setupEVSimulator() {
    const btn = document.getElementById('btn-ev-simulator');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const resultsView = document.getElementById('view-results');
      const evView = document.getElementById('view-ev-simulator');
      if (resultsView) resultsView.classList.add('hidden');
      if (evView) evView.classList.remove('hidden');
    });
    const calcBtn = document.getElementById('btn-calculate-ev');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        const avg = parseFloat(document.getElementById('ev-avg')?.value) || 0;
        const visits = parseFloat(document.getElementById('ev-visits')?.value) || 0;
        const years = parseFloat(document.getElementById('ev-years')?.value) || 0;
        const referral = parseFloat(document.getElementById('ev-referral')?.value) || 0;
        const ltv = avg * visits * years;
        const referralMultiplier = 1 + (referral / 100) * 2;
        const current = ltv;
        const opt20 = ltv * 1.2 * referralMultiplier;
        const opt50 = ltv * 1.5 * referralMultiplier;
        const resultsDiv = document.getElementById('ev-results');
        if (resultsDiv) resultsDiv.classList.remove('hidden');
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = '$' + Math.round(val).toLocaleString(); };
        setText('ev-current', current);
        setText('ev-opt20', opt20);
        setText('ev-opt50', opt50);
        const setInc = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = '+$' + Math.round(val).toLocaleString(); };
        setInc('ev-increase20', opt20 - current);
        setInc('ev-increase50', opt50 - current);
      });
    }
    const backBtn = document.getElementById('btn-back-results');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const evView = document.getElementById('view-ev-simulator');
        const resultsView = document.getElementById('view-results');
        if (evView) evView.classList.add('hidden');
        if (resultsView) resultsView.classList.remove('hidden');
      });
    }
  }

  setupPrint() {
    const btn = document.getElementById('btn-print-report');
    if (btn) btn.addEventListener('click', () => window.print());
  }

  showError(msg) {
    let el = document.getElementById('error-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'error-container';
      el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:14px 28px;border-radius:12px;box-shadow:0 8px 24px rgba(239,68,68,0.3);z-index:10000;font-weight:600;font-family:Cairo,sans-serif;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[app.js] DOMContentLoaded');
  window.app = new ClinicEvaluatorApp();
  window.app.init();
});

/**
 * Clinic Evaluator — app.js v5.3 (CLEAN — P3 + P4.5 + P4 + P5 + P6)
 * ================================================================
 */

class ClinicEvaluatorApp {
  constructor() {
    this.config = null;
    this.texts = null;
    this.engine = null;
    this.supabase = null;

    this.currentAssessmentKey = null;
    this.assessment = null;
    this.questions = [];
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.metadata = {};

    this.currentLeadId = null;
    this.currentSessionId = null;
    this.errorShown = false;
  }

  /* ─────────────── INIT ─────────────── */

  async init() {
    try {
      this.supabase = window.supabaseClient || null;
      await Promise.all([this.loadConfig(), this.loadTexts()]);

      this.setupLeadForm();
      this.setupNavigation();
      this.setupEVSimulator();
      this.setupPrint();
      this.setupKeyboardShortcuts();

      this.currentAssessmentKey = window.preSelectedAssessment;
      this.assessment = this.getActiveAssessment();
      if (this.assessment) {
        this.questions = this.assessment.questions || [];
      }
    } catch (err) {
      console.error('[app] Init failed:', err);
      this.showFatalError('فشل تحميل التطبيق. تأكد من وجود ملفات الإعدادات.');
    }
  }

  async loadConfig() {
    const res = await fetch('data/config.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    this.config = await res.json();
  }

  async loadTexts() {
    const res = await fetch('data/report_texts.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    this.texts = await res.json();
  }

  t(path, vars = {}) {
    if (!this.texts) return path;
    const keys = path.split('.');
    let val = this.texts;
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) return path;
    }
    if (typeof val !== 'string') return val;
    return val.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
  }

  getActiveAssessment() {
    if (this.assessment) return this.assessment;
    if (!this.config?.assessment_types) return null;
    const key = this.currentAssessmentKey || window.preSelectedAssessment;
    return key ? this.config.assessment_types[key] : null;
  }

  /* ─────────────── UI HELPERS ─────────────── */

  showView(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.style.display = ''; }
  }

  hideView(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.style.display = 'none'; }
  }

  showFatalError(msg) {
    if (this.errorShown) return;
    this.errorShown = true;
    ['view-lead-form', 'view-assessment', 'view-loading', 'view-results'].forEach(id => this.hideView(id));
    let div = document.getElementById('fatal-error');
    if (!div) {
      div = document.createElement('div');
      div.id = 'fatal-error';
      div.style.cssText = 'background:#fef2f2;border:2px solid #ef4444;border-radius:16px;padding:40px;margin:40px auto;max-width:600px;text-align:center;';
      document.querySelector('.container')?.appendChild(div);
    }
    div.innerHTML = `<h2>⚠️ خطأ في التطبيق</h2><p>${msg}</p>`;
    div.classList.remove('hidden');
  }

  showError(msg) {
    let toast = document.getElementById('error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'error-toast';
      toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#991b1b;color:white;padding:16px 24px;border-radius:12px;z-index:9999;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);transition:all 0.3s;opacity:0;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 4000);
  }

  /* ─────────────── LEAD FORM ─────────────── */

  setupLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.collectMetadata();

      const dup = await this.checkDuplicateSubmission();
      if (!dup.allowed) { this.showError(dup.message); return; }

      this.startAssessment();
    });
  }

  collectMetadata() {
    const get = (id) => document.getElementById(id)?.value.trim() || '';
    this.metadata = {
      name: get('lead-name'),
      email: get('lead-email'),
      phone: get('lead-phone'),
      clinic: get('lead-clinic'),
      country: get('lead-country'),
      specialty: get('lead-specialty'),
      years: get('lead-years'),
      team: get('lead-staff')
    };
  }

  /* ─────────────── ASSESSMENT START ─────────────── */

  async startAssessment() {
    this.currentAssessmentKey = window.preSelectedAssessment;
    this.assessment = this.getActiveAssessment();

    if (!this.assessment) {
      this.showFatalError('نوع التقييم غير موجود: ' + this.currentAssessmentKey);
      return;
    }

    const status = await this.checkAssessmentStatus();
    if (!status.allowed) { this.showError(status.message); return; }
    if (status.requiresLogin) { this.showLoginForm(); return; }

    this.proceedWithAssessmentStart();
  }

  proceedWithAssessmentStart() {
    this.questions = this.assessment.questions;
    this.answers = {};
    this.currentQuestionIndex = 0;

    if (this.supabase) {
      this.saveLead().then(() => {
        if (this.currentLeadId) this.saveSession().catch(() => {});
      });
    }

    this.hideView('view-lead-form');
    this.showView('view-assessment');
    document.getElementById('view-assessment')?.classList.add('fade-in');

    this.renderQuestion();
    this.updateProgress();
    this.updateNavButtons();
  }

  /* ─────────────── QUESTIONS ─────────────── */

  renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;

    const q = this.questions[this.currentQuestionIndex];
    if (!q) { this.showFatalError('لا توجد أسئلة متاحة.'); return; }

    const num = this.currentQuestionIndex + 1;
    const total = this.questions.length;
    const letters = ['A', 'B', 'C', 'D', 'E'];

    let optsHtml = '';
    q.options.forEach((opt, i) => {
      const sel = this.answers[q.id] === opt.value ? 'sel' : '';
      optsHtml += `<div class="opt ${sel}" data-value="${opt.value}"><div class="opt-letter">${letters[i] || ''}</div><div>${opt.label}</div></div>`;
    });

    container.innerHTML = `
      <div class="question-card">
        <div class="question-meta">السؤال ${num} من ${total}</div>
        <div class="question-text">${q.text}</div>
        <div class="options-grid">${optsHtml}</div>
      </div>`;

    this.attachOptionHandlers(container, q.id);
    document.querySelector('.question-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  attachOptionHandlers(container, qid) {
    container.querySelectorAll('.opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const val = parseInt(opt.dataset.value);
        this.answers[qid] = val;
        container.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        this.updateProgress();
        this.updateSessionProgress();

        if (this.currentQuestionIndex < this.questions.length - 1) {
          setTimeout(() => { this.currentQuestionIndex++; this.renderQuestion(); this.updateProgress(); this.updateNavButtons(); }, 400);
        }
      });
    });
  }

  /* ─────────────── NAVIGATION ─────────────── */

  setupNavigation() {
    document.getElementById('btn-prev')?.addEventListener('click', () => this.goPrevious());
    document.getElementById('btn-next')?.addEventListener('click', () => this.goNext());
  }

  goPrevious() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderQuestion(); this.updateProgress(); this.updateNavButtons();
    }
  }

  goNext() {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) return;
    if (this.answers[q.id] === undefined) { this.shakeQuestion(); this.showError('يرجى اختيار إجابة'); return; }

    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderQuestion(); this.updateProgress(); this.updateNavButtons();
    } else {
      this.submitAssessment();
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('view-assessment')?.classList.contains('hidden')) return;

      if (e.key === 'ArrowRight') this.goNext();
      else if (e.key === 'ArrowLeft') this.goPrevious();
      else if (/^[a-e1-5]$/i.test(e.key)) {
        const map = { a:0, b:1, c:2, d:3, e:4, A:0, B:1, C:2, D:3, E:4, 1:0, 2:1, 3:2, 4:3, 5:4 };
        const idx = map[e.key];
        const q = this.questions[this.currentQuestionIndex];
        if (q?.options?.[idx]) {
          this.answers[q.id] = q.options[idx].value;
          const opts = document.querySelectorAll('#question-container .opt');
          opts.forEach(o => o.classList.remove('sel'));
          if (opts[idx]) opts[idx].classList.add('sel');
          this.updateProgress();
          setTimeout(() => this.goNext(), 300);
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
    if (txt) txt.textContent = `${done} من ${total}`;
  }

  updateNavButtons() {
    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    if (prev) prev.disabled = this.currentQuestionIndex === 0;
    if (next) next.textContent = (this.currentQuestionIndex === this.questions.length - 1) ? 'عرض النتائج ✅' : 'التالي ←';
  }

  shakeQuestion() {
    const card = document.querySelector('.question-card');
    if (card) { card.style.animation = 'shake 0.5s ease'; setTimeout(() => card.style.animation = '', 600); }
  }

  /* ─────────────── P4.5: ANTI-SPAM ─────────────── */

  async checkDuplicateSubmission() {
    if (!this.supabase || (!this.metadata.email && !this.metadata.phone)) return { allowed: true };
    try {
      let last = null;
      if (this.metadata.email) {
        const r = await this.supabase.select('leads', { filter: { email: this.metadata.email }, order: { column: 'created_at', direction: 'desc' }, limit: 1 });
        if (r?.[0]) last = r[0];
      }
      if (!last && this.metadata.phone) {
        const r = await this.supabase.select('leads', { filter: { phone: this.metadata.phone }, order: { column: 'created_at', direction: 'desc' }, limit: 1 });
        if (r?.[0]) last = r[0];
      }
      if (!last) return { allowed: true };

      const now = Date.now();
      const created = new Date(last.created_at).getTime();
      const hours = (now - created) / 3600000;
      const mins = (now - created) / 60000;

      if (last.completed && hours < 48) return { allowed: false, message: `لقد أكملت هذا التقييم مؤخراً. يرجى المحاولة بعد ${Math.ceil(48 - hours)} ساعة.` };
      if (!last.completed && mins < 10) return { allowed: false, message: 'لديك تقييم قيد التقدم. يرجى الانتظار 10 دقائق.' };
      return { allowed: true };
    } catch (err) {
      return { allowed: true };
    }
  }

  /* ─────────────── P4: ADMIN CONTROL ─────────────── */

  async checkAssessmentStatus() {
    if (!this.supabase) return { allowed: true };
    try {
      const r = await this.supabase.select('assessment_settings', { filter: { assessment_type_id: this.currentAssessmentKey } });
      if (!r?.[0]) return { allowed: true };
      const s = r[0];
      if (!s.is_active) return { allowed: false, message: 'هذا التقييم مغلق حالياً.' };
      if (s.is_paid) return { allowed: false, requiresLogin: true };
      return { allowed: true };
    } catch (err) { return { allowed: true }; }
  }

  async verifyUser(username, password) {
    if (!this.supabase) return false;
    try {
      const r = await this.supabase.select('assessment_users', { filter: { assessment_type_id: this.currentAssessmentKey, username } });
      if (!r?.[0]) return false;
      const u = r[0];
      if (u.password !== password) return false;
      if (new Date() > new Date(u.expires_at)) return false;
      if (u.used_count >= u.max_uses) return false;
      await this.supabase.update('assessment_users', { used_count: u.used_count + 1 }, { id: u.id });
      return true;
    } catch (err) { return false; }
  }

  showLoginForm() {
    let modal = document.getElementById('login-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'login-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:30px;max-width:400px;width:90%;text-align:center;">
          <h3 style="color:#134e4a;margin-bottom:20px;">🔐 تسجيل الدخول</h3>
          <p style="color:#6b7280;margin-bottom:20px;">هذا التقييم محمي. أدخل بيانات الدخول.</p>
          <input type="text" id="login-username" placeholder="اسم المستخدم" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:8px;text-align:center;">
          <input type="password" id="login-password" placeholder="كلمة المرور" style="width:100%;padding:12px;margin-bottom:8px;border:1px solid #d1d5db;border-radius:8px;text-align:center;">
          <div id="login-error" style="color:#ef4444;font-size:0.9rem;margin-bottom:12px;min-height:20px;"></div>
          <button id="btn-login" class="btn btn-primary" style="width:100%;">دخول</button>
        </div>`;
      document.body.appendChild(modal);
    } else {
      modal.style.display = 'flex';
      document.getElementById('login-error').textContent = '';
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';
    }

    const btn = document.getElementById('btn-login');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async () => {
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      const err = document.getElementById('login-error');
      if (!u || !p) { err.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور.'; return; }
      if (await this.verifyUser(u, p)) { this.hideLoginForm(); this.proceedWithAssessmentStart(); }
      else { err.textContent = 'بيانات الدخول غير صحيحة أو انتهت الصلاحية.'; }
    });
  }

  hideLoginForm() {
    const m = document.getElementById('login-modal');
    if (m) m.style.display = 'none';
  }

  /* ─────────────── SUPABASE: SAVE METHODS ─────────────── */

  updateSessionProgress() {
    if (this.supabase && this.currentSessionId) {
      this.supabase.update('sessions', { current_question: this.currentQuestionIndex }, { id: this.currentSessionId }).catch(() => {});
    }
  }

  async saveLead() {
    if (!this.supabase) return null;
    try {
      const data = {
        full_name: this.metadata.name || 'Unknown',
        email: this.metadata.email || null,
        phone: this.metadata.phone || null,
        clinic_name: this.metadata.clinic || null,
        country: this.metadata.country || null,
        specialty: this.metadata.specialty || null,
        years: this.metadata.years || null,
        team: this.metadata.team || null,
        source: window.location.pathname,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
        completed: false, score_total: 0, score_percentage: 0
      };
      const r = await this.supabase.insert('leads', data);
      if (r?.[0]) { this.currentLeadId = r[0].id; return this.currentLeadId; }
    } catch (err) { console.error('[app] saveLead:', err); }
    return null;
  }

  async saveSession() {
    if (!this.supabase || !this.currentLeadId) return null;
    try {
      const data = {
        lead_id: this.currentLeadId,
        assessment_type_id: this.currentAssessmentKey,
        status: 'in_progress',
        current_question: this.currentQuestionIndex,
        started_at: new Date().toISOString()
      };
      const r = await this.supabase.insert('sessions', data);
      if (r?.[0]) { this.currentSessionId = r[0].id; return this.currentSessionId; }
    } catch (err) { console.error('[app] saveSession:', err); }
    return null;
  }

  async saveAnswers() {
    if (!this.supabase || !this.currentSessionId) return;
    try {
      for (const [qid, val] of Object.entries(this.answers)) {
        const q = this.questions.find(q => q.id === qid);
        if (q) {
          await this.supabase.insert('answers', {
            session_id: this.currentSessionId, lead_id: this.currentLeadId,
            question_id: qid, axis_id: q.axis_id || '', question_text: q.text || '',
            answer_value: val, is_trap: q.layer === 'B', trap_triggered: false,
            answered_at: new Date().toISOString()
          });
        }
      }
    } catch (err) { console.error('[app] saveAnswers:', err); }
  }

  async saveScores(results) {
    if (!this.supabase || !this.currentSessionId) return;
    try {
      const axes = this.assessment?.axes || [];
      for (const [aid, score] of Object.entries(results.axisScores || {})) {
        const axis = axes.find(a => a.id === aid);
        await this.supabase.insert('scores', {
          session_id: this.currentSessionId, lead_id: this.currentLeadId,
          axis_id: aid, axis_name_ar: axis?.name_ar || aid, axis_name_en: axis?.name_en || aid,
          raw_score: Math.round(score), max_possible: 100, percentage: score,
          weight: axis?.weight || 1, weighted_score: score * (axis?.weight || 1),
          grade: score >= 75 ? 'Q4' : score >= 50 ? 'Q3' : score >= 25 ? 'Q2' : 'Q1'
        });
      }
    } catch (err) { console.error('[app] saveScores:', err); }
  }

  async updateLeadWithResults(results) {
    if (!this.supabase || !this.currentLeadId) return;
    try {
      await this.supabase.update('leads', {
        completed: true, score_total: Math.round(results.overallScore || 0),
        score_percentage: results.overallScore || 0, completed_at: new Date().toISOString()
      }, { id: this.currentLeadId });
    } catch (err) { console.error('[app] updateLeadWithResults:', err); }
  }

  /* ─────────────── SUBMIT & RESULTS ─────────────── */

  async submitAssessment() {
    this.hideView('view-assessment');
    this.showView('view-loading');
    document.getElementById('view-loading')?.classList.add('fade-in');

    const bar = document.getElementById('load-bar');
    const status = document.getElementById('load-status');
    let progress = 0;
    const interval = setInterval(() => { progress += Math.random() * 15; if (progress > 90) progress = 90; if (bar) bar.style.width = `${progress}%`; if (status) status.textContent = `${Math.round(progress)}%`; }, 200);

    try {
      if (typeof AssessmentEngine === 'undefined') throw new Error('engine.js not loaded');
      this.engine = new AssessmentEngine(this.config);
      const results = this.engine.evaluate(this.answers, this.currentAssessmentKey, this.metadata);

      if (this.supabase) {
        try {
          if (this.currentSessionId) await this.supabase.update('sessions', { status: 'completed' }, { id: this.currentSessionId });
          await this.saveAnswers();
          await this.saveScores(results);
          await this.updateLeadWithResults(results);
        } catch (e) { console.error('[app] Supabase save error:', e); }
      }

      clearInterval(interval);
      if (bar) bar.style.width = '100%';
      if (status) status.textContent = '100%';
      setTimeout(() => { this.hideView('view-loading'); this.renderResults(results); }, 500);
    } catch (err) {
      clearInterval(interval);
      this.showFatalError('حدث خطأ أثناء معالجة التقييم: ' + err.message);
    }
  }

  renderResults(res) {
    this.showView('view-results');
    document.getElementById('view-results')?.classList.add('fade-in');

    // Print styles (once)
    if (!document.getElementById('dynamic-print-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-print-styles';
      style.textContent = `@media print { .btn-group, .top-bar, #view-ev-simulator, .ev-simulator-section, #btn-ev-simulator, #charts-container { display: none !important; } .form-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #eee !important; } body { background: white !important; } .hidden { display: none !important; } }`;
      document.head.appendChild(style);
    }

    const q = res.classification || 'Q2';
    const qData = this.texts?.quartiles?.[q] || { label: 'أداء مستقر', color: '#5C6B73' };
    const score = Number.isFinite(res.overallScore) ? res.overallScore.toFixed(1) : '0.0';

    const circle = document.getElementById('result-score-circle');
    if (circle) circle.style.borderColor = qData.color;
    const scoreVal = document.getElementById('result-score-value');
    if (scoreVal) { scoreVal.textContent = score + '%'; scoreVal.style.color = qData.color; }
    const scoreLabel = document.getElementById('result-score-label');
    if (scoreLabel) scoreLabel.textContent = qData.label;
    const title = document.getElementById('result-title');
    if (title) title.textContent = qData.label;
    const body = document.getElementById('result-body');
    if (body) body.textContent = `درجتك الكلية: ${score} من 100 — ${qData.label}`;

    // Axes
    const axesContainer = document.getElementById('axes-scores');
    if (axesContainer && res.axisScores) {
      axesContainer.innerHTML = '';
      const axes = this.assessment?.axes || [];
      Object.entries(res.axisScores).forEach(([aid, score]) => {
        const axis = axes.find(a => a.id === aid);
        const color = score >= 75 ? '#2A6F5D' : score >= 50 ? '#5C6B73' : score >= 25 ? '#C67D47' : '#A33B3B';
        const row = document.createElement('div');
        row.className = 'axis-score-row fade-in';
        row.innerHTML = `<div class="axis-score-info"><div class="axis-score-name">${axis ? axis.name_ar : aid}</div><div class="axis-score-bar-bg"><div class="axis-score-bar-fill" style="width:${score}%;background:${color}"></div></div></div><div class="axis-score-value">${score.toFixed(1)}%</div>`;
        axesContainer.appendChild(row);
      });
    }

    // P6: Charts
    let chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
      chartsContainer = document.createElement('div');
      chartsContainer.id = 'charts-container';
      chartsContainer.className = 'form-card hidden fade-in';
      chartsContainer.style.marginTop = '20px';
      axesContainer?.parentNode?.insertBefore(chartsContainer, axesContainer.nextSibling);
    }
    if (res.axisScores) {
      const axes = this.assessment?.axes || [];
      const data = Object.entries(res.axisScores).map(([aid, score]) => ({ label: axes.find(a => a.id === aid)?.name_ar || aid, value: score }));
      this.renderBarChart('charts-container', data, 'مقارنة أداء المحاور');
    }

    // KPIs
    if (res.kpis) {
      let kpiContainer = document.getElementById('kpis-container');
      if (!kpiContainer) {
        kpiContainer = document.createElement('div');
        kpiContainer.id = 'kpis-container';
        kpiContainer.className = 'form-card hidden';
        kpiContainer.style.marginBottom = '20px';
        document.getElementById('view-results')?.insertBefore(kpiContainer, document.getElementById('view-results').children[2]);
      }
      kpiContainer.innerHTML = '<h3 class="card-title">📊 المؤشرات الرئيسية</h3>';
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;';
      Object.entries(res.kpis).forEach(([k, v]) => {
        const info = this.texts?.kpis?.[k] || { name: k, short_name: k };
        const card = document.createElement('div');
        card.style.cssText = 'background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;';
        card.innerHTML = `<div style="font-size:0.85rem;color:#6b7280;">${info.name}</div><div style="font-size:0.8rem;color:#9ca3af;">${info.short_name}</div><div style="font-size:1.5rem;font-weight:800;color:#134e4a;margin-top:4px;">${v.toFixed(1)}</div>`;
        grid.appendChild(card);
      });
      kpiContainer.appendChild(grid);
      kpiContainer.classList.remove('hidden');
    }

    // Traps
    const trapsContainer = document.getElementById('traps-container');
    if (trapsContainer) {
      if (res.traps?.length) {
        trapsContainer.classList.remove('hidden');
        trapsContainer.innerHTML = '<h3 class="card-title">🚨 نقاط الضعف المكتشفة</h3>';
        res.traps.forEach(t => {
          const alert = document.createElement('div');
          alert.className = 'trap-alert fade-in';
          alert.innerHTML = `<div class="icon">⚠️</div><div class="content"><h4>${t.name}</h4><p>${t.message}</p></div>`;
          trapsContainer.appendChild(alert);
        });
      } else trapsContainer.classList.add('hidden');
    }

    // Recommendations
    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
      recContainer.classList.remove('hidden');
      recContainer.innerHTML = '<h3 class="card-title">💡 التشخيص الهيكلي وفرص النمو</h3>';
      if (res.axisScores) {
        const sorted = Object.entries(res.axisScores).sort((a, b) => a[1] - b[1]);
        const weakest = sorted[0];
        const strongest = sorted[sorted.length - 1];
        const axes = this.assessment?.axes || [];
        const weakAxis = axes.find(x => x.id === weakest[0]);
        const strongAxis = axes.find(x => x.id === strongest[0]);
        const box = document.createElement('div');
        box.className = 'insight-box fade-in';
        box.innerHTML = `<h4>🎯 أولوية التحسين الفورية: ${weakAxis ? weakAxis.name_ar : weakest[0]}</h4><p>هذا المحور يحتاج إلى اهتمام فوري (${weakest[1].toFixed(1)}%).</p><h4 style="margin-top:12px;">💪 نقطة القوة: ${strongAxis ? strongAxis.name_ar : strongest[0]}</h4><p>أداء متميز (${strongest[1].toFixed(1)}%).</p>`;
        recContainer.appendChild(box);
      }
    }

    // EV Simulator
    const evEnabled = this.assessment?.simulator?.enabled === true;
    const evSection = document.getElementById('btn-ev-simulator')?.closest('.form-card');
    if (evSection) evSection.classList.toggle('hidden', !evEnabled);

    // Leakage
    const leakageEl = document.getElementById('leakage-index');
    if (leakageEl && res.leakageIndex !== undefined) leakageEl.textContent = res.leakageIndex + '%';

    // P5: Export CSV Button
    const btnGroup = document.querySelector('#view-results .btn-group:last-child');
    if (btnGroup && !document.getElementById('btn-export-csv')) {
      const csvBtn = document.createElement('button');
      csvBtn.id = 'btn-export-csv';
      csvBtn.className = 'btn btn-secondary';
      csvBtn.textContent = '📥 تصدير CSV';
      csvBtn.onclick = () => this.exportToCSV();
      btnGroup.insertBefore(csvBtn, btnGroup.firstChild);
    }
  }

  /* ─────────────── P5: EXPORT CSV ─────────────── */

  exportToCSV() {
    const axes = this.assessment?.axes || [];
    let csv = '\uFEFF';
    csv += 'الاسم,العيادة,الدولة,التخصص,التاريخ\n';
    csv += `"${this.metadata.name}","${this.metadata.clinic}","${this.metadata.country}","${this.metadata.specialty}","${new Date().toLocaleDateString('ar-EG')}"\n\n`;
    csv += 'المحور,السؤال,الدرجة\n';

    for (const q of this.questions) {
      const axis = axes.find(a => a.id === q.axis_id);
      const val = this.answers[q.id];
      let label = 'لم يتم الإجابة';
      if (val === 100) label = 'ممتاز';
      else if (val === 40) label = 'متوسط';
      else if (val === 0) label = 'ضعيف';
      else if (val !== undefined) label = val;
      csv += `"${axis ? axis.name_ar : q.axis_id}","${q.text.replace(/"/g, '""')}","${label}"\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقييم_${this.currentAssessmentKey}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ─────────────── P6: CSS CHARTS ─────────────── */

  renderBarChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container || !data?.length) return;

    container.innerHTML = '';
    container.classList.remove('hidden');

    const titleEl = document.createElement('h3');
    titleEl.className = 'card-title';
    titleEl.textContent = `📊 ${title}`;
    container.appendChild(titleEl);

    const maxVal = Math.max(...data.map(d => d.value), 1);
    data.forEach(item => {
      const pct = (item.value / maxVal) * 100;
      let color = '#A33B3B';
      if (item.value >= 75) color = '#2A6F5D';
      else if (item.value >= 50) color = '#5C6B73';
      else if (item.value >= 25) color = '#C67D47';

      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom:12px;';
      row.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;font-weight:600;"><span>${item.label}</span><span style="color:${color}">${item.value.toFixed(1)}%</span></div><div style="width:100%;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${color};border-radius:6px;transition:width 0.5s ease;"></div></div>`;
      container.appendChild(row);
    });
  }

  /* ─────────────── EV SIMULATOR ─────────────── */

  setupEVSimulator() {
    document.getElementById('btn-ev-simulator')?.addEventListener('click', () => {
      this.hideView('view-results');
      this.showView('view-ev-simulator');
      document.getElementById('view-ev-simulator')?.classList.add('fade-in');
    });
    document.getElementById('btn-calculate-ev')?.addEventListener('click', () => this.calculateEV());
    document.getElementById('btn-back-results')?.addEventListener('click', () => {
      this.showView('view-results');
      this.hideView('view-ev-simulator');
    });
  }

  calculateEV() {
    const avg = parseFloat(document.getElementById('ev-avg')?.value) || 0;
    const visits = parseFloat(document.getElementById('ev-visits')?.value) || 0;
    const years = parseFloat(document.getElementById('ev-years')?.value) || 0;
    const referral = parseFloat(document.getElementById('ev-referral')?.value) || 0;

    let current, opt20, opt50;
    if (this.engine && this.assessment) {
      try {
        const axisScores = this.engine.calculateScores().axes;
        const evResult = this.engine.calculateEV(
          Object.fromEntries(axisScores.map(a => [a.axisId, a.percentage])),
          { flow: visits * 12, ltv: avg * visits * years }
        );
        if (evResult) { current = evResult.currentEV; opt20 = Math.round(current * 1.2); opt50 = Math.round(current * 1.5); }
      } catch (e) {}
    }

    if (!current) {
      const annual = visits * 12;
      const ltv = avg * visits * years;
      const refMult = 1 + (referral / 100);
      current = Math.round(annual * ltv * refMult);
      opt20 = Math.round(current * 1.2);
      opt50 = Math.round(current * 1.5);
    }

    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('ev-current', '$' + current.toLocaleString());
    setText('ev-opt20', '$' + opt20.toLocaleString());
    setText('ev-opt50', '$' + opt50.toLocaleString());
    setText('ev-increase20', '+$' + (opt20 - current).toLocaleString());
    setText('ev-increase50', '+$' + (opt50 - current).toLocaleString());
    document.getElementById('ev-results')?.classList.remove('hidden');
  }

  /* ─────────────── PRINT ─────────────── */

  setupPrint() {
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
  }
}

/* ─────────────── INIT ─────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ClinicEvaluatorApp();
  window.app.init();
});

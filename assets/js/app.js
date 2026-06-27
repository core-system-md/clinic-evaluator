/**
 * Clinic Evaluator — app.js v5.1 (PRODUCTION + Supabase)
 * Fixes:
 * - Fetch paths corrected (relative to HTML)
 * - Arabic error messages with page display
 * - ABCDE system enforced (no Likert/12345)
 * - SupabaseClient integrated (save/load assessments)
 * - Better error handling and user feedback
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
    this.engine = null;
    this.errorShown = false;
    this.supabase = null;
    this.currentLeadId = null;
    this.currentSessionId = null;
  }

  // ========== AUTH CHECK ==========
  async checkAssessmentAuth() {
    try {
      if (this.supabase && window.preSelectedAssessment) {
        const settings = await this.supabase.select('assessment_settings', {
          filter: { assessment_key: window.preSelectedAssessment }
        });

        if (settings && settings.length > 0 && settings[0].auth_enabled) {
          await this.showAuthModal();
        }
      }
    } catch (err) {
      console.warn('[app.js] Auth check failed:', err);
    }
  }

  async showAuthModal() {
    return new Promise((resolve) => {
      const existing = document.getElementById('assessment-auth-modal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'assessment-auth-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.95);display:flex;align-items:center;justify-content:center;z-index:9999;';
      modal.innerHTML = `
        <div style="background:#1e293b;border-radius:16px;padding:40px;width:90%;max-width:400px;border:1px solid #334155;direction:rtl;">
          <h2 style="color:#e8b923;text-align:center;margin-bottom:8px;">🔐 تقييم محمي</h2>
          <p style="color:#94a3b8;text-align:center;margin-bottom:24px;font-size:0.9rem;">هذا التقييم يتطلب تسجيل دخول</p>
          <form id="assessment-auth-form">
            <div style="margin-bottom:16px;">
              <label style="display:block;color:#94a3b8;margin-bottom:6px;font-size:0.9rem;">اسم المستخدم</label>
              <input type="text" id="auth-user" required style="width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#f1f5f9;font-size:1rem;font-family:inherit;">
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;color:#94a3b8;margin-bottom:6px;font-size:0.9rem;">كلمة المرور</label>
              <input type="password" id="auth-pass" required style="width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#f1f5f9;font-size:1rem;font-family:inherit;">
            </div>
            <div id="auth-error-msg" style="color:#ef4444;text-align:center;margin-bottom:16px;display:none;font-size:0.9rem;"></div>
            <button type="submit" style="width:100%;padding:14px;background:#1a5f7a;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;font-family:inherit;">دخول</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('assessment-auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-user').value.trim();
        const password = document.getElementById('auth-pass').value;
        const errorDiv = document.getElementById('auth-error-msg');

        try {
          const users = await this.supabase.select('assessment_users', {
            filter: { assessment_key: window.preSelectedAssessment, username: username }
          });

          if (!users || users.length === 0) {
            errorDiv.textContent = 'اسم المستخدم غير موجود';
            errorDiv.style.display = 'block';
            return;
          }

          const user = users[0];
          const hash = await this.simpleHash(password);

          if (user.password_hash !== hash) {
            errorDiv.textContent = 'كلمة المرور غير صحيحة';
            errorDiv.style.display = 'block';
            return;
          }

          if (!user.active) {
            errorDiv.textContent = 'الحساب معطل';
            errorDiv.style.display = 'block';
            return;
          }

          if (user.used_count >= user.max_uses) {
            errorDiv.textContent = 'تم استنفاد عدد الاستخدامات';
            errorDiv.style.display = 'block';
            return;
          }

          if (user.expires_at && new Date(user.expires_at) < new Date()) {
            errorDiv.textContent = 'انتهت صلاحية الحساب';
            errorDiv.style.display = 'block';
            return;
          }

          await this.supabase.update('assessment_users', { used_count: user.used_count + 1 }, { id: user.id });
          modal.remove();
          resolve(true);
        } catch (err) {
          errorDiv.textContent = 'خطأ في المصادقة';
          errorDiv.style.display = 'block';
        }
      });
    });
  }

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  getActiveAssessment() {
    if (this.assessment) return this.assessment;
    if (!this.config?.assessment_types) return null;
    const key = this.currentAssessmentKey || window.preSelectedAssessment;
    return key ? this.config.assessment_types[key] : null;
  }

  async init() {
    console.log('[app.js] init started');
    try {
      // Initialize Supabase client
      this.supabase = window.supabaseClient || null;
      if (this.supabase) {
        console.log('[app.js] Supabase client initialized');
      } else {
        console.warn('[app.js] Supabase client not available');
      }

      await Promise.all([this.loadConfig(), this.loadTexts()]);
      console.log('[app.js] config & texts loaded');

      // Check if assessment is protected
      await this.checkAssessmentAuth();

      this.setupLeadForm();
      this.setupNavigation();
      this.setupEVSimulator();
      this.setupPrint();
      this.setupKeyboardShortcuts();

      this.currentAssessmentKey = window.preSelectedAssessment;
      this.assessment = this.getActiveAssessment();
      if (this.assessment) {
        this.questions = this.assessment.questions || [];
        console.log('[app.js] assessment pre-loaded:', window.preSelectedAssessment, 'questions:', this.questions.length);
      } else {
        console.warn('[app.js] no assessment loaded for:', window.preSelectedAssessment);
      }
    } catch (err) {
      console.error('[app.js] Init failed:', err);
      this.showFatalError('فشل تحميل التطبيق. تأكد من وجود ملفات الإعدادات (config.json + report_texts.json) في مجلد data/');
    }
  }

  // ========== DATA LOADING ==========

  async loadConfig() {
    try {
      const res = await fetch('data/config.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.config = await res.json();
    } catch (err) {
      console.error('[app.js] loadConfig failed:', err);
      throw new Error('فشل تحميل config.json: ' + err.message);
    }
  }

  async loadTexts() {
    try {
      const res = await fetch('data/report_texts.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.texts = await res.json();
    } catch (err) {
      console.error('[app.js] loadTexts failed:', err);
      throw new Error('فشل تحميل report_texts.json: ' + err.message);
    }
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

  // ========== ERROR HANDLING ==========

  showView(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = '';
  }

  hideView(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  showFatalError(msg) {
    if (this.errorShown) return;
    this.errorShown = true;

    // Hide all views
    ['view-lead-form', 'view-assessment', 'view-loading', 'view-results'].forEach(id => this.hideView(id));

    // Show error in page
    let errorDiv = document.getElementById('fatal-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'fatal-error';
      errorDiv.style.cssText = 'background:#fef2f2;border:2px solid #ef4444;border-radius:16px;padding:40px;margin:40px auto;max-width:600px;text-align:center;';
      document.querySelector('.container')?.appendChild(errorDiv);
    }

    errorDiv.innerHTML = `
      <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
      <h2 style="color:#991b1b;margin-bottom:12px;">خطأ في التطبيق</h2>
      <p style="color:#7f1d1d;font-size:1rem;">${msg}</p>
    `;
    errorDiv.classList.remove('hidden');
  }

  showError(msg) {
    console.error('[app.js]', msg);
    // Show toast instead of alert
    let toast = document.getElementById('error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'error-toast';
      toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#991b1b;color:white;padding:16px 24px;border-radius:12px;z-index:9999;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);transition:all 0.3s;opacity:0;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 4000);
  }

  // ========== LEAD FORM ==========

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
      specialty: getVal('lead-specialty'),
      years: getVal('lead-years'),
      team: getVal('lead-staff')
    };
  }

  // ========== ASSESSMENT FLOW ==========

  startAssessment() {
    this.currentAssessmentKey = window.preSelectedAssessment;
    this.assessment = this.getActiveAssessment();

    if (!this.assessment) {
      this.showFatalError('نوع التقييم غير موجود: ' + this.currentAssessmentKey);
      return;
    }

    this.questions = this.assessment.questions;
    this.answers = {};
    this.currentQuestionIndex = 0;

    this.hideView('view-lead-form');
    this.showView('view-assessment');
    const assessmentView = document.getElementById('view-assessment');
    if (assessmentView) {
      assessmentView.classList.add('fade-in');
    }

    this.renderQuestion();
    this.updateProgress();
    this.updateNavButtons();
  }

  // ========== QUESTION RENDERING (ABCDE ONLY) ==========

  renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;

    const q = this.questions?.[this.currentQuestionIndex];
    if (!q) {
      this.showFatalError('لا توجد أسئلة متاحة لهذا التقييم حالياً.');
      return;
    }

    const num = this.currentQuestionIndex + 1;
    const total = this.questions.length;

    container.innerHTML = this.renderABCDEQuestion(q, num, total);
    this.attachOptionHandlers(container, q.id);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderABCDEQuestion(q, num, total) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    let optsHtml = '';

    q.options.forEach((opt, i) => {
      const letter = letters[i] || '';
      const selected = this.answers[q.id] === opt.value ? 'sel' : '';

      optsHtml += `
        <div class="opt ${selected}" data-value="${opt.value}">
          <div class="opt-letter">${letter}</div>
          <div>${opt.label}</div>
        </div>
      `;
    });

    return `
      <div class="question-card">
        <div class="question-meta">السؤال ${num} من ${total}</div>
        <div class="question-text">${q.text}</div>
        <div class="options-grid">${optsHtml}</div>
      </div>
    `;
  }

  attachOptionHandlers(container, qid) {
    const opts = container.querySelectorAll('.opt');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = parseInt(opt.dataset.value);
        this.answers[qid] = val;
        opts.forEach(o => o.classList.remove('sel'));
        opt.classList.add('sel');
        this.updateProgress();

        // Auto-advance after 500ms if not last question
        if (this.currentQuestionIndex < this.questions.length - 1) {
          setTimeout(() => {
            this.currentQuestionIndex++;
            this.renderQuestion();
            this.updateProgress();
            this.updateNavButtons();
          }, 400);
        }
      });
    });
  }

  // ========== NAVIGATION ==========

  setupNavigation() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.goPrevious());
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.goNext());
    }
  }

  goPrevious() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderQuestion();
      this.updateProgress();
      this.updateNavButtons();
    }
  }

  goNext() {
    const currentQ = this.questions?.[this.currentQuestionIndex];
    if (!currentQ) {
      this.showFatalError('لم يتم العثور على السؤال الحالي.');
      return;
    }
    if (this.answers[currentQ.id] === undefined) {
      this.shakeQuestion();
      this.showError('يرجى اختيار إجابة قبل المتابعة');
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
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const assessmentView = document.getElementById('view-assessment');
      if (!assessmentView || assessmentView.classList.contains('hidden')) return;

      if (e.key === 'ArrowRight') {
        this.goNext();
      } else if (e.key === 'ArrowLeft') {
        this.goPrevious();
      } else if (['a','b','c','d','e','A','B','C','D','E','1','2','3','4','5'].includes(e.key)) {
        const keyMap = {'a':0,'b':1,'c':2,'d':3,'e':4,'A':0,'B':1,'C':2,'D':3,'E':4,'1':0,'2':1,'3':2,'4':3,'5':4};
        const idx = keyMap[e.key];
        const currentQ = this.questions?.[this.currentQuestionIndex];
        if (currentQ && currentQ.options?.[idx]) {
          const val = currentQ.options[idx].value;
          this.answers[currentQ.id] = val;
          const container = document.getElementById('question-container');
          const opts = container.querySelectorAll('.opt');
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
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;
    if (nextBtn) {
      const isLast = this.currentQuestionIndex === this.questions.length - 1;
      nextBtn.textContent = isLast ? 'عرض النتائج ✅' : 'التالي ←';
    }
  }

  shakeQuestion() {
    const card = document.querySelector('.question-card');
    if (card) {
      card.style.animation = 'shake 0.5s ease';
      setTimeout(() => card.style.animation = '', 600);
    }
  }

  // ========== SUPABASE SAVE METHODS ==========

  async saveLead() {
    if (!this.supabase) {
      console.warn('[app.js] Supabase not available, skipping lead save');
      return null;
    }
    try {
      const leadData = {
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
        completed: false,
        score_total: 0,
        score_percentage: 0
      };
      const result = await this.supabase.insert('leads', leadData);
      if (result && result[0]) {
        this.currentLeadId = result[0].id;
        console.log('[app.js] Lead saved:', this.currentLeadId);
        return this.currentLeadId;
      }
      return null;
    } catch (err) {
      console.error('[app.js] saveLead failed:', err);
      return null;
    }
  }

  async saveSession() {
    if (!this.supabase || !this.currentLeadId) {
      console.warn('[app.js] Supabase or leadId not available, skipping session save');
      return null;
    }
    try {
      const sessionData = {
        lead_id: this.currentLeadId,
        assessment_type_id: null,
        status: 'in_progress',
        current_question: this.currentQuestionIndex,
        started_at: new Date().toISOString()
      };
      const result = await this.supabase.insert('sessions', sessionData);
      if (result && result[0]) {
        this.currentSessionId = result[0].id;
        console.log('[app.js] Session saved:', this.currentSessionId);
        return this.currentSessionId;
      }
      return null;
    } catch (err) {
      console.error('[app.js] saveSession failed:', err);
      return null;
    }
  }

  async saveAnswers() {
    if (!this.supabase || !this.currentSessionId) {
      console.warn('[app.js] Supabase or sessionId not available, skipping answers save');
      return;
    }
    try {
      for (const [questionId, value] of Object.entries(this.answers)) {
        const question = this.questions.find(q => q.id === questionId);
        if (question) {
          await this.supabase.insert('answers', {
            session_id: this.currentSessionId,
            lead_id: this.currentLeadId,
            question_id: questionId,
            axis_id: question.axis_id || '',
            question_text: question.text || '',
            answer_value: value,
            is_trap: question.layer === 'B',
            trap_triggered: false,
            answered_at: new Date().toISOString()
          });
        }
      }
      console.log('[app.js] Answers saved');
    } catch (err) {
      console.error('[app.js] saveAnswers failed:', err);
    }
  }

  async saveScores(results) {
    if (!this.supabase || !this.currentSessionId) {
      console.warn('[app.js] Supabase or sessionId not available, skipping scores save');
      return;
    }
    try {
      const assessment = this.getActiveAssessment();
      if (results.axisScores) {
        for (const [axisId, score] of Object.entries(results.axisScores)) {
          const axis = assessment?.axes?.find(a => a.id === axisId);
          await this.supabase.insert('scores', {
            session_id: this.currentSessionId,
            lead_id: this.currentLeadId,
            axis_id: axisId,
            axis_name_ar: axis?.name_ar || axisId,
            axis_name_en: axis?.name_en || axisId,
            raw_score: Math.round(score),
            max_possible: 100,
            percentage: score,
            weight: axis?.weight || 1,
            weighted_score: score * (axis?.weight || 1),
            grade: score >= 75 ? 'Q4' : score >= 50 ? 'Q3' : score >= 25 ? 'Q2' : 'Q1'
          });
        }
      }
      console.log('[app.js] Scores saved');
    } catch (err) {
      console.error('[app.js] saveScores failed:', err);
    }
  }

  async updateLeadWithResults(results) {
    if (!this.supabase || !this.currentLeadId) {
      console.warn('[app.js] Supabase or leadId not available, skipping lead update');
      return;
    }
    try {
      await this.supabase.update('leads', {
        completed: true,
        score_total: Math.round(results.overallScore || 0),
        score_percentage: results.overallScore || 0,
        completed_at: new Date().toISOString()
      }, { id: this.currentLeadId });
      console.log('[app.js] Lead updated with results');
    } catch (err) {
      console.error('[app.js] updateLeadWithResults failed:', err);
    }
  }

  // ========== SUBMIT & RESULTS ==========

  async submitAssessment() {
    this.hideView('view-assessment');
    this.showView('view-loading');
    const loadingView = document.getElementById('view-loading');
    if (loadingView) {
      loadingView.classList.add('fade-in');
    }

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

      // Save to Supabase (non-blocking, don't fail if Supabase is down)
      if (this.supabase) {
        try {
          // Step 1: Save lead
          await this.saveLead();
          
          // Step 2: Save session
          await this.saveSession();
          
          // Step 3: Save answers
          await this.saveAnswers();
          
          // Step 4: Save scores
          await this.saveScores(results);
          
          // Step 5: Update lead with final results
          await this.updateLeadWithResults(results);
          
          console.log('[app.js] All data saved to Supabase successfully');
        } catch (saveErr) {
          console.error('[app.js] Supabase save error (non-fatal):', saveErr);
          // Don't throw - allow results to display even if save fails
        }
      }

      clearInterval(interval);
      if (loadBar) loadBar.style.width = '100%';
      if (loadStatus) loadStatus.textContent = '100%';

      setTimeout(() => {
        this.hideView('view-loading');
        this.renderResults(results);
      }, 500);

    } catch (err) {
      clearInterval(interval);
      console.error(err);
      this.showFatalError('حدث خطأ أثناء معالجة التقييم: ' + err.message);
    }
  }

  renderResults(res) {
    this.showView('view-results');
    const resultsView = document.getElementById('view-results');
    if (resultsView) {
      resultsView.classList.add('fade-in');
    }

    const q = res.classification || 'Q2';
    const qData = this.texts?.quartiles?.[q] || { label: 'أداء مستقر', color: '#5C6B73' };
    const score = Number.isFinite(res.overallScore) ? res.overallScore.toFixed(1) : '0.0';

    // Score circle
    const circle = document.getElementById('result-score-circle');
    const scoreVal = document.getElementById('result-score-value');
    const scoreLabel = document.getElementById('result-score-label');
    const title = document.getElementById('result-title');
    const body = document.getElementById('result-body');

    if (circle) circle.style.borderColor = qData.color;
    if (scoreVal) {
      scoreVal.textContent = score + '%';
      scoreVal.style.color = qData.color;
    }
    if (scoreLabel) scoreLabel.textContent = qData.label;
    if (title) title.textContent = qData.label;
    if (body) body.textContent = `درجتك الكلية: ${score} من 100 — ${qData.label}`;

    // Axes scores
    const axesContainer = document.getElementById('axes-scores');
    if (axesContainer && res.axisScores) {
      axesContainer.innerHTML = '';
      const assessment = this.getActiveAssessment() || this.assessment;
      const axes = assessment?.axes || [];
      Object.entries(res.axisScores).forEach(([aid, score]) => {
        const axis = axes.find(x => x.id === aid);
        const barColor = score >= 75 ? '#2A6F5D' : score >= 50 ? '#5C6B73' : score >= 25 ? '#C67D47' : '#A33B3B';
        const row = document.createElement('div');
        row.className = 'axis-score-row fade-in';
        row.innerHTML = `
          <div class="axis-info">
            <div class="axis-name">${axis ? axis.name_ar : aid}</div>
            <div class="axis-bar-bg"><div class="axis-bar-fill" style="width:${score}%;background:${barColor}"></div></div>
          </div>
          <div class="axis-score" style="color:${barColor}">${score.toFixed(1)}%</div>
        `;
        axesContainer.appendChild(row);
      });
    }

    // KPIs
    if (res.kpis) {
      const kpiContainer = document.getElementById('kpis-container') || this.createKPIContainer(resultsView);
      kpiContainer.innerHTML = '<h3 class="card-title">📊 المؤشرات الرئيسية</h3>';
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;';

      Object.entries(res.kpis).forEach(([k, v]) => {
        const kpiInfo = this.texts.kpis?.[k] || { name: k, short_name: k };
        const card = document.createElement('div');
        card.style.cssText = 'background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;';
        card.innerHTML = `
          <div style="font-size:0.85rem;color:#6B7280;margin-bottom:4px;">${kpiInfo.name}</div>
          <div style="font-size:0.75rem;color:#9CA3AF;margin-bottom:8px;">${kpiInfo.short_name}</div>
          <div style="font-size:1.5rem;font-weight:700;color:#0F766E;">${v.toFixed(1)}</div>
        `;
        grid.appendChild(card);
      });
      kpiContainer.appendChild(grid);
      kpiContainer.classList.remove('hidden');
    }

    // Traps
    const trapsContainer = document.getElementById('traps-container');
    if (trapsContainer) {
      if (res.traps && res.traps.length) {
        trapsContainer.classList.remove('hidden');
        trapsContainer.innerHTML = '<h3 class="card-title">🚨 نقاط الضعف المكتشفة</h3>';
        res.traps.forEach(t => {
          const alert = document.createElement('div');
          alert.className = 'trap-alert fade-in';
          alert.innerHTML = `
            <div class="icon">⚠️</div>
            <div class="content">
              <h4>${t.name}</h4>
              <p>${t.message}</p>
            </div>
          `;
          trapsContainer.appendChild(alert);
        });
      } else {
        trapsContainer.classList.add('hidden');
      }
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
        const assessment = this.getActiveAssessment() || this.assessment;
        const axes = assessment?.axes || [];
        const weakAxis = axes.find(x => x.id === weakest[0]);
        const strongAxis = axes.find(x => x.id === strongest[0]);

        const box = document.createElement('div');
        box.className = 'insight-box fade-in';
        box.innerHTML = `
          <h4>🎯 أولوية التحسين الفورية: ${weakAxis ? weakAxis.name_ar : weakest[0]}</h4>
          <p>هذا المحور يحتاج إلى اهتمام فوري (${weakest[1].toFixed(1)}%). التركيز على تحسينه سيرفع درجتك الكلية بشكل ملحوظ.</p>
          <h4>💪 نقطة القوة: ${strongAxis ? strongAxis.name_ar : strongest[0]}</h4>
          <p>أداء متميز (${strongest[1].toFixed(1)}%). حافظ على هذا المستوى واستخدمه كنموذج للمحاور الأخرى.</p>
        `;
        recContainer.appendChild(box);
      }
    }

    // EV Simulator (only if enabled)
    const assessment = this.getActiveAssessment() || this.assessment;
    const evEnabled = assessment?.simulator?.enabled === true;
    const evSection = document.getElementById('btn-ev-simulator')?.closest('.form-card');
    if (evSection) {
      if (evEnabled) {
        evSection.classList.remove('hidden');
      } else {
        evSection.classList.add('hidden');
      }
    }

    // Leakage Index
    const leakageEl = document.getElementById('leakage-index');
    if (leakageEl && res.leakageIndex !== undefined) {
      leakageEl.textContent = res.leakageIndex + '%';
      leakageEl.classList.remove('hidden');
    }
  }

  createKPIContainer(parent) {
    const div = document.createElement('div');
    div.id = 'kpis-container';
    div.className = 'form-card hidden';
    div.style.marginBottom = '20px';
    parent.insertBefore(div, parent.children[2]);
    return div;
  }

  // ========== EV SIMULATOR ==========

  setupEVSimulator() {
    const btn = document.getElementById('btn-ev-simulator');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.hideView('view-results');
      this.showView('view-ev-simulator');
      const evView = document.getElementById('view-ev-simulator');
      if (evView) {
        evView.classList.add('fade-in');
      }
    });

    const calcBtn = document.getElementById('btn-calculate-ev');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => this.calculateEV());
    }

    const backBtn = document.getElementById('btn-back-results');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showView('view-results');
        this.hideView('view-ev-simulator');
      });
    }
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
        if (evResult) {
          current = evResult.currentEV;
          opt20 = Math.round(current * 1.2);
          opt50 = Math.round(current * 1.5);
        }
      } catch (e) {
        console.error('EV engine calc failed:', e);
      }
    }

    if (!current) {
      const annualPatients = visits * 12;
      const patientLTV = avg * visits * years;
      const referralMultiplier = 1 + (referral / 100);
      current = Math.round(annualPatients * patientLTV * referralMultiplier);
      opt20 = Math.round(current * 1.2);
      opt50 = Math.round(current * 1.5);
    }

    const evCurrent = document.getElementById('ev-current');
    const evOpt20 = document.getElementById('ev-opt20');
    const evOpt50 = document.getElementById('ev-opt50');
    const evInc20 = document.getElementById('ev-increase20');
    const evInc50 = document.getElementById('ev-increase50');
    const evResults = document.getElementById('ev-results');

    if (evCurrent) evCurrent.textContent = '$' + current.toLocaleString();
    if (evOpt20) evOpt20.textContent = '$' + opt20.toLocaleString();
    if (evOpt50) evOpt50.textContent = '$' + opt50.toLocaleString();
    if (evInc20) evInc20.textContent = '+$' + (opt20 - current).toLocaleString();
    if (evInc50) evInc50.textContent = '+$' + (opt50 - current).toLocaleString();
    if (evResults) evResults.classList.remove('hidden');
  }

  // ========== PRINT ==========

  setupPrint() {
    const btn = document.getElementById('btn-print-report');
    if (btn) {
      btn.addEventListener('click', () => window.print());
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ClinicEvaluatorApp();
  window.app.init();
});

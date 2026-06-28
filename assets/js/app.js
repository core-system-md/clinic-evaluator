/**
 * Clinic Evaluator — app.js v5.2 (PRODUCTION + Supabase + P4.5 + P4 + P5 + P6)
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

  getActiveAssessment() {
    if (this.assessment) return this.assessment;
    if (!this.config?.assessment_types) return null;
    const key = this.currentAssessmentKey || window.preSelectedAssessment;
    return key ? this.config.assessment_types[key] : null;
  }

  async init() {
    console.log('[app.js] init started');
    try {
      this.supabase = window.supabaseClient || null;
      if (this.supabase) {
        console.log('[app.js] Supabase client initialized');
      } else {
        console.warn('[app.js] Supabase client not available');
      }

      await Promise.all([this.loadConfig(), this.loadTexts()]);
      console.log('[app.js] config & texts loaded');

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
    ['view-lead-form', 'view-assessment', 'view-loading', 'view-results'].forEach(id => this.hideView(id));
    let errorDiv = document.getElementById('fatal-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'fatal-error';
      errorDiv.style.cssText = 'background:#fef2f2;border:2px solid #ef4444;border-radius:16px;padding:40px;margin:40px auto;max-width:600px;text-align:center;';
      document.querySelector('.container')?.appendChild(errorDiv);
    }
    errorDiv.innerHTML = `⚠️<h2>خطأ في التطبيق</h2><p>${msg}</p>`;
    errorDiv.classList.remove('hidden');
  }

  showError(msg) {
    console.error('[app.js]', msg);
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

  setupLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.collectMetadata();

      // P4.5: Check duplicate submission
      const dupCheck = await this.checkDuplicateSubmission();
      if (!dupCheck.allowed) {
        this.showError(dupCheck.message);
        return;
      }

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

  async startAssessment() {
    this.currentAssessmentKey = window.preSelectedAssessment;
    this.assessment = this.getActiveAssessment();

    if (!this.assessment) {
      this.showFatalError('نوع التقييم غير موجود: ' + this.currentAssessmentKey);
      return;
    }

    // P4: Check assessment status
    const statusCheck = await this.checkAssessmentStatus();
    if (!statusCheck.allowed) {
      this.showError(statusCheck.message);
      return;
    }

    // P4: Handle login if required
    if (statusCheck.requiresLogin) {
      this.showLoginForm();
      return;
    }

    this.proceedWithAssessmentStart();
  }

  proceedWithAssessmentStart() {
    this.questions = this.assessment.questions;
    this.answers = {};
    this.currentQuestionIndex = 0;

    // P3.2: Save lead then create session
    if (this.supabase) {
      this.saveLead().then(() => {
        if (this.currentLeadId) {
          this.saveSession().catch(() => {});
        }
      });
    }

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

    const qCard = document.querySelector('.question-card');
    if (qCard) qCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

        // P3.2: Update session question progress
        this.updateSessionProgress();

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

  // ========== P4.5: ANTI-SPAM TIMER ==========
  async checkDuplicateSubmission() {
    if (!this.supabase || (!this.metadata.email && !this.metadata.phone)) {
      return { allowed: true };
    }
    try {
      let result = null;
      if (this.metadata.email) {
        const res = await this.supabase.select('leads', { 
          filter: { email: this.metadata.email }, 
          order: { column: 'created_at', direction: 'desc' }, 
          limit: 1 
        });
        if (res && res.length > 0) result = res[0];
      }
      if (!result && this.metadata.phone) {
        const res = await this.supabase.select('leads', { 
          filter: { phone: this.metadata.phone }, 
          order: { column: 'created_at', direction: 'desc' }, 
          limit: 1 
        });
        if (res && res.length > 0) result = res[0];
      }

      if (!result) return { allowed: true };

      const now = new Date();
      const created = new Date(result.created_at);
      const diffMs = now - created;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMins = diffMs / (1000 * 60);

      if (result.completed) {
        if (diffHours < 48) {
          return { allowed: false, message: 'لقد أكملت هذا التقييم مؤخراً. يرجى المحاولة بعد 48 ساعة.' };
        }
      } else {
        if (diffMins < 10) {
          return { allowed: false, message: 'لديك تقييم قيد التقدم. يرجى الانتظار 10 دقائق أو أكمل التقييم الحالي.' };
        }
      }
      return { allowed: true };
    } catch (err) {
      console.warn('[app.js] checkDuplicateSubmission error:', err);
      return { allowed: true };
    }
  }

  // ========== P4: ADMIN CONTROL ==========
  async checkAssessmentStatus() {
    if (!this.supabase) return { allowed: true };
    try {
      const res = await this.supabase.select('assessment_settings', { 
          filter: { assessment_type_id: this.currentAssessmentKey } 
      });
      if (!res || res.length === 0) {
        return { allowed: true };
      }
      const settings = res[0];

      if (!settings.is_active) {
        return { allowed: false, requiresLogin: false, message: 'هذا التقييم مغلق حالياً.' };
      }

      if (settings.is_paid) {
        return { allowed: false, requiresLogin: true, message: '' };
      }

      return { allowed: true };
    } catch (err) {
      console.warn('[app.js] checkAssessmentStatus error:', err);
      return { allowed: true };
    }
  }

  async verifyUser(username, password) {
    if (!this.supabase) return false;
    try {
      const res = await this.supabase.select('assessment_users', { 
        filter: { assessment_type_id: this.currentAssessmentKey, username: username } 
      });
      if (!res || res.length === 0) return false;

      const user = res[0];

      if (user.password !== password) return false;

      const now = new Date();
      const expires = new Date(user.expires_at);
      if (now > expires) return false;

      if (user.used_count >= user.max_uses) return false;

      await this.supabase.update('assessment_users', { used_count: user.used_count + 1 }, { id: user.id });
      return true;
    } catch (err) {
      console.error('[app.js] verifyUser error:', err);
      return false;
    }
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
          <p style="color:#6b7280;margin-bottom:20px;">هذا التقييم محمي. أدخل بيانات الدخول التي حصلت عليها من الإدارة.</p>
          <input type="text" id="login-username" class="form-input" placeholder="اسم المستخدم" style="margin-bottom:12px;text-align:center;">
          <input type="password" id="login-password" class="form-input" placeholder="كلمة المرور" style="margin-bottom:8px;text-align:center;">
          <div id="login-error" style="color:#ef4444;font-size:0.9rem;margin-bottom:12px;min-height:20px;"></div>
          <button id="btn-login" class="btn btn-primary" style="width:100%;">دخول</button>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.style.display = 'flex';
      document.getElementById('login-error').textContent = '';
      document.getElementById('login-username').value = '';
      document.getElementById('login-password').value = '';
    }

    const verifyBtn = document.getElementById('btn-login');
    const newBtn = verifyBtn.cloneNode(true);
    verifyBtn.parentNode.replaceChild(newBtn, verifyBtn);

    newBtn.addEventListener('click', async () => {
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');

      if (!username || !password) {
        errorDiv.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور.';
        return;
      }

      const isValid = await this.verifyUser(username, password);
      if (isValid) {
        this.hideLoginForm();
        this.proceedWithAssessmentStart();
      } else {
        errorDiv.textContent = 'اسم المستخدم أو كلمة المرور غير صحيح، أو انتهت صلاحية الاستخدام.';
      }
    });
  }

  hideLoginForm() {
    const modal = document.getElementById('login-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // ========== P3.2: SESSION TRACKING ==========
  updateSessionProgress() {
    if (!this.supabase || !this.currentSessionId) return;
    this.supabase.update('sessions', { current_question: this.currentQuestionIndex }, { id: this.currentSessionId }).catch(err => console.warn('[app.js] updateSessionProgress failed:', err));
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
        assessment_type_id: this.currentAssessmentKey,
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
          // P3.2: Update session status to completed
          if (this.currentSessionId) {
            await this.supabase.update('sessions', { status: 'completed' }, { id: this.currentSessionId });
          }

          // Step 3: Save answers
          await this.saveAnswers();

          // Step 4: Save scores
          await this.saveScores(results);

          // Step 5: Update lead with final results
          await this.updateLeadWithResults(results);

          console.log('[app.js] All data saved to Supabase successfully');
        } catch (saveErr) {
          console.error('[app.js] Supabase save error (non-fatal):', saveErr);
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

    // P5: Inject Print Styles (only once)
    if (!document.getElementById('dynamic-print-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-print-styles';
      style.textContent = `
        @media print {
          .btn-group, .top-bar, #view-ev-simulator, .ev-simulator-section, #btn-ev-simulator, #charts-container { display: none !important; }
          .form-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #eee !important; }
          body { background: white !important; }
          .hidden { display: none !important; }
        }
      `;
      document.head.appendChild(style);
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
          <div class="axis-score-info">
            <div class="axis-score-name">${axis ? axis.name_ar : aid}</div>
            <div class="axis-score-bar-bg"><div class="axis-score-bar-fill" style="width:${score}%;background:${barColor}"></div></div>
          </div>
          <div class="axis-score-value">${score.toFixed(1)}%</div>
        `;
        axesContainer.appendChild(row);
      });
    }

    // P6: Add Charts Container if not exists
    let chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
      chartsContainer = document.createElement('div');
      chartsContainer.id = 'charts-container';
      chartsContainer.className = 'form-card hidden fade-in';
      chartsContainer.style.marginTop = '20px';
      if (axesContainer && axesContainer.parentNode) {
        axesContainer.parentNode.insertBefore(chartsContainer, axesContainer.nextSibling);
      } else {
        document.getElementById('view-results')?.appendChild(chartsContainer);
      }
    }

    // P6: Render Bar Chart
    if (res.axisScores) {
      const assessment = this.getActiveAssessment() || this.assessment;
      const axes = assessment?.axes || [];
      const chartData = Object.entries(res.axisScores).map(([aid, score]) => {
        const axis = axes.find(a => a.id === aid);
        return { label: axis ? axis.name_ar : aid, value: score };
      });
      this.renderBarChart('charts-container', chartData, 'مقارنة أداء المحاور');
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
          <div style="font-size:0.85rem;color:#6b7280;">${kpiInfo.name}</div>
          <div style="font-size:0.8rem;color:#9ca3af;">${kpiInfo.short_name}</div>
          <div style="font-size:1.5rem;font-weight:800;color:#134e4a;margin-top:4px;">${v.toFixed(1)}</div>
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
          <h4 style="margin-top:12px;">💪 نقطة القوة: ${strongAxis ? strongAxis.name_ar : strongest[0]}</h4>
          <p>أداء متميز (${strongest[1].toFixed(1)}%). حافظ على هذا المستوى واستخدمه كنموذج للمحاور الأخرى.</p>
        `;
        recContainer.appendChild(box);
      }
    }

    // EV Simulator
    const assessment = this.getActiveAssessment() || this.assessment;
    const evEnabled = assessment?.simulator?.enabled === true;
    const evSection = document.getElementById('btn-ev-simulator')?.closest('.form-card');
    if (evSection) {
      if (evEnabled) evSection.classList.remove('hidden');
      else evSection.classList.add('hidden');
    }

    // Leakage Index
    const leakageEl = document.getElementById('leakage-index');
    if (leakageEl && res.leakageIndex !== undefined) {
      leakageEl.textContent = res.leakageIndex + '%';
      leakageEl.classList.remove('hidden');
    }

    // P5: Add Export CSV Button
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

  createKPIContainer(parent) {
    const div = document.createElement('div');
    div.id = 'kpis-container';
    div.className = 'form-card hidden';
    div.style.marginBottom = '20px';
    parent.insertBefore(div, parent.children[2]);
    return div;
  }

  // ========== P5: EXPORT CSV ==========
  exportToCSV() {
    const assessment = this.getActiveAssessment() || this.assessment;
    const axes = assessment?.axes || [];

    let csv = '﻿';
    csv += 'الاسم,العيادة,الدولة,التخصص,التاريخ
';
    csv += `"${this.metadata.name}","${this.metadata.clinic}","${this.metadata.country}","${this.metadata.specialty}","${new Date().toLocaleDateString('ar-EG')}"

`;

    csv += 'المحور,السؤال,الدرجة
';

    const getScoreLabel = (val) => {
      if (val === 100) return 'ممتاز';
      if (val === 40) return 'متوسط';
      if (val === 0) return 'ضعيف';
      return val !== undefined ? val : 'لم يتم الإجابة';
    };

    for (const q of this.questions) {
      const axis = axes.find(a => a.id === q.axis_id);
      const axisName = axis ? axis.name_ar : q.axis_id;
      const answerVal = this.answers[q.id];
      const answerLabel = getScoreLabel(answerVal);
      const questionText = q.text.replace(/"/g, '""');
      csv += `"${axisName}","${questionText}","${answerLabel}"
`;
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

  // ========== P6: CSS CHARTS ==========
  renderBarChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container || !data || data.length === 0) return;

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
      row.style.cssText = 'margin-bottom: 12px;';
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;font-weight:600;">
          <span>${item.label}</span>
          <span style="color:${color}">${item.value.toFixed(1)}%</span>
        </div>
        <div style="width:100%;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:6px;transition:width 0.5s ease;"></div>
        </div>
      `;
      container.appendChild(row);
    });
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
    if (calcBtn) calcBtn.addEventListener('click', () => this.calculateEV());

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
      } catch (e) { console.error('EV engine calc failed:', e); }
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
    if (btn) btn.addEventListener('click', () => window.print());
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ClinicEvaluatorApp();
  window.app.init();
});

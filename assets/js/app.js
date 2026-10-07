/**
 * Clinic Evaluator — app.js v7.4 (CORE FULL REFACTOR + Cloud Adapter + Absolute Paths)
 * ================================================================
 * الالتزام التام بقوانين العمل: 
 * 1. فصل نص السؤال الأصلي تماماً عن الخيار المختار في قاعدة البيانات.
 * 2. الحفاظ الكامل على المحرك الحسابي دون أي تعديل لمعادلاته.
 * 3. جعل حسابات المحاور ديناميكية بالكامل لتعمل مع أي تقييم دون كود صلب.
 * ================================================================
 */

class ClinicEvaluatorApp {
  constructor() {
    this.config = null;
    this.texts = null;
    this.engine = null;
    this.supabase = null;
    this.assessmentAccessToken = null;
    this.assessmentAccessUser = null;

    this.currentAssessmentKey = null;
    this.assessmentUuid = null; 
    this.assessment = null;
    this.questions = [];
    this.answers = {}; // { qid: { index, value } }
    this.currentQuestionIndex = 0;
    this.metadata = {};

    this.currentLeadId = null;
    this.currentSessionId = null;
    this.errorShown = false;
    this.previousScore = null;
    this.previousSessionData = null;
    this.evDefaults = { flow: 50, visits: 3, avg: 50, years: 3, referral: 0 }; 
  }

  /* ─────────────── INITIALIZATION ─────────────── */


  async init() {
    try {
      this.currentAssessmentKey = window.preSelectedAssessment;
      this.supabase = window.supabaseClient || null;
      if (!this.supabase || !this.currentAssessmentKey) throw new Error('Assessment runtime is unavailable.');

      await Promise.all([this.loadConfig(), this.loadTexts()]);

      this.setupLeadForm();
      this.setupNavigation();
      this.setupEVSimulator();
      this.setupPrint();
      this.setupKeyboardShortcuts();

      this.assessment = this.getActiveAssessment();
      if (!this.assessment) throw new Error('Assessment content not found.');

      this.questions = this.assessment.questions || [];
      this.assessmentUuid = this.assessment.id || null;
      this.loadEVDefaultsFromConfig();

      const hasSession = await this.checkExistingSession();
      if (hasSession) {
        this.hideView('view-lead-form');

        if (this.completedResult) {
          this.renderResults(this.completedResult);
          return;
        }

        this.showView('view-assessment');
        this.renderQuestion();
        this.updateProgress();
        this.updateNavButtons();
        return;
      }

      const status = await this.checkAssessmentStatus();
      if (!status.allowed) {
        this.showError(status.message);
        return;
      }
      if (status.requiresLogin) {
        this.showLoginForm();
        return;
      }
      this.showView('view-lead-form');
    } catch (err) {
      console.error('[app] Init failed:', err);
      this.showFatalError('فشل تحميل التطبيق. تعذر تحميل محتوى التقييم الآمن من الخادم.');
    }
  }

  /* ─────────────── CLOUD ADAPTER (SSOT) ─────────────── */


  async loadConfig() {
    const data = await this.assessmentAccessRequest('get_content', {
      assessment_key: this.currentAssessmentKey
    });
    this.config = {
      version: String(data.version || 1),
      project: 'CORE System Server Runtime',
      assessment_types: { [data.slug]: data }
    };
  }

  generateAttemptKey() {
    const cryptoApi = globalThis.crypto || window.crypto;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

    if (cryptoApi?.getRandomValues) {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
      ].join('-');
    }

    // The attempt key is only a coordination identifier, never an auth secret.
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  getSharedAttemptKey() {
    const keyName = 'assessment_attempt_key_' + this.currentAssessmentKey;
    try {
      let key = localStorage.getItem(keyName);
      if (!key) {
        key = this.generateAttemptKey();
        localStorage.setItem(keyName, key);
      }
      return key;
    } catch (err) {
      // Some browser/privacy modes block localStorage. A per-tab key keeps the
      // assessment usable; when storage is available, the normal path remains shared.
      console.warn('[app] shared attempt key unavailable:', err);
      return 'tab-' + this.generateAttemptKey();
    }
  }

  clearSharedAttemptKey() {
    const keyName = 'assessment_attempt_key_' + this.currentAssessmentKey;
    try {
      localStorage.removeItem(keyName);
    } catch (err) {
      console.warn('[app] shared attempt key cleanup failed:', err);
    }
  }

  async assessmentAccessRequest(action, data = {}) {
    if (!this.supabase?.url || !this.supabase?.anonKey) {
      throw new Error('Supabase runtime is unavailable.');
    }

    const response = await fetch(this.supabase.url + '/functions/v1/assessment-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.supabase.anonKey,
        'Authorization': 'Bearer ' + this.supabase.anonKey
      },
      body: JSON.stringify({ action, data })
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = { error: 'Invalid server response' };
    }
    if (!response.ok || !payload?.success) {
      const error = new Error(payload?.error || 'Assessment server request failed');
      error.status = response.status;
      throw error;
    }
    return payload.data;
  }

  async loadTexts() {
    const res = await fetch('/assets/data/report_texts.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    this.texts = await res.json();
  }


  loadEVDefaultsFromConfig() {
    this.evDefaults = { flow: 50, visits: 3, avg: 50, years: 3, referral: 0 };
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

  /* ─────────────── UI VIEWS CONTROLLER ─────────────── */

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
      div.style.cssText = 'background:#fef2f2;border:2px solid #ef4444;border-radius:16px;padding:40px;margin:40px auto;max-width:600px;text-align:center;font-family:inherit;';
      document.querySelector('.container')?.appendChild(div);
    }
    div.innerHTML = `<h2>⚠️ خطأ في النظام التقني</h2><p>${msg}</p>`;
    div.classList.remove('hidden');
  }

  showError(msg) {
    let toast = document.getElementById('error-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'error-toast';
      toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#991b1b;color:white;padding:16px 24px;border-radius:12px;z-index:9999;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);transition:all 0.3s;opacity:0;font-family:inherit;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 4000);
  }

  /* ─────────────── METADATA LEAD FORM ─────────────── */

  setupLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.collectMetadata();

      await this.startAssessmentFlow();
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

  /* ─────────────── ASSESSMENT FLOW WITH AUTO SESSION ─────────────── */


  async startAssessmentFlow() {
    this.questions = this.assessment.questions || [];
    this.answers = {};
    this.currentQuestionIndex = 0;

    if (!this.assessmentUuid) {
      this.showError('تعذر تحديد نوع التقييم.');
      return;
    }

    try {
      this.showLoadingGlobal(true);

      if (!this.assessmentAccessToken) {
        if (this.assessment?.requires_login) {
          throw new Error('يرجى تسجيل الدخول أولاً.');
        }
        const publicAccess = await this.assessmentAccessRequest('issue_public_access', {
          assessment_key: this.currentAssessmentKey
        });
        this.assessmentAccessToken = publicAccess.token;
      }

      const result = await this.assessmentAccessRequest('start_session', {
        token: this.assessmentAccessToken,
        attempt_key: this.getSharedAttemptKey(),
        lead: {
          assessment_type_id: this.assessmentUuid,
          full_name: this.metadata.name || 'طبيب غير معروف',
          email: this.metadata.email || null,
          phone: this.metadata.phone || null,
          clinic_name: this.metadata.clinic || null,
          country: this.metadata.country || null,
          specialty: this.metadata.specialty || null,
          years: this.metadata.years || null,
          team: this.metadata.team || null,
          source: window.location.pathname,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null
        }
      });

      this.currentSessionId = result.session_id;
      this.currentLeadId = result.lead_id || null;
      this.previousSessionData = result.previous_session || null;
      this.previousScore = this.previousSessionData?.overallScore ?? null;

      sessionStorage.setItem(
        'assessment_access_' + this.currentAssessmentKey,
        JSON.stringify({
          token: this.assessmentAccessToken,
          timestamp: Date.now(),
          expires_at: result.expires_at || null
        })
      );
    } catch (err) {
      console.error('[app] startAssessmentFlow failed:', err);
      this.showError(err.message || 'تعذر بدء جلسة التقييم.');
      return;
    } finally {
      this.showLoadingGlobal(false);
    }

    this.hideView('view-lead-form');
    this.showView('view-assessment');
    document.getElementById('view-assessment')?.classList.add('fade-in');
    this.renderQuestion();
    this.updateProgress();
    this.updateNavButtons();
  }

  /* ─────────────── RENDER QUESTIONS — INDEX-BASED ─────────────── */


  renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;

    const q = this.questions[this.currentQuestionIndex];
    if (!q) { this.showFatalError('لا توجد أسئلة متاحة في ملف التكوين.'); return; }

    const num = this.currentQuestionIndex + 1;
    const total = this.questions.length;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    let optsHtml = '';
    (q.options || []).forEach((opt, i) => {
      const sel = (this.answers[q.id]?.index === i) ? 'sel' : '';
      const letter = letters[i] || (i + 1);
      optsHtml += `<div class="opt ${sel}" data-index="${i}"><div class="opt-letter">${letter}</div><div>${opt.label}</div></div>`;
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
      opt.addEventListener('click', async () => {
        const idx = parseInt(opt.dataset.index, 10);
        if (!Number.isInteger(idx)) return;

        this.answers[qid] = { index: idx };
        container.querySelectorAll('.opt').forEach((o, i) => o.classList.toggle('sel', i === idx));
        this.updateProgress();

        try {
          await this.saveAnswerToServer(qid, idx, this.currentQuestionIndex);
          if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
            this.updateProgress();
            this.updateNavButtons();
          }
        } catch (err) {
          console.error('[app] save answer failed:', err);
          this.showError(err.message || 'تعذر حفظ الإجابة. يرجى المحاولة مرة أخرى.');
        }
      });
    });
  }

  /* ─────────────── ENGINE BRIDGE ─────────────── */

  getAnswersForEngine() {
    return {};
  }

  /* ─────────────── NAVIGATION CONTROLS ─────────────── */

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
    if (this.answers[q.id] === undefined) { this.shakeQuestion(); this.showError('يرجى اختيار إجابة للانتقال'); return; }

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
      else if (/^[a-z0-9]$/i.test(e.key)) {
        const q = this.questions[this.currentQuestionIndex];
        if (!q?.options) return;

        let idx = -1;
        const key = e.key.toLowerCase();

        // Map letter to index (a=0, b=1, ...)
        if (/^[a-z]$/.test(key)) {
          idx = key.charCodeAt(0) - 'a'.charCodeAt(0);
        }
        // Map number to index (1=0, 2=1, ...)
        else if (/^[0-9]$/.test(key)) {
          idx = parseInt(key) - 1;
          if (key === '0') idx = 9; // 0 = 10th option
        }

        if (idx >= 0 && idx < q.options.length) {
          this.answers[q.id] = { index: idx, value: q.options[idx].value };
          const opts = document.querySelectorAll('#question-container .opt');
          opts.forEach((o, i) => o.classList.toggle('sel', i === idx));
          this.updateProgress();

          const questionId = q.id;
          const questionIndex = this.currentQuestionIndex;
          this.saveAnswerToServer(questionId, idx, questionIndex)
            .then(() => {
              if (this.questions[this.currentQuestionIndex]?.id === questionId) {
                this.goNext();
              }
            })
            .catch((err) => {
              console.error('[app] keyboard save answer failed:', err);
              this.showError(err.message || 'تعذر حفظ الإجابة. يرجى المحاولة مرة أخرى.');
            });
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
    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    if (prev) prev.disabled = this.currentQuestionIndex === 0;
    if (next) next.textContent = (this.currentQuestionIndex === this.questions.length - 1) ? 'إرسال التقييم وعرض النتائج ✅' : 'التالي ←';
  }

  shakeQuestion() {
    const card = document.querySelector('.question-card');
    if (card) { card.style.animation = 'shake 0.5s ease'; setTimeout(() => card.style.animation = '', 600); }
  }

  /* ─────────────── ANTI-SPAM & BASELINE DETECTOR ─────────────── */

  /* ─────────────── LOGIN SYSTEM ─────────────── */


  async checkAssessmentStatus() {
    return {
      allowed: Boolean(this.assessment),
      requiresLogin: Boolean(this.assessment?.requires_login)
    };
  }


  async verifyUser(username, password) {
    try {
      const result = await this.assessmentAccessRequest('authenticate', {
        assessment_key: this.currentAssessmentKey,
        username,
        password
      });

      this.assessmentAccessToken = result.token;
      this.assessmentAccessUser = result.user || null;

      sessionStorage.setItem(
        'assessment_access_' + this.currentAssessmentKey,
        JSON.stringify({
          token: this.assessmentAccessToken,
          timestamp: Date.now(),
          expires_at: result.expires_at || null
        })
      );

      return true;
    } catch (err) {
      console.warn('[app] authentication failed:', err);
      return false;
    }
  }


  projectStoredResult(row) {
    const structured = row?.result;
    if (!structured) return null;

    const axisScores = {};
    for (const axis of structured?.scores?.axes || []) {
      if (Number.isFinite(axis?.score)) {
        axisScores[String(axis.axisCode)] = Number(axis.score);
      }
    }

    const kpis = {};
    for (const kpi of structured?.kpis || []) {
      if (kpi?.status !== 'unavailable' && Number.isFinite(kpi?.value)) {
        kpis[String(kpi.kpiCode)] = Number(kpi.value);
      }
    }

    return {
      overallScore: Number.isFinite(structured?.scores?.overallScore)
        ? Number(structured.scores.overallScore)
        : null,
      classification: structured?.classification?.bandCode || null,
      axisScores,
      kpis,
      evSimulator: null,
      traps: [],
      structuredResult: structured,
      provenance: row
        ? {
            assessmentVersion: row.assessment_version,
            interpretationVersion: row.interpretation_version,
            scoringEngineVersion: row.scoring_engine_version,
            scoringContractVersion: row.scoring_contract_version,
            assessmentConfigDigest: row.assessment_config_digest,
            calculatedAt: row.calculated_at,
          }
        : null,
      already_completed: true,
      session_id: this.currentSessionId,
      assessment_version: this.assessment?.version || structured?.identity?.assessmentVersion || null,
    };
  }

  async checkExistingSession() {
    const key = 'assessment_access_' + this.currentAssessmentKey;
    const stored = sessionStorage.getItem(key);
    if (!stored) return false;

    try {
      const data = JSON.parse(stored);
      if (!data?.token) {
        sessionStorage.removeItem(key);
        return false;
      }
      if (data.expires_at && new Date(data.expires_at) <= new Date()) {
        sessionStorage.removeItem(key);
        return false;
      }

      const result = await this.assessmentAccessRequest('get_session', { token: data.token });
      this.assessmentAccessToken = data.token;
      this.currentSessionId = result.session?.id || null;
      this.currentLeadId = result.session?.lead_id || null;
      this.currentQuestionIndex = Number(result.session?.current_question || 0);

      this.answers = {};
      for (const answer of result.answers || []) {
        this.answers[answer.question_id] = { index: Number(answer.option_index) };
      }

      this.completedResult = null;
      if (result.session?.status === 'completed' && result.result?.result) {
        this.completedResult = this.projectStoredResult(result.result);
      }

      return Boolean(this.currentSessionId);
    } catch (err) {
      console.warn('[app] existing assessment session invalid:', err);
      sessionStorage.removeItem(key);
      return false;
    }
  }

  async simpleHash(str) {
    return '';
  }

  showLoginForm() {
    let modal = document.getElementById('login-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'login-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
          <h3 style="color:#e8b923;margin-bottom:12px;font-family:inherit;font-size:1.4rem;">🔐 تقييم محمي</h3>
          <p style="color:#94a3b8;margin-bottom:20px;font-family:inherit;font-size:0.95rem;line-height:1.5;">هذا التقييم مغلق حالياً. يرجى إدخال اسم المستخدم وكلمة المرور الممنوحة لك لتفعيل النظام.</p>
          
          <input type="text" id="login-username" placeholder="اسم المستخدم" style="width:100%;padding:14px;margin-bottom:14px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;border-radius:8px;text-align:center;font-family:inherit;font-size:1rem;">
          <input type="password" id="login-password" placeholder="كلمة المرور" style="width:100%;padding:14px;margin-bottom:12px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;border-radius:8px;text-align:center;font-family:inherit;font-size:1rem;">
          
          <div id="login-error" style="color:#ef4444;font-size:0.9rem;margin-bottom:16px;min-height:20px;font-family:inherit;font-weight:500;"></div>
          <button id="btn-login" style="width:100%;padding:14px;background:#1a5f7a;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-family:inherit;font-size:1rem;transition:background 0.2s;">تحقق وتأكيد الحساب</button>
          
          <div style="margin-top:24px; padding-top:20px; border-top:1px solid #334155;">
            <p style="color:#94a3b8; font-size:0.85rem; margin-bottom:12px;">للحصول على بيانات الدخول الفورية للعيادة، يمكنك التواصل معنا مباشرة:</p>
            <a href="https://wa.me/962786595990?text=مرحباً،%20أود%20الحصول%20على%20كود%20تفعيل%20تقييم%20شيفرة%20العيادة" 
               target="_blank" 
               style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; background:#25D366; color:white; border-radius:8px; font-weight:700; text-decoration:none; font-size:0.95rem; font-family:inherit; transition:background 0.2s;">
               💬 طلب كود التفعيل عبر الواتساب
            </a>
          </div>
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
      if (!u || !p) { err.textContent = 'يرجى ملء الحقول المطلوبة.'; return; }
      
      this.showLoadingGlobal(true);
      const isVerified = await this.verifyUser(u, p);
      this.showLoadingGlobal(false);

      if (isVerified) {
        sessionStorage.setItem('assessment_auth_' + this.currentAssessmentKey, JSON.stringify({
          username: u, timestamp: Date.now()
        }));
        this.hideLoginForm();
        this.showView('view-lead-form'); 
      } else { 
        err.textContent = 'بيانات الدخول غير صحيحة، أو انتهت صلاحية هذا الاستخدام.'; 
      }
    });
  }

  hideLoginForm() {
    const m = document.getElementById('login-modal');
    if (m) m.style.display = 'none';
  }

  /* ─────────────── SUPABASE DATA LAYER ─────────────── */


  async updateSessionProgress() {
    if (!this.assessmentAccessToken || !this.currentSessionId) return;
    try {
      await this.assessmentAccessRequest('update_progress', {
        token: this.assessmentAccessToken,
        current_question: this.currentQuestionIndex
      });
    } catch (err) {
      console.warn('[app] progress sync failed:', err);
    }
  }

  async saveAnswerToServer(questionId, optionIndex, currentQuestion) {
    return this.assessmentAccessRequest('save_answer', {
      token: this.assessmentAccessToken,
      question_id: questionId,
      option_index: optionIndex,
      current_question: currentQuestion
    });
  }

  /* Browser no longer writes leads, sessions, answers, or scores directly. */
  /* ─────────────── COMPUTATION & RESULTS ─────────────── */


  async submitAssessment() {
    this.hideView('view-assessment');
    this.showView('view-loading');
    document.getElementById('view-loading')?.classList.add('fade-in');

    const bar = document.getElementById('load-bar');
    const status = document.getElementById('load-status');
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      if (bar) bar.style.width = progress + '%';
      if (status) status.textContent = Math.round(progress) + '%';
    }, 200);

    try {
      const results = await this.assessmentAccessRequest('complete', {
        token: this.assessmentAccessToken
      });

      clearInterval(interval);
      if (bar) bar.style.width = '100%';
      if (status) status.textContent = '100%';

      this.clearSharedAttemptKey();
      setTimeout(() => {
        this.hideView('view-loading');
        this.renderResults(results);
      }, 300);
    } catch (err) {
      clearInterval(interval);
      this.showView('view-assessment');

      if (Number(err?.status) === 409) {
        this.showError(err.message || 'لا يمكن إرسال التقييم بهذه الحالة. يرجى مراجعة الإجابات ثم إعادة الإرسال.');
        this.renderQuestion();
        this.updateProgress();
        this.updateNavButtons();
        return;
      }

      this.showFatalError('حدث خطأ فني أثناء معالجة التقرير الخادمي: ' + (err.message || 'Unknown error'));
    }
  }

  renderResults(res) {
    this.showView('view-results');
    document.getElementById('view-results')?.classList.add('fade-in');

    const report = res?.report;
    const structured = res?.structuredResult;

    if (!report || !structured) {
      throw new Error('The server returned no validated report projection.');
    }

    const bandCode = report.overall.bandCode || 'Q2';
    const bandText =
      this.texts?.quartiles?.[bandCode] || {
        label: 'النتيجة التشغيلية',
      };
    const score = Number.isFinite(report.overall.score)
      ? Number(report.overall.score).toFixed(1)
      : '—';

    const circle = document.getElementById('result-score-circle');
    if (circle) {
      circle.classList.remove('q1', 'q2', 'q3', 'q4');
      circle.classList.add(String(bandCode).toLowerCase());
    }

    const scoreVal = document.getElementById('result-score-value');
    if (scoreVal) scoreVal.textContent = score + '%';

    const scoreLabel = document.getElementById('result-score-label');
    if (scoreLabel) scoreLabel.textContent = bandText.label;

    const title = document.getElementById('result-title');
    if (title) title.textContent = bandText.label;

    const body = document.getElementById('result-body');
    if (body) {
      body.innerHTML =
        `<div>درجتك الكلية للعيادة: ${score} من 100 — ${bandText.label}</div>`;
    }

    const axesContainer = document.getElementById('axes-scores');
    if (axesContainer) {
      axesContainer.innerHTML = '';
      const axes = this.assessment?.axes || [];

      for (const axis of structured.scores?.axes || []) {
        if (axis.status !== 'measured' || !Number.isFinite(axis.score)) continue;

        const axisMeta = axes.find(item => item.id === axis.axisCode);
        const qClass = String(axis.grade || 'Q2').toLowerCase();
        const row = document.createElement('div');
        row.className = 'axis-score-row fade-in';

        const width = Math.max(0, Math.min(100, Number(axis.score)));
        row.innerHTML =
          `<div class="axis-score-info"><div class="axis-score-name">${axisMeta ? axisMeta.name_ar : axis.axisCode}</div><div class="axis-score-bar-bg"><div class="axis-score-bar-fill ${qClass}" style="width:${width}%;"></div></div></div><div class="axis-score-value">${Number(axis.score).toFixed(1)}%</div>`;

        axesContainer.appendChild(row);
      }
    }

    this.renderVisualBenchmark(report, structured.scores?.axes || []);

    const trapsContainer = document.getElementById('traps-container');
    if (trapsContainer) {
      trapsContainer.innerHTML = '';
      trapsContainer.classList.add('hidden');
    }

    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
      recContainer.innerHTML = '';
      const priority = report.priority;
      if (priority.category === 'PRIORITY_AXIS_REVIEW' && priority.sourceAxisCode) {
        recContainer.classList.remove('hidden');

        const axisMeta = (this.assessment?.axes || []).find(
          item => item.id === priority.sourceAxisCode
        );
        const template =
          this.texts?.ui?.simulator?.report_priority ||
          'الأولوية التشغيلية: {axis} — هذا هو أدنى محور مقاس حالياً بنسبة {pct}%';
        const text = template
          .replace('{axis}', axisMeta ? axisMeta.name_ar : priority.sourceAxisCode)
          .replace('{pct}', Number(priority.score).toFixed(1));

        const box = document.createElement('div');
        box.className = 'insight-box fade-in';
        box.innerHTML = `<h4>🎯 أولوية المراجعة التشغيلية</h4><p>${text}</p>`;
        recContainer.appendChild(box);
      } else {
        recContainer.classList.add('hidden');
      }
    }

    const evEnabled = this.assessment?.simulator?.enabled === true;
    const evSection =
      document.getElementById('btn-ev-simulator')?.closest('.form-card');
    if (evSection) evSection.classList.toggle('hidden', !evEnabled);
  }

  /* ─────────────── UNIFIED VISUAL BENCHMARKING ─────────────── */

  renderVisualBenchmark(report, axes) {
    const oldCharts = document.getElementById('charts-container');
    const oldKpis = document.getElementById('kpis-container');
    if (oldCharts) oldCharts.remove();
    if (oldKpis) oldKpis.remove();

    let benchmarkContainer = document.getElementById('benchmark-container');
    if (!benchmarkContainer) {
      benchmarkContainer = document.createElement('div');
      benchmarkContainer.id = 'benchmark-container';
      benchmarkContainer.className = 'form-card fade-in';
      benchmarkContainer.style.marginTop = '20px';

      const axesContainer = document.getElementById('axes-scores');
      axesContainer?.parentNode?.insertBefore(
        benchmarkContainer,
        axesContainer.nextSibling
      );
    }

    benchmarkContainer.innerHTML =
      '<h3 class="card-title">📊 التحليل البصري الشامل</h3>';

    const measuredAxes = axes.filter(
      axis => axis.status === 'measured' && Number.isFinite(axis.score)
    );

    if (measuredAxes.length) {
      const chartDiv = document.createElement('div');
      chartDiv.style.marginBottom = '24px';

      const axisMeta = this.assessment?.axes || [];
      measuredAxes.forEach(axis => {
        const meta = axisMeta.find(item => item.id === axis.axisCode);
        const row = document.createElement('div');
        row.style.marginBottom = '12px';

        const qClass = String(axis.grade || 'Q2').toLowerCase();
        const width = Math.max(0, Math.min(100, Number(axis.score)));

        row.innerHTML =
          `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;font-weight:600;"><span>${meta ? meta.name_ar : axis.axisCode}</span><span class="${qClass}-text">${Number(axis.score).toFixed(1)}%</span></div><div style="width:100%;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden;"><div class="${qClass}" style="width:${width}%;height:100%;border-radius:6px;transition:width 0.5s ease;"></div></div>`;

        chartDiv.appendChild(row);
      });

      benchmarkContainer.appendChild(chartDiv);
    }

    if (report?.kpis?.length) {
      const kpiGrid = document.createElement('div');
      kpiGrid.style.cssText =
        'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;';

      report.kpis.forEach(kpi => {
        const info =
          this.texts?.kpis?.[kpi.kpiCode] || {
            name: kpi.kpiCode,
            short_name: kpi.kpiCode
          };
        const card = document.createElement('div');
        card.style.cssText =
          'background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;';
        card.innerHTML =
          `<div style="font-size:0.85rem;color:#6b7280;">${info.name}</div><div style="font-size:0.8rem;color:#9ca3af;">${info.short_name}</div><div style="font-size:1.5rem;font-weight:800;color:#134e4a;margin-top:4px;">${Number(kpi.value).toFixed(1)}</div>`;
        kpiGrid.appendChild(card);
      });

      benchmarkContainer.appendChild(kpiGrid);
    }
  }

  /* ─────────────── EV SIMULATOR ─────────────── */

  setupEVSimulator() {
    const avgEl = document.getElementById('ev-avg');
    const visitsEl = document.getElementById('ev-visits');
    const yearsEl = document.getElementById('ev-years');
    const referralEl = document.getElementById('ev-referral');
    
    if (avgEl) avgEl.value = this.evDefaults.avg;
    if (visitsEl) visitsEl.value = this.evDefaults.visits;
    if (yearsEl) yearsEl.value = this.evDefaults.years;
    if (referralEl) referralEl.value = this.evDefaults.referral;

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

  /**
   * دالة محاكاة القيمة الدائمة مجمّدة لخدمة تقييم رحلة المريض (patient-journey) حالياً حسب توجيهات التجميد الحالية
   */

  async calculateEV() {
    const avg = parseFloat(document.getElementById('ev-avg')?.value) || 0;
    const visits = parseFloat(document.getElementById('ev-visits')?.value) || 0;
    const years = parseFloat(document.getElementById('ev-years')?.value) || 0;

    try {
      const referral = document.getElementById('ev-referral')?.value === '' ? null : parseFloat(document.getElementById('ev-referral')?.value);
      const result = await this.assessmentAccessRequest('calculate_ev', {
        token: this.assessmentAccessToken,
        avg,
        visits,
        years,
        referral
      });

      const current = result.current === null ? null : Number(result.current);
      const opt20 = Number(result.opt20 || 0);
      const opt50 = Number(result.opt50 || 0);

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      };

      setText('ev-current', current === null ? 'غير متاح' : '$' + current.toLocaleString());
      setText('ev-opt20', '$' + opt20.toLocaleString());
      setText('ev-opt50', '$' + opt50.toLocaleString());
      setText('ev-increase20', current === null ? 'غير متاح' : '+$' + (opt20 - current).toLocaleString());
      setText('ev-increase50', current === null ? 'غير متاح' : '+$' + (opt50 - current).toLocaleString());
      document.getElementById('ev-results')?.classList.remove('hidden');
    } catch (err) {
      this.showError(err.message || 'تعذر حساب القيمة الاقتصادية حالياً.');
    }
  }

  /* ─────────────── PRINT HANDLING ─────────────── */

  setupPrint() {
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
  }

  showLoadingGlobal(show) {
    let overlay = document.getElementById('global-sync-loader');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-sync-loader';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);z-index:11000;display:flex;align-items:center;justify-content:center;transition:all 0.3s;';
      overlay.innerHTML = '<div style="width:40px;height:40px;border:4px solid #334155;border-top-color:#e8b923;border-radius:50%;animation:spin 1s linear infinite;"></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = show ? 'flex' : 'none';
  }
}

/* ─────────────── INITIALIZE APPLICATION ─────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ClinicEvaluatorApp();
  window.app.init();
});

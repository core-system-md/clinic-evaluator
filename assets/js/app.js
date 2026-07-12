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
        
        this.loadEVDefaultsFromConfig();
        
        if (this.supabase) {
          const types = await this.supabase.select('assessment_types', { 
            columns: 'id', 
            filter: { slug: this.currentAssessmentKey } 
          });
          if (types && types[0]) {
            this.assessmentUuid = types[0].id;
          }

          const status = await this.checkAssessmentStatus();
          if (!status.allowed) { 
            this.showError(status.message); 
            return; 
          }
          
          if (status.requiresLogin) {
            const hasSession = await this.checkExistingSession();
            if (!hasSession) {
              this.showLoginForm();
              return; 
            }
          }
        }
      }
      
      this.showView('view-lead-form');

    } catch (err) {
      console.error('[app] Init failed:', err);
      this.showFatalError('فشل تحميل التطبيق. تأكد من وجود ملفات الإعدادات والاتصال بالسحابة.');
    }
  }

  /* ─────────────── CLOUD ADAPTER (SSOT) ─────────────── */

  async loadConfig() {
    try {
      const localRes = await fetch('/assets/data/config.json');
      const localConfig = await localRes.json();

      if (!this.supabase) {
        console.warn('[CORE System] Cloud connection unavailable. Falling back to local config.');
        this.config = localConfig;
        return;
      }

      console.log('[CORE System] Fetching dynamic payload from cloud database...');

      const [assessmentsRes, axesRes, questionsRes, optionsRes, trapsRes] = await Promise.all([
        this.supabase.select('assessment_types', { filter: { status: 'published' } }),
        this.supabase.select('axes'),
        this.supabase.select('questions'), 
        this.supabase.select('options'),
        this.supabase.select('traps')
      ]);

      const cloudConfig = {
        version: "2.0.0",
        project: "CORE System Dynamic",
        assessment_types: {}
      };

      if (assessmentsRes && assessmentsRes.length > 0) {
        for (const ast of assessmentsRes) {
          const astAxes = (axesRes || [])
            .filter(a => a.assessment_type_id === ast.id)
            .sort((a, b) => a.display_order - b.display_order)
            .map(a => ({
              id: a.code,
              name_ar: a.title_ar || a.title,
              name_en: a.title,
              weight: parseFloat(a.weight) || 1,
              description: a.description
            }));

          const astQuestions = (questionsRes || [])
            .filter(q => q.assessment_type_id === ast.id)
            .sort((a, b) => a.display_order - b.display_order)
            .map(q => {
              const qOptions = (optionsRes || [])
                .filter(o => o.question_id === q.id)
                .sort((a, b) => a.display_order - b.display_order)
                .map(o => ({
                  label: o.label_ar || o.label,
                  value: parseFloat(o.option_value),
                  is_trap: o.is_trap || false
                }));

              const parentAxis = (axesRes || []).find(a => a.id === q.axis_id);
              const isTrapQuestion = qOptions.some(o => o.is_trap);

              return {
                id: q.code,
                axis_id: parentAxis ? parentAxis.code : '',
                text: q.question_text_ar || q.question_text,
                type: q.question_type || "select",
                layer: q.layer || (isTrapQuestion ? "B" : "A"),
                impact: q.impact || "medium",
                trap_for: q.trap_for || [],
                options: qOptions
              };
            });

          cloudConfig.assessment_types[ast.slug] = {
            title: ast.title_ar,
            subtitle: ast.description,
            question_count: ast.question_count || astQuestions.length,
            axis_count: ast.axis_count || astAxes.length,
            has_traps: ast.has_traps,
            has_ev_simulator: ast.has_ev_simulator,
            simulator: { enabled: ast.has_ev_simulator },
            traps: (trapsRes || []).filter(t => t.assessment_type_id === ast.id).map(t => ({
              name: t.name,
              question_id: t.question_id,
              validates: t.validates,
              target_axis: t.target_axis,
              penalty_base: parseFloat(t.penalty_base) || 0,
              penalty_max: parseFloat(t.penalty_max) || 0,
              message: t.message,
              message_ar: t.message_ar
            })),
            axes: astAxes,
            questions: astQuestions,
            axis_roles: ast.axis_roles || {},
            kpi_mappings: ast.kpi_mappings || {},
            ev_mappings: ast.ev_mappings || {}
          };
        }
      }

      const cloudKeys = Object.keys(cloudConfig.assessment_types || {});
      
      if (cloudKeys.length > 0) {
        console.log('[CORE System] Validation passed. Engine is now running on Cloud Data.');
        this.config = cloudConfig;
      } else {
        console.error('[CORE System] Cloud payload is empty. Falling back to local config.');
        this.config = localConfig;
      }

    } catch (err) {
      console.error('[CORE System] Failed to load config dynamically:', err);
      const localRes = await fetch('/assets/data/config.json');
      this.config = await localRes.json();
    }
  }

  async loadTexts() {
    const res = await fetch('/assets/data/report_texts.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    this.texts = await res.json();
  }

  loadEVDefaultsFromConfig() {
    const simVars = this.assessment?.simulator?.variables || [];
    simVars.forEach(v => {
      if (v.id === 'flow') this.evDefaults.flow = v.default || 50;
      if (v.id === 'ltv') this.evDefaults.ltv = v.default || 5000;
    });
    this.evDefaults.visits = 3;
    this.evDefaults.avg = 50;
    this.evDefaults.years = 3;
    this.evDefaults.referral = 0;
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

      const dup = await this.checkDuplicateSubmission();
      if (!dup.allowed) { this.showError(dup.message); return; }

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
    this.questions = this.assessment.questions;
    this.answers = {};
    this.currentQuestionIndex = 0;

    if (this.supabase && this.assessmentUuid) {
      this.showLoadingGlobal(true);
      const leadId = await this.saveLead();
      if (leadId) {
        await this.saveSession().catch(() => {});
      }
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
    q.options.forEach((opt, i) => {
      const sel = (this.answers[q.id]?.index === i) ? 'sel' : '';
      const letter = letters[i] || (i + 1);
      optsHtml += `<div class="opt ${sel}" data-index="${i}" data-value="${opt.value}"><div class="opt-letter">${letter}</div><div>${opt.label}</div></div>`;
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
        const idx = parseInt(opt.dataset.index);
        const val = parseInt(opt.dataset.value);
        
        this.answers[qid] = { index: idx, value: val };
        
        const opts = container.querySelectorAll('.opt');
        opts.forEach((o, i) => o.classList.toggle('sel', i === idx));
        
        this.updateProgress();
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

  /* ─────────────── ENGINE BRIDGE ─────────────── */

  getAnswersForEngine() {
    const engineAnswers = {};
    for (const [qid, ans] of Object.entries(this.answers)) {
      engineAnswers[qid] = ans.value;
    }
    return engineAnswers;
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

  async checkDuplicateSubmission() {
    if (!this.supabase || (!this.metadata.email && !this.metadata.phone && !this.metadata.name)) return { allowed: true };
    try {
      let lastLeads = [];
      
      if (this.metadata.email) {
        lastLeads = await this.supabase.select('leads', { filter: { email: this.metadata.email } });
      } else if (this.metadata.phone) {
        lastLeads = await this.supabase.select('leads', { filter: { phone: this.metadata.phone } });
      } else {
        lastLeads = await this.supabase.select('leads', { filter: { full_name: this.metadata.name } });
      }

      if (!lastLeads || lastLeads.length === 0) return { allowed: true };

      const completedLeads = lastLeads.filter(l => l.completed).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      if (completedLeads.length >= 2) {
        const lastLead = completedLeads[completedLeads.length - 1];
        const now = Date.now();
        const lastCreated = new Date(lastLead.created_at).getTime();
        const cooldownPeriod = 7 * 24 * 60 * 60 * 1000;
        const elapsed = now - lastCreated;

        if (elapsed < cooldownPeriod) {
          const remainingMs = cooldownPeriod - elapsed;
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          
          return { 
            allowed: false, 
            message: `عذراً دكتور، لقد استنفدت الحد المسموح به للمحاولات المتتالية. سيُعاد تفعيل نظام التقييم لك تلقائياً بعد: ${remainingDays} يوم و ${remainingHours} ساعة.` 
          };
        }
        
        this.previousScore = parseFloat(lastLead.score_percentage);
        
        const sessions = await this.supabase.select('sessions', { 
          filter: { lead_id: lastLead.id },
          order: { column: 'created_at', ascending: false }
        });
        if (sessions && sessions[0]) {
          const prevScores = await this.supabase.select('scores', { 
            filter: { session_id: sessions[0].id } 
          });
          this.previousSessionData = {
            overallScore: this.previousScore,
            axisScores: {},
            completedAt: lastLead.completed_at
          };
          if (prevScores) {
            prevScores.forEach(s => {
              this.previousSessionData.axisScores[s.axis_id] = s.percentage;
            });
          }
        }
      }
      return { allowed: true };
    } catch (err) {
      return { allowed: true };
    }
  }

  /* ─────────────── LOGIN SYSTEM ─────────────── */

  async checkAssessmentStatus() {
    if (!this.supabase) return { allowed: true };
    try {
      const r = await this.supabase.select('assessment_settings', { 
        filter: { assessment_key: this.currentAssessmentKey } 
      });
      if (!r?.[0]) return { allowed: true };
      const s = r[0];
      if (s.auth_enabled) return { allowed: true, requiresLogin: true };
      return { allowed: true };
    } catch (err) { 
      return { allowed: true }; 
    }
  }

  async verifyUser(username, password) {
    if (!this.supabase) return false;
    try {
      const hash = await this.simpleHash(password);
      const r = await this.supabase.select('assessment_users', { 
        filter: { 
          assessment_key: this.currentAssessmentKey, 
          username: username 
        } 
      });
      if (!r?.[0]) return false;
      const u = r[0];
      
      if (u.password_hash !== hash) return false;
      if (!u.active) return false;
      if (u.expires_at && new Date() > new Date(u.expires_at)) return false;
      if (u.used_count >= u.max_uses) return false;
      
      await this.supabase.update('assessment_users', { used_count: u.used_count + 1 }, { id: u.id });
      return true;
    } catch (err) { 
      return false; 
    }
  }

  async checkExistingSession() {
    const session = sessionStorage.getItem('assessment_auth_' + this.currentAssessmentKey);
    if (!session) return false;
    try {
      const data = JSON.parse(session);
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem('assessment_auth_' + this.currentAssessmentKey);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

  updateSessionProgress() {
    if (this.supabase && this.currentSessionId) {
      this.supabase.update('sessions', { current_question: this.currentQuestionIndex }, { id: this.currentSessionId }).catch(() => {});
    }
  }

  async saveLead() {
    if (!this.supabase) return null;
    try {
      const data = {
        assessment_type_id: this.assessmentUuid || this.currentAssessmentKey, 
        full_name: this.metadata.name || 'طبيب غير معروف',
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
      const r = await this.supabase.insert('leads', data);
      if (r?.[0]) { this.currentLeadId = r[0].id; return this.currentLeadId; }
    } catch (err) { console.error('[app] saveLead failed:', err); }
    return null;
  }

  async saveSession() {
    if (!this.supabase || !this.currentLeadId) return null;
    try {
      const data = {
        lead_id: this.currentLeadId,
        assessment_type_id: this.assessmentUuid || this.currentAssessmentKey,
        status: 'in_progress',
        current_question: this.currentQuestionIndex,
        started_at: new Date().toISOString()
      };
      const r = await this.supabase.insert('sessions', data);
      if (r?.[0]) { this.currentSessionId = r[0].id; return this.currentSessionId; }
    } catch (err) { console.error('[app] saveSession failed:', err); }
    return null;
  }

  /**
   * دالة حفظ الإجابات الجماعية المحدثة لتتوافق مع معيار التطهير والفصل (Bulk Insert)
   */
  async saveAnswers() {
    if (!this.supabase || !this.currentSessionId) return;
    try {
      const answersBulkData = [];
      for (const [qid, ans] of Object.entries(this.answers)) {
        const q = this.questions.find(q => q.id === qid);
        if (q) {
          const matchedOption = q.options?.[ans.index];
          const optionLabel = matchedOption ? matchedOption.label : `قيمة: ${ans.value}`;
          
          // حماية نقاء البيانات: إرسال نص السؤال مستقلاً تماماً، وإرسال الرد المختار في حقل منفصل
          answersBulkData.push({
            session_id: this.currentSessionId,
            lead_id: this.currentLeadId,
            question_id: qid,
            axis_id: q.axis_id || '',
            question_text: q.text, // نص السؤال الأصلي فقط نظيف دون أي دمج
            chosen_option_label: optionLabel, // حقن خيار الطبيب في حقل منفصل لخدمة لوحة الإدارة
            option_index: ans.index,
            option_value: ans.value,
            answer_value: ans.value,
            is_trap: q.layer === 'B',
            trap_triggered: false,
            answered_at: new Date().toISOString()
          });
        }
      }
      
      if (answersBulkData.length > 0) {
        // الاستدعاء المباشر عبر تفعيل مصفوفة الإدخال الجماعي لـ supabase-client v3.0
        await this.supabase.insert('answers', answersBulkData);
      }
    } catch (err) { console.error('[app] saveAnswers failed:', err); }
  }

  async saveScores(results) {
    if (!this.supabase || !this.currentSessionId) return;
    try {
      const axes = this.assessment?.axes || [];
      for (const [aid, score] of Object.entries(results.axisScores || {})) {
        const axis = axes.find(a => a.id === aid);
        await this.supabase.insert('scores', {
          session_id: this.currentSessionId,
          lead_id: this.currentLeadId,
          axis_id: aid,
          axis_name_ar: axis?.name_ar || aid,
          axis_name_en: axis?.name_en || aid,
          raw_score: Math.round(score),
          max_possible: 100,
          percentage: score,
          weight: axis?.weight || 1,
          weighted_score: score * (axis?.weight || 1),
          grade: score >= 75 ? 'Q4' : score >= 50 ? 'Q3' : score >= 25 ? 'Q2' : 'Q1'
        });
      }
    } catch (err) { console.error('[app] saveScores failed:', err); }
  }

  async updateLeadWithResults(results) {
    if (!this.supabase || !this.currentLeadId) return;
    try {
      await this.supabase.update('leads', {
        completed: true, 
        score_total: Math.round(results.overallScore || 0),
        score_percentage: results.overallScore || 0,
        completed_at: new Date().toISOString()
      }, { id: this.currentLeadId });
    } catch (err) { console.error('[app] updateLeadWithResults failed:', err); }
  }

  /* ─────────────── COMPUTATION & RESULTS ─────────────── */

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
      
      this.engine = new AssessmentEngine(this.config, this.texts);
      const results = this.engine.evaluate(this.getAnswersForEngine(), this.currentAssessmentKey, this.metadata);

      if (this.supabase) {
        try {
          if (this.currentSessionId) {
            await this.supabase.update('sessions', { status: 'completed', completed_at: new Date().toISOString() }, { id: this.currentSessionId });
          }
          await this.saveAnswers();
          await this.saveScores(results);
          await this.updateLeadWithResults(results);
        } catch (e) { console.error('[app] Supabase completion sync error:', e); }
      }

      clearInterval(interval);
      if (bar) bar.style.width = '100%';
      if (status) status.textContent = '100%';
      setTimeout(() => { this.hideView('view-loading'); this.renderResults(results); }, 500);
    } catch (err) {
      clearInterval(interval);
      this.showFatalError('حدث خطأ فني أثناء معالجة التقرير الاستشاري: ' + err.message);
    }
  }

  renderResults(res) {
    this.showView('view-results');
    document.getElementById('view-results')?.classList.add('fade-in');

    const q = res.classification || 'Q2';
    const qData = this.texts?.quartiles?.[q] || { label: 'تذبذب ملحوظ', color: '#C67D47' };
    const score = Number.isFinite(res.overallScore) ? res.overallScore.toFixed(1) : '0.0';

    let trendHtml = "";
    if (this.previousSessionData) {
      const diff = res.overallScore - this.previousSessionData.overallScore;
      const daysSince = Math.floor((Date.now() - new Date(this.previousSessionData.completedAt).getTime()) / (24 * 60 * 60 * 1000));
      
      if (diff > 0) {
        trendHtml = `<div style="margin-top:10px; color:#10b981; font-weight:700; font-size:0.95rem;">📈 تحسن تشغيلي بمقدار +${diff.toFixed(1)}% مقارنة بالتقييم السابق (${daysSince} يوم)</div>`;
      } else if (diff < 0) {
        trendHtml = `<div style="margin-top:10px; color:#ef4444; font-weight:700; font-size:0.95rem;">📉 تراجع في الكفاءة بمقدار ${diff.toFixed(1)}% مقارنة بالتقييم السابق (${daysSince} يوم)</div>`;
      } else {
        trendHtml = `<div style="margin-top:10px; color:#6b7280; font-weight:700; font-size:0.95rem;">🔄 أداء مستقر ومطابق للتقييم السابق</div>`;
      }
      
      trendHtml += this.renderAxisComparison(res.axisScores);
    }

    const circle = document.getElementById('result-score-circle');
    if (circle) {
      circle.classList.remove('q1', 'q2', 'q3', 'q4');
      circle.classList.add(q.toLowerCase());
    }
    const scoreVal = document.getElementById('result-score-value');
    if (scoreVal) { scoreVal.textContent = score + '%'; }
    const scoreLabel = document.getElementById('result-score-label');
    if (scoreLabel) scoreLabel.textContent = qData.label;
    const title = document.getElementById('result-title');
    if (title) title.textContent = qData.label;
    const body = document.getElementById('result-body');
    
    if (body) {
      body.innerHTML = `<div>درجتك الكلية للعيادة: ${score} من 100 — ${qData.label}</div>${trendHtml}`;
    }

    const axesContainer = document.getElementById('axes-scores');
    if (axesContainer && res.axisScores) {
      axesContainer.innerHTML = '';
      const axes = this.assessment?.axes || [];
      Object.entries(res.axisScores).forEach(([aid, score]) => {
        const axis = axes.find(a => a.id === aid);
        const qClass = score >= 75 ? 'q4' : score >= 50 ? 'q3' : score >= 25 ? 'q2' : 'q1';
        const row = document.createElement('div');
        row.className = 'axis-score-row fade-in';
        row.innerHTML = `<div class="axis-score-info"><div class="axis-score-name">${axis ? axis.name_ar : aid}</div><div class="axis-score-bar-bg"><div class="axis-score-bar-fill ${qClass}" style="width:${score}%;"></div></div></div><div class="axis-score-value">${score.toFixed(1)}%</div>`;
        axesContainer.appendChild(row);
      });
    }

    this.renderVisualBenchmark(res);

    const trapsContainer = document.getElementById('traps-container');
    if (trapsContainer) {
      if (res.traps?.length) {
        trapsContainer.classList.remove('hidden');
        trapsContainer.innerHTML = '<h3 class="card-title">🚨 نقاط الضعف وفخاخ التناقض السلوكي</h3>';
        res.traps.forEach(t => {
          const alert = document.createElement('div');
          alert.className = 'trap-alert fade-in';
          alert.innerHTML = `<div class="icon">⚠️</div><div class="content"><h4>${t.name}</h4><p>${t.message}</p></div>`;
          trapsContainer.appendChild(alert);
        });
      } else trapsContainer.classList.add('hidden');
    }

    const recContainer = document.getElementById('recommendations-container');
    if (recContainer) {
      recContainer.classList.remove('hidden');
      recContainer.innerHTML = '<h3 class="card-title">💡 التوجيهات الاستشارية وفرص التطوير الهيكلي</h3>';
      if (res.axisScores) {
        const sorted = Object.entries(res.axisScores).sort((a, b) => a[1] - b[1]);
        const weakest = sorted[0];
        const strongest = sorted[sorted.length - 1];
        const axes = this.assessment?.axes || [];
        const weakAxis = axes.find(x => x.id === weakest[0]);
        const strongAxis = axes.find(x => x.id === strongest[0]);
        const box = document.createElement('div');
        box.className = 'insight-box fade-in';
        box.innerHTML = `<h4>🎯 الأولوية التشغيلية القصوى: ${weakAxis ? weakAxis.name_ar : weakest[0]}</h4><p>هذا المحور يمثل الفجوة الأكبر ويتطلب تدخل فوري وسد منافذ التسريب بنسبة أداء (${weakest[1].toFixed(1)}%).</p><h4 style="margin-top:12px;">💪 نقطة القوة المرتكز عليها: ${strongAxis ? strongAxis.name_ar : strongest[0]}</h4><p>معيار متميز وكفاءة تشغيلية مستقرة بنسبة أداء (${strongest[1].toFixed(1)}%).</p>`;
        recContainer.appendChild(box);
      }
    }

    const evEnabled = this.assessment?.simulator?.enabled === true;
    const evSection = document.getElementById('btn-ev-simulator')?.closest('.form-card');
    if (evSection) evSection.classList.toggle('hidden', !evEnabled);

    const leakageEl = document.getElementById('leakage-index');
    if (leakageEl && res.overallScore !== undefined) leakageEl.textContent = Math.round(100 - res.overallScore) + '%';
  }

  /* ─────────────── AXIS COMPARISON TABLE ─────────────── */

  renderAxisComparison(currentAxisScores) {
    if (!this.previousSessionData?.axisScores) return '';
    
    let html = '<div style="margin-top:16px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.85rem;">';
    html += '<thead><tr style="background:#f3f4f6;"><th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">المحور</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">الأساس</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">الحالي</th><th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">التغير</th></tr></thead><tbody>';
    
    const axes = this.assessment?.axes || [];
    Object.entries(currentAxisScores).forEach(([aid, currentScore]) => {
      const axis = axes.find(a => a.id === aid);
      const baseline = this.previousSessionData.axisScores[aid] || 0;
      const diff = currentScore - baseline;
      const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#6b7280';
      const diffIcon = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      
      html += `<tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${axis ? axis.name_ar : aid}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${baseline.toFixed(1)}%</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:700;">${currentScore.toFixed(1)}%</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;color:${diffColor};font-weight:700;">${diffIcon} ${Math.abs(diff).toFixed(1)}%</td>
      </tr>`;
    });
    
    html += '</tbody></table></div>';
    return html;
  }

  /* ─────────────── UNIFIED VISUAL BENCHMARKING ─────────────── */

  renderVisualBenchmark(res) {
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
      axesContainer?.parentNode?.insertBefore(benchmarkContainer, axesContainer.nextSibling);
    }
    
    benchmarkContainer.innerHTML = '<h3 class="card-title">📊 التحليل البصري الشامل</h3>';
    
    if (res.axisScores) {
      const axes = this.assessment?.axes || [];
      const data = Object.entries(res.axisScores).map(([aid, score]) => ({ 
        label: axes.find(a => a.id === aid)?.name_ar || aid, 
        value: score 
      }));
      
      const chartDiv = document.createElement('div');
      chartDiv.style.marginBottom = '24px';
      
      const maxVal = Math.max(...data.map(d => d.value), 1);
      data.forEach(item => {
        const pct = (item.value / maxVal) * 100;
        let qClass = 'q1';
        if (item.value >= 75) qClass = 'q4';
        else if (item.value >= 50) qClass = 'q3';
        else if (item.value >= 25) qClass = 'q2';

        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:12px;';
        row.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9rem;font-weight:600;"><span>${item.label}</span><span class="${qClass}-text">${item.value.toFixed(1)}%</span></div><div style="width:100%;height:12px;background:#f3f4f6;border-radius:6px;overflow:hidden;"><div class="${qClass}" style="width:${pct}%;height:100%;border-radius:6px;transition:width 0.5s ease;"></div></div>`;
        chartDiv.appendChild(row);
      });
      
      benchmarkContainer.appendChild(chartDiv);
    }

    if (res.kpis) {
      const kpiGrid = document.createElement('div');
      kpiGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;';
      
      Object.entries(res.kpis).forEach(([k, v]) => {
        const info = this.texts?.kpis?.[k] || { name: k, short_name: k };
        const card = document.createElement('div');
        card.style.cssText = 'background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb;';
        card.innerHTML = `<div style="font-size:0.85rem;color:#6b7280;">${info.name}</div><div style="font-size:0.8rem;color:#9ca3af;">${info.short_name}</div><div style="font-size:1.5rem;font-weight:800;color:#134e4a;margin-top:4px;">${v.toFixed(1)}</div>`;
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
  calculateEV() {
    const avg = parseFloat(document.getElementById('ev-avg')?.value) || 0;
    const visits = parseFloat(document.getElementById('ev-visits')?.value) || 0;
    const years = parseFloat(document.getElementById('ev-years')?.value) || 0;
    const referral = parseFloat(document.getElementById('ev-referral')?.value) || 0;

    let current, opt20, opt50;
    if (this.engine && this.assessment) {
      try {
        // حماية ديناميكية بالكامل تسحب درجات المحاور الفعلية المتاحة دون أي كود صلب
        const scoreStructure = this.engine.calculateScores();
        const axisScores = scoreStructure ? scoreStructure.axes : [];
        
        const evInputs = {};
        if (Array.isArray(axisScores)) {
          axisScores.forEach(a => {
            if (a && a.axisId) evInputs[a.axisId] = a.percentage || 0;
          });
        }
        
        const evResult = this.engine.calculateEV(
          evInputs,
          { flow: visits, ltv: avg * visits * years }
        );
        if (evResult) { 
          current = evResult.currentEV; 
          opt20 = Math.round(current * 1.2); 
          opt50 = Math.round(current * 1.5); 
        }
      } catch (e) { console.error('[EV System] Fallback calculation engaged.', e); }
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

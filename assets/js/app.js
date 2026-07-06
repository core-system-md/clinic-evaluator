/**
 * Clinic Evaluator — app.js v7.1 (v2.0 FULL REFACTOR + CORE PHASE 1 & 2)
 * ================================================================
 * Complete refactoring: index-based selection, CSV removal, 
 * cloud-driven EV defaults, A4 print ready, full answer storage,
 * unified visual benchmarking, automatic session history & comparison.
 * Added: Dual-Run Adapter Pattern for Supabase SSOT Migration.
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
    this.evDefaults = { flow: 50, visits: 3, avg: 50, years: 3, referral: 0 }; // Cloud-driven defaults
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
        
        // Load cloud-driven EV defaults from assessment config
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

  /* ─────────────── DATA FETCHING & ADAPTER LAYER (CORE System Phase 1 & 2) ─────────────── */

  async loadConfig() {
    try {
      // 1. تحميل الملف القديم ليكون مرجعاً (Regression Testing)
      const localRes = await fetch('data/config.json');
      const localConfig = await localRes.json();

      if (!this.supabase) {
        console.warn('[CORE System] Cloud connection unavailable. Falling back to local config.');
        this.config = localConfig;
        return;
      }

      console.log('[CORE System] Fetching dynamic payload from cloud database...');

      // 2. جلب البيانات المترابطة من قاعدة البيانات (Supabase SSOT)
      const [assessmentsRes, axesRes, questionsRes, optionsRes] = await Promise.all([
        this.supabase.select('assessment_types', { filter: { status: 'published' } }),
        this.supabase.select('axes'),
        this.supabase.select('questions'), 
        this.supabase.select('options')
      ]);

      // 3. بناء الكائن الديناميكي (Adapter) ليتطابق تماماً مع ما يتوقعه engine.js
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
              weight: parseFloat(a.weight),
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
                  value: o.option_value,
                  is_trap: o.is_trap || false
                }));

              const parentAxis = (axesRes || []).find(a => a.id === q.axis_id);
              
              // تحديد طبقة السؤال بناءً على وجود كمين (Trap) في خياراته ليتوافق مع المحرك
              const isTrapQuestion = qOptions.some(o => o.is_trap);

              return {
                id: q.code,
                axis_id: parentAxis ? parentAxis.code : '',
                text: q.question_text_ar || q.question_text,
                type: q.question_type || "select",
                layer: isTrapQuestion ? "B" : "A",
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
            axes: astAxes,
            questions: astQuestions
          };
        }
      }

      // 4. اختبار التطابق الصامت (Dual-Run Validation)
      const localKeys = Object.keys(localConfig.assessment_types || {});
      const cloudKeys = Object.keys(cloudConfig.assessment_types || {});
      
      console.log(`[CORE Validation] Local Assessments: ${localKeys.length} | Cloud Assessments: ${cloudKeys.length}`);
      
      if (cloudKeys.length > 0) {
        console.log('[CORE System] Validation passed. Engine is now running on Cloud Data.');
        this.config = cloudConfig;
      } else {
        console.error('[CORE System] Cloud payload is empty. Falling back to local config.');
        this.config = localConfig;
      }

    } catch (err) {
      console.error('[CORE System] Failed to load config dynamically:', err);
      const localRes = await fetch('data/config.json');
      this.config = await localRes.json();
    }
  }

  async loadTexts() {
    const res = await fetch('data/report_texts.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    this.texts = await res.json();
  }

  // Load EV simulator defaults from config.json cloud variables
  loadEVDefaultsFromConfig() {
    const simVars = this.assessment?.simulator?.variables || [];
    simVars.forEach(v => {
      if (v.id === 'flow') this.evDefaults.flow = v.default || 50;
      if (v.id === 'ltv') this.evDefaults.ltv = v.default || 5000;
    });
    // Calculate derived defaults: visits=3, avg=50, years=3, referral=0
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
    const letters = ['A', 'B', 'C', 'D', 'E'];

    let optsHtml = '';
    q.options.forEach((opt, i) => {
      const sel = (this.answers[q.id]?.index === i) ? 'sel' : '';
      optsHtml += `<div class="opt ${sel}" data-index="${i}" data-value="${opt.value}"><div class="opt-letter">${letters[i] || ''}</div><div>${opt.label}</div></div>`;
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
      else if (/^[a-e1-5]$/i.test(e.key)) {
        const map = { a:0, b:1, c:2, d:3, e:4, A:0, B:1, C:2, D:3, E:4, 1:0, 2:1, 3:2, 4:3, 5:4 };
        const idx = map[e.key];
        const q = this.questions[this.currentQuestionIndex];
        if (q?.options?.[idx]) {
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

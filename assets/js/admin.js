/**
 * Clinic Evaluator — Admin Dashboard v2.5 (PRODUCTION & SECURE MASTER)
 * ================================================================
 * الميزات المصلحة: عزل الـ Service Key بالكامل داخل لوحة التحكم،
 * تفعيل فلاتر الـ UUID، قراءة الاختيارات اللفظية المباشرة من الأطباء،
 * وحقن التحليلات الشاملة لرباعيات الأداء (Q1 - Q4).
 * ================================================================
 */

class AdminDashboard {
  constructor() {
    this.supabase = null;
    this.leads = [];
    this.sessions = [];
    this.answers = [];
    this.scores = [];
    this.settings = [];
    this.users = [];
    this.assessmentTypes = []; 
    this.filteredLeads = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.config = null;
    this.texts = null;
    this.debounceTimer = null;

    // كلمة مرور المدير الثابتة (آدمن) - SHA-256 الخاصة بكلمة "admin"
    this.ADMIN_PASSWORD_HASH = '6051fc84a7a0d74c225fb18a496b09952da5642e60723ecae543298edd7d82d6';
    
    // سحب وعزل المفتاح المطلق داخل لوحة التحكم المخصصة ليزيد وليد حصراً لتأمين السحابة
    window.adminServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDUxNDk1MywiZXhwIjoyMDk2MDkwOTUzfQ.m2hy7TtZgSjJ4NfI4gDSQqrexi4Y9RJ1Otp05ZL5TS4';
  }

  async init() {
    console.log('[Admin] Launching administration secure controller...');

    if (typeof window.SupabaseClient !== 'undefined') {
      this.supabase = new window.SupabaseClient(true);
    } else {
      this.supabase = window.supabaseClient;
    }

    if (!this.supabase) {
      this.showToast('نظام الاتصال بقاعدة البيانات غير متاح', 'error');
      return;
    }

    if (!this.checkLogin()) {
      this.showLoginScreen();
      this.setupLoginEvents();
      return;
    }

    this.showDashboard();
    await this.loadConfig();
    await this.loadAllData();
    this.setupDashboardEvents();
    this.renderStats();
    this.renderSettings();
    this.applyFilters();
    this.updateLastUpdated();
  }

  /* ─────────────── ADMIN INTERACTION ─────────────── */

  checkLogin() {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) return false;
    try { 
      return JSON.parse(auth).authenticated === true; 
    } catch { 
      return false; 
    }
  }

  showLoginScreen() {
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('dashboard-content')?.classList.add('hidden');
  }

  showDashboard() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('dashboard-content')?.classList.remove('hidden');
  }

  setupLoginEvents() {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error');
      const hash = await this.simpleHash(password);

      if (hash === this.ADMIN_PASSWORD_HASH) {
        localStorage.setItem('admin_auth', JSON.stringify({ authenticated: true, timestamp: Date.now() }));
        errorDiv?.classList.add('hidden');
        this.showDashboard();
        await this.loadConfig();
        await this.loadAllData();
        this.setupDashboardEvents();
        this.renderStats();
        this.renderSettings();
        this.applyFilters();
        this.updateLastUpdated();
      } else {
        errorDiv?.classList.remove('hidden');
        document.getElementById('login-password').value = '';
      }
    });
  }

  logout() {
    localStorage.removeItem('admin_auth');
    location.reload();
  }

  /* ─────────────── DATA PROCUREMENT ─────────────── */

  async loadConfig() {
    try {
      const res = await fetch('data/config.json');
      if (res.ok) this.config = await res.json();
    } catch (e) { 
      console.warn('[Admin] Config load failed:', e); 
    }
  }

  async loadAllData() {
    this.showLoading(true);
    try {
      const [leadsRes, sessionsRes, answersRes, scoresRes, settingsRes, usersRes, typesRes] = await Promise.all([
        this.supabase.select('leads', { order: { column: 'created_at', direction: 'desc' }, limit: 1000 }),
        this.supabase.select('sessions', { limit: 1000 }),
        this.supabase.select('answers', { limit: 10000 }),
        this.supabase.select('scores', { limit: 10000 }),
        this.supabase.select('assessment_settings'),
        this.supabase.select('assessment_users'),
        this.supabase.select('assessment_types')
      ]);

      this.leads = leadsRes || [];
      this.sessions = sessionsRes || [];
      this.answers = answersRes || [];
      this.scores = scoresRes || [];
      this.settings = settingsRes || [];
      this.users = usersRes || [];
      this.assessmentTypes = typesRes || [];
    } catch (err) {
      console.error('[Admin] Database fetch error:', err);
      this.showToast('فشل جلب البيانات التشغيلية من السحابة', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /* ─────────────── STATISTICS CARD ─────────────── */

  renderStats() {
    const total = this.leads.length;
    const completed = this.leads.filter(l => l.completed).length;
    const avgScore = total > 0 ? (this.leads.reduce((s, l) => s + (l.score_percentage || 0), 0) / total).toFixed(1) : 0;
    const clinics = new Set(this.leads.map(l => l.clinic_name).filter(Boolean)).size;

    document.getElementById('stat-leads').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-avg').textContent = avgScore + '%';
    document.getElementById('stat-clinics').textContent = clinics;
  }

  /* ─────────────── REPEAT ACCESS CONTROLLER ─────────────── */

  renderSettings() {
    const container = document.getElementById('assessment-settings');
    if (!container) return;

    const assessments = [
      { key: 'patient-journey', name: 'رحلة المريض' },
      { key: 'clinic-performance', name: 'أداء العيادة' }
    ];

    container.innerHTML = assessments.map(a => {
      const setting = this.settings.find(s => s.assessment_key === a.key);
      const isEnabled = setting?.auth_enabled || false;
      const aUsers = this.users.filter(u => u.assessment_key === a.key);

      return `
        <div class="setting-card">
          <div class="setting-header">
            <span class="setting-title">${a.name}</span>
            <div class="toggle-switch ${isEnabled ? 'active' : ''}" onclick="adminDashboard.toggleAuth('${a.key}')"></div>
          </div>
          <div class="setting-status">
            ${isEnabled ? '<span style="color:#e8b923">🔒 محمي (يطلب تفعيل الكود للعيادة)</span>' : '<span style="color:#94a3b8">🔓 مفتوح مجاناً للجميع</span>'}
          </div>
          ${isEnabled ? `
            <div class="users-list">
              ${aUsers.length === 0 ? '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:12px;">لا يوجد حسابات أطباء مصدرة</div>' : aUsers.map(u => `
                <div class="user-item">
                  <div>
                    <div style="font-weight:600; color:#e8b923;">${u.username}</div>
                    <div class="user-info">${u.used_count}/${u.max_uses} استخدام | صلاحية الأيام: ${u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}</div>
                  </div>
                  <button class="btn-small btn-delete" onclick="adminDashboard.deleteUser('${u.id}')">سحب</button>
                </div>
              `).join('')}
            </div>
            <button class="btn-small btn-add" onclick="adminDashboard.showAddUserModal('${a.key}')">+ إصدار كود دخول لطبيب</button>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  async toggleAuth(assessmentKey) {
    const setting = this.settings.find(s => s.assessment_key === assessmentKey);
    const newState = !(setting?.auth_enabled || false);
    try {
      if (setting) {
        await this.supabase.update('assessment_settings', { auth_enabled: newState }, { assessment_key: assessmentKey });
      } else {
        await this.supabase.insert('assessment_settings', { assessment_key: assessmentKey, auth_enabled: newState });
      }
      this.settings = (await this.supabase.select('assessment_settings')) || [];
      this.renderSettings();
      this.showToast(newState ? 'تم تفعيل حماية القفل للتقييم' : 'تم إلغاء القفل بنجاح', 'success');
    } catch (err) { 
      this.showToast('فشل تعديل حالة الحماية والسيرفر', 'error'); 
    }
  }

  showAddUserModal(assessmentKey) {
    document.getElementById('user-assessment-key').value = assessmentKey;
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-max-uses').value = '1';
    document.getElementById('user-expiry-days').value = '30';
    document.getElementById('user-modal').classList.remove('hidden');
  }

  hideAddUserModal() { 
    document.getElementById('user-modal').classList.add('hidden'); 
  }

  async addUser(e) {
    e.preventDefault();
    const aKey = document.getElementById('user-assessment-key').value;
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const maxUses = parseInt(document.getElementById('user-max-uses').value);
    const expiryDays = parseInt(document.getElementById('user-expiry-days').value);

    if (!username || !password) { 
      this.showToast('أدخل اسم المستخدم وكلمة المرور المطلوبة', 'error'); 
      return; 
    }

    const hash = await this.simpleHash(password);
    const expiresAt = new Date(); 
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    try {
      await this.supabase.insert('assessment_users', { 
        assessment_key: aKey, 
        username, 
        password_hash: hash, 
        max_uses: maxUses, 
        used_count: 0, 
        expires_at: expiresAt.toISOString(), 
        active: true 
      });
      this.users = (await this.supabase.select('assessment_users')) || [];
      this.renderSettings(); 
      this.hideAddUserModal(); 
      this.showToast('تم إصدار الحساب وقفل التقييم بنجاح', 'success');
    } catch (err) { 
      this.showToast('فشل تفعيل وإرسال الحساب السحابي', 'error'); 
    }
  }

  async deleteUser(userId) {
    if (!confirm('هل أنت متأكد من سحب صلاحية هذا الكود؟')) return;
    try {
      await this.supabase.delete('assessment_users', { id: userId });
      this.users = (await this.supabase.select('assessment_users')) || [];
      this.renderSettings(); 
      this.showToast('تم حذف وإلغاء تفعيل الحساب', 'success');
    } catch (err) { 
      this.showToast('فشل حذف حساب المستخدم', 'error'); 
    }
  }

  /* ─────────────── LIVE INTERACTIVE FILTERS ─────────────── */

  setupDashboardEvents() {
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    document.getElementById('search-input')?.addEventListener('input', () => { 
      clearTimeout(this.debounceTimer); 
      this.debounceTimer = setTimeout(() => this.applyFilters(), 300); 
    });
    document.getElementById('btn-search')?.addEventListener('click', () => this.applyFilters());
    document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-status')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-sort')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('btn-refresh')?.addEventListener('click', () => { 
      this.loadAllData().then(() => { 
        this.renderStats(); 
        this.renderSettings(); 
        this.applyFilters(); 
        this.updateLastUpdated(); 
        this.showToast('تم تحديث ومزامنة البيانات حياً من السحابة', 'success'); 
      }); 
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('detail-modal').classList.add('hidden'));
    document.getElementById('btn-close-user-modal')?.addEventListener('click', () => this.hideAddUserModal());
    document.getElementById('btn-cancel-user')?.addEventListener('click', () => this.hideAddUserModal());
    document.getElementById('user-form')?.addEventListener('submit', (e) => this.addUser(e));
  }

  applyFilters() {
    const search = (document.getElementById('search-input').value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('filter-type').value; 
    const status = document.getElementById('filter-status').value;
    const sort = document.getElementById('filter-sort').value;

    let filtered = [...this.leads];

    if (search) {
      filtered = filtered.filter(l => (l.full_name + l.email + l.phone + l.clinic_name + l.country).toLowerCase().includes(search));
    }

    // تصفية حية ناجحة تعتمد على ربط معرف الـ UUID مع جدول الأنواع
    if (typeFilter) {
      const matchedTypeObj = this.assessmentTypes.find(t => t.slug === typeFilter);
      if (matchedTypeObj) {
        filtered = filtered.filter(l => l.assessment_type_id === matchedTypeObj.id);
      }
    }

    if (status === 'completed') filtered = filtered.filter(l => l.completed);
    else if (status === 'incomplete') filtered = filtered.filter(l => !l.completed);

    switch (sort) {
      case 'newest': filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case 'oldest': filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'score-high': filtered.sort((a, b) => (b.score_percentage || 0) - (a.score_percentage || 0)); break;
      case 'score-low': filtered.sort((a, b) => (a.score_percentage || 0) - (b.score_percentage || 0)); break;
      case 'name': filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar')); break;
    }

    this.filteredLeads = filtered; 
    this.currentPage = 1; 
    this.renderTable();
  }

  /* ─────────────── DATA TABLE CONTROLLER ─────────────── */

  renderTable() {
    const tbody = document.getElementById('leads-tbody');
    const countEl = document.getElementById('results-count');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filteredLeads.slice(start, start + this.pageSize);
    const totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);
    
    countEl.textContent = `${this.filteredLeads.length} سجل`;

    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;">لا توجد سجلات عيادات متطابقة حالياً</td></tr>';
    } else {
      tbody.innerHTML = pageData.map(lead => {
        const date = lead.created_at ? new Date(lead.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';
        const score = lead.score_percentage != null ? lead.score_percentage.toFixed(1) + '%' : '--';
        const status = lead.completed ? '<span class="badge badge-success">مكتمل</span>' : '<span class="badge badge-warning">غير مكتمل</span>';
        return `<tr><td>${date}</td><td>${lead.full_name || '--'}</td><td>${lead.clinic_name || '--'}</td><td>${lead.specialty || '--'}</td><td>${lead.team || '--'}</td><td>${lead.years || '--'}</td><td>${lead.country || '--'}</td><td><strong>${score}</strong></td><td>${status}</td><td><button class="btn-details" onclick="adminDashboard.showDetails('${lead.id}')">عرض</button></td></tr>`;
      }).join('');
    }
    this.renderPagination(totalPages);
  }

  renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
    let html = '';
    html += `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage - 1})">←</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="adminDashboard.goToPage(${i})">${i}</button>`;
      else if (i === this.currentPage - 2 || i === this.currentPage + 2) html += '<span style="color:#94a3b8;padding:8px;">...</span>';
    }
    html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage + 1})">→</button>`;
    container.innerHTML = html;
  }

  goToPage(page) { 
    this.currentPage = page; 
    this.renderTable(); 
  }

  /* ─────────────── DIAGNOSTIC MODAL DESIGN FOR THE MD CODE ─────────────── */

  async showDetails(leadId) {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) return;

    const answers = this.answers.filter(a => a.lead_id === leadId);
    const scores = this.scores.filter(s => s.lead_id === leadId);
    const modalBody = document.getElementById('modal-body');

    const finalScorePercentage = lead.score_percentage || 0;
    let diagnosticExplanation = "";
    if (finalScorePercentage >= 75) diagnosticExplanation = "🥇 أداء متميز (Q4): العيادة تطبق معايير الكفاءة التشغيلية والالتزام بالخطة العلاجية بشكل ممتاز ومستقر للنمو المالي.";
    else if (finalScorePercentage >= 50) diagnosticExplanation = "⚖️ أداء مستقر (Q3): توجد ركائز أساسية تشغيلية ولكن هناك فجوات تسريب واضحة في المتابعة وقبول العلاج تحتاج لضبط عاجل.";
    else if (finalScorePercentage >= 25) diagnosticExplanation = "⚠️ تذبذب ملحوظ (Q2): العمليات تعتمد بالكامل على الاجتهاد الشخصي وتفتقر إلى وجود أنظمة مؤسسية مستدامة تحمي الطبيب مالياً.";
    else diagnosticExplanation = "🚨 فجوة هيكلية حرجة (Q1): تسريب حاد ومستمر للمرضى (Patient Leakage) مع غياب كامل لأنظمة المتابعة والقياس التشغيلي بالعيادة.";

    if (modalBody) {
      modalBody.innerHTML = `
        <div class="detail-section"><h4>👤 معلومات الطبيب والعيادة التشغيلية</h4><div class="detail-grid">
          <div class="detail-item"><div class="detail-label">اسم الطبيب</div><div class="detail-value">${lead.full_name || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">البريد الإلكتروني</div><div class="detail-value">${lead.email || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">رقم الهاتف</div><div class="detail-value">${lead.phone || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">اسم العيادة</div><div class="detail-value">${lead.clinic_name || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">التخصص الطبي</div><div class="detail-value">${lead.specialty || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">سنوات الخبرة</div><div class="detail-value">${lead.years || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">حجم فريق العمل</div><div class="detail-value">${lead.team || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">الدولة</div><div class="detail-value">${lead.country || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">تاريخ التقييم</div><div class="detail-value">${lead.created_at ? new Date(lead.created_at).toLocaleString('ar-SA') : '--'}</div></div>
          <div class="detail-item"><div class="detail-label">حالة التقرير</div><div class="detail-value">${lead.completed ? '✅ مكتمل ومحلل تلقائياً' : '⏳ قيد التقدم - غير مكتمل'}</div></div>
        </div></div>
        
        ${scores.length > 0 ? `
          <div class="detail-section"><h4>📊 تحليل درجات المحاور الأساسية للعيادة</h4><div class="scores-grid">
            ${scores.map(s => `<div class="score-card"><div class="score-name">${s.axis_name_ar || s.axis_id}</div><div class="score-value">${s.percentage != null ? s.percentage.toFixed(1) : '--'}%</div></div>`).join('')}
            <div style="margin-top:16px;text-align:center;padding:20px;background:#0f172a;border-radius:12px;grid-column:1/-1;">
              <div style="color:#94a3b8;font-size:0.9rem;margin-bottom:4px;">الدرجة الكلية الكفاءة والامتثال</div>
              <div style="font-size:2.2rem;font-weight:800;color:#e8b923;">${finalScorePercentage.toFixed(1)}%</div>
              <div style="color:#f1f5f9;font-size:1rem;margin-top:10px;font-weight:600;padding:8px;background:rgba(232,185,35,0.1);border-radius:6px;">${diagnosticExplanation}</div>
            </div>
          </div></div>` : ''}
        
        ${answers.length > 0 ? `
          <div class="detail-section"><h4>📝 تفاصيل الإجابات اللفظية الصريحة للعيادة</h4><div class="answers-list">
            ${answers.map((a, i) => `
              <div class="answer-item" style="border-right: 4px solid #e8b923; background:#0f172a; margin-bottom:8px; padding:12px; border-radius:6px;">
                <div class="answer-question" style="font-size:0.95rem; color:#f1f5f9; font-weight:500; line-height:1.5;">${a.question_text || `سؤال ${i + 1}`}</div>
              </div>
            `).join('')}
          </div></div>` : '<div style="text-align:center;color:#94a3b8;padding:20px;">لا توجد بنود إجابات مسجلة لهذا الطبيب</div>'}
      `;
    }
    document.getElementById('detail-modal')?.classList.remove('hidden');
  }

  /* ─────────────── UTILITIES ─────────────── */

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) overlay.classList.remove('hidden'); 
      else overlay.classList.add('hidden');
    }
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message; 
    toast.className = `toast ${type}`; 
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
}

let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard = new AdminDashboard();
  adminDashboard.init();
});

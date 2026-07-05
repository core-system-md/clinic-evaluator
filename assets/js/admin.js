/**
 * Clinic Evaluator — Admin Dashboard (FINAL v4.0)
 * ================================================================
 * Security: Edge Function proxy (zero exposed keys)
 * Features: CRUD assessments, assets, duplicate, RBAC-ready
 * Visual: Unified with main platform (Cairo, light theme)
 * ================================================================
 */

class AdminDashboard {
  constructor() {
    this.EDGE_FUNCTION_URL = 'https://oaqpzaarppccbnepffxx.supabase.co/functions/v1/admin-auth';
    this.ADMIN_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

    this.leads = [];
    this.sessions = [];
    this.answers = [];
    this.scores = [];
    this.settings = [];
    this.users = [];
    this.assessmentTypes = [];
    this.assets = [];
    this.filteredLeads = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.config = null;
    this.debounceTimer = null;
  }

  async init() {
    console.log('[Admin] Launching secure dashboard v4.0...');

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
    this.renderAssessmentManager();
    this.renderAssetsManager();
    this.renderSettings();
    this.applyFilters();
    this.updateLastUpdated();
  }

  /* ─────────────── EDGE FUNCTION PROXY ─────────────── */

  async edgeRequest(action, table, data = null, filter = null) {
    const auth = JSON.parse(localStorage.getItem('admin_auth') || '{}');
    const password = auth.password;

    const payload = {
      action,
      table,
      password,
      ...(data && { data }),
      ...(filter && { filter })
    };

    const res = await fetch(this.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Edge Function failed');
    return result.data;
  }

  /* ─────────────── AUTHENTICATION ─────────────── */

  checkLogin() {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) return false;
    try {
      const data = JSON.parse(auth);
      return data.authenticated === true;
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

      const hash = await this.sha256(password);

      if (hash === this.ADMIN_PASSWORD_HASH) {
        localStorage.setItem('admin_auth', JSON.stringify({ 
          authenticated: true, 
          password: password,
          timestamp: Date.now() 
        }));
        errorDiv?.classList.add('hidden');
        this.showDashboard();
        await this.loadConfig();
        await this.loadAllData();
        this.setupDashboardEvents();
        this.renderStats();
        this.renderAssessmentManager();
        this.renderAssetsManager();
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

  async sha256(str) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(str));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ─────────────── DATA LOADING ─────────────── */

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
      const [leadsRes, sessionsRes, answersRes, scoresRes, settingsRes, usersRes, typesRes, assetsRes] = await Promise.all([
        this.edgeRequest('select', 'leads', { columns: '*', order: { column: 'created_at', direction: 'desc' }, limit: 1000 }),
        this.edgeRequest('select', 'sessions', { columns: '*', limit: 1000 }),
        this.edgeRequest('select', 'answers', { columns: '*', limit: 10000 }),
        this.edgeRequest('select', 'scores', { columns: '*', limit: 10000 }),
        this.edgeRequest('select', 'assessment_settings', { columns: '*' }),
        this.edgeRequest('select', 'assessment_users', { columns: '*' }),
        this.edgeRequest('select', 'assessment_types', { columns: '*' }),
        this.edgeRequest('select', 'assessment_assets', { columns: '*' })
      ]);

      this.leads = leadsRes || [];
      this.sessions = sessionsRes || [];
      this.answers = answersRes || [];
      this.scores = scoresRes || [];
      this.settings = settingsRes || [];
      this.users = usersRes || [];
      this.assessmentTypes = typesRes || [];
      this.assets = assetsRes || [];
    } catch (err) {
      console.error('[Admin] Load error:', err);
      this.showToast('فشل جلب البيانات من السحابة', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /* ─────────────── STATISTICS ─────────────── */

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

  /* ─────────────── ASSESSMENT MANAGER ─────────────── */

  renderAssessmentManager() {
    const container = document.getElementById('assessment-manager');
    if (!container) return;

    container.innerHTML = this.assessmentTypes.map(t => this.renderAssessmentCard(t)).join('');
  }

  renderAssessmentCard(type) {
    const statusMap = {
      published: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', text: 'منشور' },
      draft: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'مسودة' },
      archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: 'مؤرشف' }
    };
    const s = statusMap[type.status] || statusMap.draft;

    return `
      <div class="assessment-card" data-id="${type.id}">
        <div class="assessment-header">
          <div>
            <div class="assessment-name">${type.name || type.slug}</div>
            <div class="assessment-slug">${type.slug}</div>
          </div>
          <span class="badge" style="background:${s.bg};color:${s.color};">${s.text}</span>
        </div>
        <div class="assessment-actions">
          <button class="btn-small btn-secondary" onclick="adminDashboard.showEditAssessmentModal('${type.id}')">تعديل</button>
          <button class="btn-small btn-secondary" onclick="adminDashboard.duplicateAssessment('${type.id}')">نسخ</button>
          ${type.status !== 'archived' ? `<button class="btn-small btn-secondary" onclick="adminDashboard.archiveAssessment('${type.id}')">أرشفة</button>` : ''}
          <button class="btn-small btn-delete" onclick="adminDashboard.deleteAssessment('${type.id}')">حذف</button>
        </div>
      </div>
    `;
  }

  showCreateAssessmentModal() {
    document.getElementById('assessment-id').value = '';
    document.getElementById('assessment-name').value = '';
    document.getElementById('assessment-slug').value = '';
    document.getElementById('assessment-description').value = '';
    document.getElementById('assessment-status').value = 'draft';
    document.getElementById('assessment-modal-title').textContent = 'إنشاء تقييم جديد';
    document.getElementById('assessment-modal').classList.remove('hidden');
  }

  showEditAssessmentModal(id) {
    const type = this.assessmentTypes.find(t => t.id === id);
    if (!type) return;
    document.getElementById('assessment-id').value = type.id;
    document.getElementById('assessment-name').value = type.name || '';
    document.getElementById('assessment-slug').value = type.slug || '';
    document.getElementById('assessment-description').value = type.description || '';
    document.getElementById('assessment-status').value = type.status || 'draft';
    document.getElementById('assessment-modal-title').textContent = 'تعديل تقييم';
    document.getElementById('assessment-modal').classList.remove('hidden');
  }

  async createAssessment(e) {
    e.preventDefault();
    const name = document.getElementById('assessment-name').value.trim();
    const slug = document.getElementById('assessment-slug').value.trim();
    const description = document.getElementById('assessment-description').value.trim();
    const status = document.getElementById('assessment-status').value;

    if (!name || !slug) {
      this.showToast('الاسم والمعرف مطلوبان', 'error');
      return;
    }

    try {
      await this.edgeRequest('insert', 'assessment_types', {
        name, slug, description, status,
        created_at: new Date().toISOString()
      });
      this.showToast('تم إنشاء التقييم', 'success');
      document.getElementById('assessment-modal').classList.add('hidden');
      await this.loadAllData();
      this.renderAssessmentManager();
    } catch (err) {
      this.showToast('فشل إنشاء التقييم', 'error');
    }
  }

  async updateAssessment(e) {
    e.preventDefault();
    const id = document.getElementById('assessment-id').value;
    const name = document.getElementById('assessment-name').value.trim();
    const slug = document.getElementById('assessment-slug').value.trim();
    const description = document.getElementById('assessment-description').value.trim();
    const status = document.getElementById('assessment-status').value;

    if (!id) {
      await this.createAssessment(e);
      return;
    }

    try {
      await this.edgeRequest('update', 'assessment_types', {
        name, slug, description, status,
        updated_at: new Date().toISOString()
      }, { id });
      this.showToast('تم تحديث التقييم', 'success');
      document.getElementById('assessment-modal').classList.add('hidden');
      await this.loadAllData();
      this.renderAssessmentManager();
    } catch (err) {
      this.showToast('فشل تحديث التقييم', 'error');
    }
  }

  async duplicateAssessment(id) {
    const source = this.assessmentTypes.find(t => t.id === id);
    if (!source) return;

    try {
      await this.edgeRequest('insert', 'assessment_types', {
        name: (source.name || source.slug) + ' (نسخة)',
        slug: source.slug + '_copy_' + Date.now(),
        description: source.description,
        status: 'draft',
        created_at: new Date().toISOString()
      });
      this.showToast('تم نسخ التقييم بنجاح', 'success');
      await this.loadAllData();
      this.renderAssessmentManager();
    } catch (err) {
      console.error('[Admin] Duplicate error:', err);
      this.showToast('فشل نسخ التقييم', 'error');
    }
  }

  async archiveAssessment(id) {
    if (!confirm('هل أنت متأكد من أرشفة هذا التقييم؟')) return;
    try {
      await this.edgeRequest('update', 'assessment_types', {
        status: 'archived',
        archived_at: new Date().toISOString()
      }, { id });
      this.showToast('تم أرشفة التقييم', 'success');
      await this.loadAllData();
      this.renderAssessmentManager();
    } catch (err) {
      this.showToast('فشل الأرشفة', 'error');
    }
  }

  async deleteAssessment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم نهائياً؟')) return;
    try {
      await this.edgeRequest('delete', 'assessment_types', null, { id });
      this.showToast('تم حذف التقييم', 'success');
      await this.loadAllData();
      this.renderAssessmentManager();
    } catch (err) {
      this.showToast('فشل الحذف', 'error');
    }
  }

  /* ─────────────── ASSETS MANAGER ─────────────── */

  renderAssetsManager() {
    const container = document.getElementById('assets-manager');
    if (!container) return;

    container.innerHTML = this.assets.map(a => this.renderAssetCard(a)).join('');
  }

  renderAssetCard(asset) {
    return `
      <div class="asset-card">
        <img src="${asset.file_url}" alt="${asset.alt_text || ''}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22120%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23f1f5f9%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="asset-info">
          <div class="asset-type">${asset.asset_type || 'image'}</div>
          <div class="asset-name">${asset.file_name || 'unnamed'}</div>
        </div>
        <button class="btn-small btn-delete" style="width:100%;border-radius:0 0 8px 8px;" onclick="adminDashboard.deleteAsset('${asset.id}')">حذف</button>
      </div>
    `;
  }

  async handleAssetUpload(input) {
    const file = input.files[0];
    if (!file) return;

    this.showToast('جاري الرفع...', 'success');

    try {
      const base64 = await this.fileToBase64(file);
      await this.edgeRequest('insert', 'assessment_assets', {
        file_name: file.name,
        file_url: base64,
        asset_type: file.type.split('/')[0],
        alt_text: file.name,
        created_at: new Date().toISOString()
      });
      this.showToast('تم رفع الأصل بنجاح', 'success');
      input.value = '';
      await this.loadAllData();
      this.renderAssetsManager();
    } catch (err) {
      console.error('[Admin] Upload error:', err);
      this.showToast('فشل رفع الأصل', 'error');
    }
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async deleteAsset(id) {
    if (!confirm('حذف هذا الأصل؟')) return;
    try {
      await this.edgeRequest('delete', 'assessment_assets', null, { id });
      this.showToast('تم الحذف', 'success');
      await this.loadAllData();
      this.renderAssetsManager();
    } catch (err) {
      this.showToast('فشل الحذف', 'error');
    }
  }

  /* ─────────────── SETTINGS (Auth Control) ─────────────── */

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
            ${isEnabled ? '<span style="color:var(--success)">🔒 محمي</span>' : '<span style="color:var(--text-muted)">🔓 مفتوح</span>'}
          </div>
          ${isEnabled ? `
            <div class="users-list">
              ${aUsers.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px;">لا يوجد مستخدمين</div>' : aUsers.map(u => `
                <div class="user-item">
                  <div>
                    <div style="font-weight:600; color:var(--primary);">${u.username}</div>
                    <div class="user-info">${u.used_count}/${u.max_uses} استخدام | صلاحية: ${u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}</div>
                  </div>
                  <button class="btn-small btn-delete" onclick="adminDashboard.deleteUser('${u.id}')">حذف</button>
                </div>
              `).join('')}
            </div>
            <button class="btn-small btn-add" onclick="adminDashboard.showAddUserModal('${a.key}')">+ إضافة مستخدم</button>
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
        await this.edgeRequest('update', 'assessment_settings', { auth_enabled: newState }, { assessment_key: assessmentKey });
      } else {
        await this.edgeRequest('insert', 'assessment_settings', { assessment_key: assessmentKey, auth_enabled: newState });
      }
      const res = await this.edgeRequest('select', 'assessment_settings', { columns: '*' });
      this.settings = res || [];
      this.renderSettings();
      this.showToast(newState ? 'تم تفعيل الحماية' : 'تم إلغاء الحماية', 'success');
    } catch (err) { 
      this.showToast('فشل تغيير الحماية', 'error'); 
    }
  }

  /* ─────────────── USER MANAGEMENT ─────────────── */

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
      this.showToast('أدخل اسم المستخدم وكلمة المرور', 'error'); 
      return; 
    }

    const hash = await this.sha256(password);
    const expiresAt = new Date(); 
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    try {
      await this.edgeRequest('insert', 'assessment_users', {
        assessment_key: aKey, 
        username, 
        password_hash: hash, 
        max_uses: maxUses, 
        used_count: 0, 
        expires_at: expiresAt.toISOString(), 
        active: true 
      });
      this.users = (await this.edgeRequest('select', 'assessment_users', { columns: '*' })) || [];
      this.renderSettings(); 
      this.hideAddUserModal(); 
      this.showToast('تم إنشاء المستخدم', 'success');
    } catch (err) { 
      this.showToast('فشل إنشاء المستخدم', 'error'); 
    }
  }

  async deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await this.edgeRequest('delete', 'assessment_users', null, { id: userId });
      this.users = (await this.edgeRequest('select', 'assessment_users', { columns: '*' })) || [];
      this.renderSettings(); 
      this.showToast('تم حذف المستخدم', 'success');
    } catch (err) { 
      this.showToast('فشل حذف المستخدم', 'error'); 
    }
  }

  /* ─────────────── FILTERS & TABLE ─────────────── */

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
        this.renderAssessmentManager();
        this.renderAssetsManager();
        this.renderSettings(); 
        this.applyFilters(); 
        this.updateLastUpdated(); 
        this.showToast('تم التحديث', 'success'); 
      }); 
    });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => document.getElementById('detail-modal').classList.add('hidden'));
    document.getElementById('btn-close-user-modal')?.addEventListener('click', () => this.hideAddUserModal());
    document.getElementById('btn-cancel-user')?.addEventListener('click', () => this.hideAddUserModal());
    document.getElementById('user-form')?.addEventListener('submit', (e) => this.addUser(e));
    document.getElementById('assessment-form')?.addEventListener('submit', (e) => this.updateAssessment(e));
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

    if (typeFilter && this.assessmentTypes) {
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

  renderTable() {
    const tbody = document.getElementById('leads-tbody');
    const countEl = document.getElementById('results-count');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filteredLeads.slice(start, start + this.pageSize);
    const totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);

    countEl.textContent = `${this.filteredLeads.length} سجل`;

    if (pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد سجلات</td></tr>';
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
    if (!container || totalPages <= 1) { 
      if (container) container.innerHTML = ''; 
      return; 
    }
    let html = '';
    html += `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage - 1})">←</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="adminDashboard.goToPage(${i})">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += '<span style="color:var(--text-muted);padding:8px;">...</span>';
      }
    }
    html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage + 1})">→</button>`;
    container.innerHTML = html;
  }

  goToPage(page) { 
    this.currentPage = page; 
    this.renderTable(); 
  }

  /* ─────────────── DETAILS MODAL ─────────────── */

  async showDetails(leadId) {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) return;

    const answers = this.answers.filter(a => a.lead_id === leadId);
    const scores = this.scores.filter(s => s.lead_id === leadId);
    const modalBody = document.getElementById('modal-body');

    const finalScorePercentage = lead.score_percentage || 0;
    let diagnosticExplanation = "";
    if (finalScorePercentage >= 75) diagnosticExplanation = "🥇 أداء متميز (Q4)";
    else if (finalScorePercentage >= 50) diagnosticExplanation = "⚖️ أداء مستقر (Q3)";
    else if (finalScorePercentage >= 25) diagnosticExplanation = "⚠️ تذبذب ملحوظ (Q2)";
    else diagnosticExplanation = "🚨 فجوة هيكلية حرجة (Q1)";

    if (modalBody) {
      modalBody.innerHTML = `
        <div class="detail-section"><h4>👤 معلومات الطبيب والعيادة</h4><div class="detail-grid">
          <div class="detail-item"><div class="detail-label">الاسم</div><div class="detail-value">${lead.full_name || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">البريد</div><div class="detail-value">${lead.email || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">الهاتف</div><div class="detail-value">${lead.phone || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">العيادة</div><div class="detail-value">${lead.clinic_name || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">التخصص</div><div class="detail-value">${lead.specialty || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">سنوات الخبرة</div><div class="detail-value">${lead.years || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">حجم الفريق</div><div class="detail-value">${lead.team || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">الدولة</div><div class="detail-value">${lead.country || '--'}</div></div>
          <div class="detail-item"><div class="detail-label">تاريخ التقييم</div><div class="detail-value">${lead.created_at ? new Date(lead.created_at).toLocaleString('ar-SA') : '--'}</div></div>
          <div class="detail-item"><div class="detail-label">الحالة</div><div class="detail-value">${lead.completed ? '✅ مكتمل' : '⏳ غير مكتمل'}</div></div>
        </div></div>

        ${scores.length > 0 ? `
          <div class="detail-section"><h4>📊 تحليل المحاور</h4><div class="scores-grid">
            ${scores.map(s => `<div class="score-card"><div class="score-name">${s.axis_name_ar || s.axis_id}</div><div class="score-value">${s.percentage != null ? s.percentage.toFixed(1) : '--'}%</div></div>`).join('')}
            <div style="margin-top:16px;text-align:center;padding:20px;background:var(--bg);border-radius:12px;grid-column:1/-1;border:1px solid var(--border);">
              <div style="color:var(--text-muted);font-size:0.9rem;margin-bottom:4px;">الدرجة الكلية</div>
              <div style="font-size:2.2rem;font-weight:800;color:var(--primary);">${finalScorePercentage.toFixed(1)}%</div>
              <div style="color:var(--text);font-size:1rem;margin-top:10px;font-weight:600;padding:8px;background:rgba(15,118,110,0.05);border-radius:6px;">${diagnosticExplanation}</div>
            </div>
          </div></div>` : ''}

        ${answers.length > 0 ? `
          <div class="detail-section"><h4>📝 الإجابات</h4><div class="answers-list">
            ${answers.map((a, i) => `
              <div class="answer-item">
                <div class="answer-question">${a.question_text || `سؤال ${i + 1}`}</div>
                <div class="answer-selected">الاختيار: ${a.option_label || `قيمة ${a.answer_value}`}</div>
              </div>
            `).join('')}
          </div></div>` : '<div style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد إجابات مسجلة</div>'}
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
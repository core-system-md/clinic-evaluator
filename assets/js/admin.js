/**
 * Clinic Evaluator — Admin Dashboard
 * Version: 1.1.0 (Added login system)
 * Features: Read data, Search, Filter, Sort, Details, User Management, Login
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
    this.filteredLeads = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.config = null;
    this.texts = null;

    // Admin password (change this in production)
    this.ADMIN_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // SHA-256 of "admin"
  }

  async init() {
    console.log('[Admin] Initializing...');

    // Initialize Supabase with Service Role Key
    this.supabase = window.supabaseClient;
    if (!this.supabase) {
      this.showError('Supabase client not available');
      return;
    }

    // Check login status
    if (!this.checkLogin()) {
      this.showLoginScreen();
      return;
    }

    // User is logged in - show dashboard
    this.showDashboard();

    // Load config for question texts
    await this.loadConfig();

    // Load all data
    await this.loadAllData();

    // Setup UI
    this.setupEventListeners();
    this.renderStats();
    this.renderSettings();
    this.applyFilters();
    this.updateLastUpdated();

    console.log('[Admin] Initialized successfully');
  }

  // ========== LOGIN SYSTEM ==========

  checkLogin() {
    const auth = localStorage.getItem('admin_auth');
    if (!auth) return false;

    try {
      const data = JSON.parse(auth);
      // Check if auth is valid (no expiry - permanent)
      return data.authenticated === true;
    } catch {
      return false;
    }
  }

  showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('dashboard-content').classList.add('hidden');
    document.getElementById('login-password').focus();
  }

  showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
  }

  async handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    const hash = await this.simpleHash(password);

    if (hash === this.ADMIN_PASSWORD_HASH) {
      // Store auth permanently
      localStorage.setItem('admin_auth', JSON.stringify({
        authenticated: true,
        timestamp: Date.now()
      }));

      errorDiv.classList.add('hidden');
      this.showDashboard();

      // Initialize dashboard
      await this.loadConfig();
      await this.loadAllData();
      this.setupEventListeners();
      this.renderStats();
      this.renderSettings();
      this.applyFilters();
      this.updateLastUpdated();
    } else {
      errorDiv.classList.remove('hidden');
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  }

  logout() {
    localStorage.removeItem('admin_auth');
    location.reload();
  }

  // ========== DATA LOADING ==========

  async loadConfig() {
    try {
      const res = await fetch('data/config.json');
      if (res.ok) this.config = await res.json();
    } catch (e) {
      console.warn('[Admin] Could not load config:', e);
    }
  }

  async loadAllData() {
    this.showLoading(true);
    try {
      // Load in parallel
      const [leadsRes, sessionsRes, answersRes, scoresRes, settingsRes, usersRes] = await Promise.all([
        this.supabase.select('leads', { order: { column: 'created_at', direction: 'desc' }, limit: 1000 }),
        this.supabase.select('sessions', { limit: 1000 }),
        this.supabase.select('answers', { limit: 10000 }),
        this.supabase.select('scores', { limit: 10000 }),
        this.supabase.select('assessment_settings'),
        this.supabase.select('assessment_users')
      ]);

      this.leads = leadsRes || [];
      this.sessions = sessionsRes || [];
      this.answers = answersRes || [];
      this.scores = scoresRes || [];
      this.settings = settingsRes || [];
      this.users = usersRes || [];

      console.log(`[Admin] Loaded: ${this.leads.length} leads, ${this.sessions.length} sessions, ${this.answers.length} answers, ${this.scores.length} scores`);
    } catch (err) {
      console.error('[Admin] Load error:', err);
      this.showError('فشل تحميل البيانات: ' + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  // ========== STATS ==========

  renderStats() {
    const total = this.leads.length;
    const completed = this.leads.filter(l => l.completed).length;
    const avgScore = total > 0 
      ? (this.leads.reduce((sum, l) => sum + (l.score_percentage || 0), 0) / total).toFixed(1)
      : 0;
    const clinics = new Set(this.leads.map(l => l.clinic_name).filter(Boolean)).size;

    document.getElementById('stat-leads').textContent = total;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-avg').textContent = avgScore + '%';
    document.getElementById('stat-clinics').textContent = clinics;
  }

  // ========== SETTINGS ==========

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
      const assessmentUsers = this.users.filter(u => u.assessment_key === a.key);

      return `
        <div class="setting-card">
          <div class="setting-header">
            <span class="setting-title">${a.name}</span>
            <div class="toggle-switch ${isEnabled ? 'active' : ''}" 
                 data-key="${a.key}" 
                 onclick="adminDashboard.toggleAuth('${a.key}')">
            </div>
          </div>
          <div class="setting-status">
            ${isEnabled 
              ? '<span style="color: var(--success)">🔒 محمي</span>' 
              : '<span style="color: var(--text-muted)">🔓 مفتوح</span>'}
          </div>
          ${isEnabled ? `
            <div class="users-list">
              ${assessmentUsers.length === 0 
                ? '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px;">لا يوجد مستخدمين</div>'
                : assessmentUsers.map(u => `
                  <div class="user-item">
                    <div>
                      <div>${u.username}</div>
                      <div class="user-info">
                        ${u.used_count}/${u.max_uses} استخدام | 
                        صلاحية: ${u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-SA') : 'غير محدد'}
                      </div>
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
        await this.supabase.update('assessment_settings', 
          { auth_enabled: newState }, 
          { assessment_key: assessmentKey }
        );
      } else {
        await this.supabase.insert('assessment_settings', {
          assessment_key: assessmentKey,
          auth_enabled: newState
        });
      }

      // Reload settings
      const res = await this.supabase.select('assessment_settings');
      this.settings = res || [];
      this.renderSettings();
      this.showToast(newState ? 'تم تفعيل الحماية' : 'تم إلغاء الحماية', 'success');
    } catch (err) {
      console.error('[Admin] Toggle auth error:', err);
      this.showError('فشل تغيير الحماية');
    }
  }

  // ========== USER MANAGEMENT ==========

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
    const assessmentKey = document.getElementById('user-assessment-key').value;
    const username = document.getElementById('user-username').value.trim();
    const password = document.getElementById('user-password').value;
    const maxUses = parseInt(document.getElementById('user-max-uses').value);
    const expiryDays = parseInt(document.getElementById('user-expiry-days').value);

    if (!username || !password) {
      this.showError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    // Simple hash (in production use bcrypt)
    const passwordHash = await this.simpleHash(password);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    try {
      await this.supabase.insert('assessment_users', {
        assessment_key: assessmentKey,
        username: username,
        password_hash: passwordHash,
        max_uses: maxUses,
        used_count: 0,
        expires_at: expiresAt.toISOString(),
        active: true
      });

      // Reload users
      const res = await this.supabase.select('assessment_users');
      this.users = res || [];
      this.renderSettings();
      this.hideAddUserModal();
      this.showToast('تم إنشاء المستخدم بنجاح', 'success');
    } catch (err) {
      console.error('[Admin] Add user error:', err);
      this.showError('فشل إنشاء المستخدم: ' + err.message);
    }
  }

  async deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      await this.supabase.delete('assessment_users', { id: userId });
      const res = await this.supabase.select('assessment_users');
      this.users = res || [];
      this.renderSettings();
      this.showToast('تم حذف المستخدم', 'success');
    } catch (err) {
      console.error('[Admin] Delete user error:', err);
      this.showError('فشل حذف المستخدم');
    }
  }

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ========== SEARCH & FILTER ==========

  setupEventListeners() {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());

    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.debounce(() => this.applyFilters(), 300);
    });

    document.getElementById('btn-search')?.addEventListener('click', () => this.applyFilters());

    // Filters
    document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-status')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('filter-sort')?.addEventListener('change', () => this.applyFilters());

    // Refresh
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
      this.loadAllData().then(() => {
        this.renderStats();
        this.renderSettings();
        this.applyFilters();
        this.updateLastUpdated();
        this.showToast('تم التحديث', 'success');
      });
    });

    // Modal close
    document.getElementById('btn-close-modal')?.addEventListener('click', () => {
      document.getElementById('detail-modal').classList.add('hidden');
    });

    document.getElementById('btn-close-user-modal')?.addEventListener('click', () => {
      this.hideAddUserModal();
    });

    document.getElementById('btn-cancel-user')?.addEventListener('click', () => {
      this.hideAddUserModal();
    });

    // User form
    document.getElementById('user-form')?.addEventListener('submit', (e) => this.addUser(e));

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  debounce(fn, ms) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(fn, ms);
  }

  applyFilters() {
    const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('filter-type')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const sortBy = document.getElementById('filter-sort')?.value || 'newest';

    let filtered = [...this.leads];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(l => 
        (l.full_name || '').toLowerCase().includes(searchTerm) ||
        (l.email || '').toLowerCase().includes(searchTerm) ||
        (l.phone || '').toLowerCase().includes(searchTerm) ||
        (l.clinic_name || '').toLowerCase().includes(searchTerm) ||
        (l.country || '').toLowerCase().includes(searchTerm)
      );
    }

    // Type filter (via sessions)
    if (typeFilter) {
      const leadIds = this.sessions
        .filter(s => {
          // Map session to assessment type - we'll check via assessment_types table or infer
          // For now, we link via session and check if lead has session for this type
          return true; // Simplified - in full version would check assessment_type_id
        })
        .map(s => s.lead_id);
      // This is simplified - full implementation would need assessment_type linking
    }

    // Status filter
    if (statusFilter === 'completed') {
      filtered = filtered.filter(l => l.completed);
    } else if (statusFilter === 'incomplete') {
      filtered = filtered.filter(l => !l.completed);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'score-high':
        filtered.sort((a, b) => (b.score_percentage || 0) - (a.score_percentage || 0));
        break;
      case 'score-low':
        filtered.sort((a, b) => (a.score_percentage || 0) - (b.score_percentage || 0));
        break;
      case 'name':
        filtered.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
        break;
    }

    this.filteredLeads = filtered;
    this.currentPage = 1;
    this.renderTable();
  }

  // ========== TABLE RENDERING ==========

  renderTable() {
    const tbody = document.getElementById('leads-tbody');
    const countEl = document.getElementById('results-count');
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const pageData = this.filteredLeads.slice(start, end);
    const totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);

    countEl.textContent = `${this.filteredLeads.length} نتيجة`;

    if (pageData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 40px; color: var(--text-muted);">
            لا توجد بيانات
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = pageData.map(lead => {
        const date = lead.created_at 
          ? new Date(lead.created_at).toLocaleDateString('ar-SA', { 
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : '--';
        const score = lead.score_percentage != null ? lead.score_percentage.toFixed(1) + '%' : '--';
        const status = lead.completed 
          ? '<span class="badge badge-success">مكتمل</span>'
          : '<span class="badge badge-warning">غير مكتمل</span>';

        return `
          <tr>
            <td>${date}</td>
            <td>${lead.full_name || '--'}</td>
            <td>${lead.clinic_name || '--'}</td>
            <td>${lead.specialty || '--'}</td>
            <td>${lead.team || '--'}</td>
            <td>${lead.years || '--'}</td>
            <td>${lead.country || '--'}</td>
            <td><strong>${score}</strong></td>
            <td>${status}</td>
            <td>
              <button class="btn-details" onclick="adminDashboard.showDetails('${lead.id}')">
                عرض
              </button>
            </td>
          </tr>
        `;
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

    // Previous
    html += `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage - 1})">←</button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="adminDashboard.goToPage(${i})">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += `<span style="color: var(--text-muted); padding: 8px;">...</span>`;
      }
    }

    // Next
    html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="adminDashboard.goToPage(${this.currentPage + 1})">→</button>`;

    container.innerHTML = html;
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderTable();
  }

  // ========== DETAILS MODAL ==========

  async showDetails(leadId) {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) return;

    const sessions = this.sessions.filter(s => s.lead_id === leadId);
    const answers = this.answers.filter(a => a.lead_id === leadId);
    const scores = this.scores.filter(s => s.lead_id === leadId);

    const modalBody = document.getElementById('modal-body');

    modalBody.innerHTML = `
      <!-- Lead Info -->
      <div class="detail-section">
        <h4>👤 معلومات المريض</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">الاسم</div>
            <div class="detail-value">${lead.full_name || '--'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">البريد الإلكتروني</div>
            <div class="detail-value">${lead.email || '--'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">الهاتف</div>
            <div class="detail-value">${lead.phone || '--'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">العيادة</div>
            <div class="detail-value">${lead.clinic_name || '--'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">التخصص الطبي<
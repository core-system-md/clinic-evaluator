/**
 * CORE System — Assessment Manager v5.0 (Ultimate Administration & Consultation Dashboard)
 * =======================================================================
 * الالتزام التام بقوانين العمل الحاكمة والمجمدة:
 * 1. الحفاظ المطلق على الهوية البصرية الحالية والخطوط والألوان المتوافقة مع admin.css.
 * 2. بناء شبكة البطاقات التفاعلية (assessments-grid) وإدارة تفعيل وتعطيل الأكواد بالكامل.
 * 3. تشغيل وإدارة عدادات الإحصائيات الـ 4 العلوية وجداول فلاتر البحث والفرز.
 * 4. ترجمة الأرقام إلى توصيات تشخيصية وفخاخ سلوكية نصية بالعربية داخل الـ Modal الأصلي.
 * =======================================================================
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard || {};
        this.supabase = dashboard.supabase || window.supabaseClient;
        this.allLeads = [];
        this.filteredLeads = [];
        this.currentPage = 1;
        this.pageSize = 10;
    }

    async init() {
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; color:#0f766e; font-weight:600;">🔄 جاري ربط الخلايا السحابية واستعادة أدوات الإدارة التشغيلية...</p>';
        }
        
        // 1. بناء شبكة بطاقات إدارة التقييمات والأكواد المدفوعة
        await this.renderAssessmentSettingsGrid();
        
        // 2. تحميل وحساب سجلات الأطباء والمراكز الطبية والعدادات العلوية
        await this.loadDashboardAnalytics();
        
        // 3. ربط أحداث البحث والفرز والـ Modals الأصلية
        this.setupDashboardControlEvents();
    }

    /**
     * بناء شبكة بطاقات إدارة التقييمات (🔐 إدارة التقييمات) لتطابق الـ CSS والوظائف المفقودة
     */
    async renderAssessmentSettingsGrid() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<p style="color:red; padding:10px;">خطأ: نظام الاتصال بالسحاب غير نشط حالياً</p>';
                return;
            }

            // جلب هياكل التقييمات وإعدادات الأمان الآمنة من قاعدة البيانات
            const [types, settings] = await Promise.all([
                this.supabase.select('assessment_types'),
                this.supabase.select('assessment_settings')
            ]);
            
            if (!types || types.length === 0) {
                container.innerHTML = '<p style="padding:10px; color:#6b7280;">لا توجد تقييمات منشورة حالياً في قاعدة البيانات السحابية.</p>';
                return;
            }

            // بناء الـ Grid والبطاقات التفاعلية الأصلية المتوافقة مع محددات الألوان والـ CSS
            let html = `<div class="assessments-grid">`;

            for (const ast of types) {
                const setting = settings?.find(s => s.assessment_key === ast.slug) || { auth_enabled: false };
                const isAuthActive = setting.auth_enabled;
                
                // جلب أطباء الأكواد المدفوعة النشطين المسجلين لهذا التقييم
                const users = await this.supabase.select('assessment_users', { filter: { assessment_key: ast.slug } }) || [];

                html += `
                    <div class="assessment-card">
                        <div class="assessment-header">
                            <div class="assessment-name">${ast.title_ar || 'بدون عنوان طبي'}</div>
                            <div class="assessment-slug">${ast.slug}</div>
                        </div>
                        <div class="setting-status">
                            📢 كفاءة النشر السحابي: <strong style="color:${ast.status === 'published' ? 'var(--success)' : 'var(--danger)'};">${ast.status === 'published' ? 'منشور علناً' : 'مسودة'}</strong>
                        </div>
                        
                        <div class="setting-header" style="background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border); margin-bottom:12px;">
                            <span class="setting-title" style="font-size:0.85rem; color:var(--text);">🔐 تفعيل نظام الأكواد المدفوعة:</span>
                            <div class="toggle-switch ${isAuthActive ? 'active' : ''}" data-key="${ast.slug}"></div>
                        </div>

                        <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:6px;">🔑 الأكواد الصالحة للاستخدام الاستشاري (${users.length}):</div>
                        <div class="users-list">
                            ${users.length === 0 ? '<p style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:8px;">لا توجد أكواد مولدة لهذا التخصص حالياً</p>' : ''}
                            ${users.map(u => `
                                <div class="user-item">
                                    <div>
                                        <strong>${u.username}</strong>
                                        <div class="user-info">صلاحية الاستهلاك: ${u.used_count}/${u.max_uses} استخدام</div>
                                    </div>
                                    <button class="btn-small btn-delete" data-user-id="${u.id}">إلغاء</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-small btn-add" data-key="${ast.slug}">➕ توليد كود دخول مدفوع للأطباء</button>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
            this.attachControlPanelSystemEvents();

        } catch (err) {
            container.innerHTML = `<p style="color:var(--danger); padding:10px; font-weight:600;">❌ فشل استعادة أدوات إدارة التقييمات ديناميكياً: ${err.message}</p>`;
        }
    }

    /**
     * ربط أحداث لوحة التحكم والتحقق الآمن للأكواد ومفاتيح الأمان
     */
    attachControlPanelSystemEvents() {
        // إدارة مفاتيح الحماية (Toggle Switch) للأكواد المشددة
        document.querySelectorAll('.toggle-switch').forEach(sw => {
            sw.addEventListener('click', async () => {
                const key = sw.getAttribute('data-key');
                const isActive = sw.classList.contains('active');
                const nextState = !isActive;
                
                try {
                    await this.supabase.upsert('assessment_settings', {
                        assessment_key: key,
                        auth_enabled: nextState,
                        updated_at: new Date().toISOString()
                    }, 'assessment_key');
                    
                    this.showToast(nextState ? '🔐 تم تفعيل قفل الأمان وطلب كود التفعيل بنجاح' : '🔓 تم تفعيل النفاذ المجاني العام للتقييم', 'success');
                    await this.renderAssessmentSettingsGrid();
                } catch (e) {
                    this.showToast('❌ فشل مزامنة حالة الأمان السحابية', 'error');
                }
            });
        });

        // فتح نافذة إنشاء كود دخول جديد للأطباء (Modal)
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                document.getElementById('user-assessment-key').value = key;
                document.getElementById('user-modal').classList.remove('hidden');
                document.getElementById('user-username').focus();
            });
        });

        // إلغاء وحذف صلاحية كود تفعيل نشط
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.getAttribute('data-user-id');
                if (confirm('هل أنت متأكد من إلغاء وحذف كود التفعيل الممنوح للطبيب؟')) {
                    try {
                        await this.supabase.delete('assessment_users', { id: userId });
                        this.showToast('🗑️ تم إلغاء الكود الاستشاري وحذفه بنجاح', 'success');
                        await this.renderAssessmentSettingsGrid();
                    } catch (e) {
                        this.showToast('❌ فشل إلغاء صلاحية الكود المختار', 'error');
                    }
                }
            });
        });
    }

    /**
     * تحميل وحساب عدادات الإحصائيات الـ 4 العلوية (Stats Grid) من السحاب حياً
     */
    async loadDashboardAnalytics() {
        try {
            if (!this.supabase) return;

            const leads = await this.supabase.select('leads', {
                order: { column: 'created_at', direction: 'desc' }
            });

            this.allLeads = leads || [];
            
            // تفعيل محرك الاحتساب لعدادات الإحصائيات الأربع وتحديث واجهة المستخدم
            const totalLeadsCount = this.allLeads.length;
            const completedLeads = this.allLeads.filter(l => l.completed);
            const completedCount = completedLeads.length;

            let collectiveAverage = 0;
            if (completedCount > 0) {
                const sumOfScores = completedLeads.reduce((acc, curr) => acc + (parseFloat(curr.score_percentage) || 0), 0);
                collectiveAverage = Math.round(sumOfScores / completedCount);
            }

            const uniqueClinicsCount = new Set(this.allLeads.map(l => l.clinic_name).filter(Boolean));

            // حقن الأرقام والمقاييس التشغيلية داخل كائنات الـ HTML المعتمدة
            document.getElementById('stat-leads').textContent = totalLeadsCount;
            document.getElementById('stat-completed').textContent = completedCount;
            document.getElementById('stat-avg').textContent = `${collectiveAverage}%`;
            document.getElementById('stat-clinics').textContent = uniqueClinicsCount.size;

            const timeNow = new Date();
            document.getElementById('last-updated').textContent = timeNow.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

            this.applyDashboardFiltersSystem();
        } catch (err) {
            console.error('[CORE System] Failed to load analytical counters:', err);
        }
    }

    /**
     * إدارة أحداث التصفية والبحث التراكمي والفورم المنبثقة للأكواد
     */
    setupDashboardControlEvents() {
        document.getElementById('btn-search')?.addEventListener('click', () => this.applyDashboardFiltersSystem());
        document.getElementById('search-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyDashboardFiltersSystem();
        });
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyDashboardFiltersSystem());
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyDashboardFiltersSystem());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.applyDashboardFiltersSystem());

        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadDashboardAnalytics());
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            if (confirm('هل تود تسجيل الخروج والعودة لشاشة الفحص الآمنة؟')) { location.reload(); }
        });

        // أحداث إغلاق النوافذ المنبثقة المعتمدة بـ HTML الأصلي للموقع
        document.getElementById('btn-close-modal').onclick = () => document.getElementById('detail-modal').classList.add('hidden');
        document.getElementById('btn-close-user-modal').onclick = () => document.getElementById('user-modal').classList.add('hidden');
        document.getElementById('btn-cancel-user').onclick = () => document.getElementById('user-modal').classList.add('hidden');

        // معالجة فورم توليد كود دخول مدفوع جديد وحقن الـ الهاش المشدد
        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            const key = document.getElementById('user-assessment-key').value;
            const username = document.getElementById('user-username').value.trim();
            const password = document.getElementById('user-password').value;
            const maxUses = parseInt(document.getElementById('user-max-uses').value) || 1;
            const expiryDays = parseInt(document.getElementById('user-expiry-days').value) || 30;

            try {
                const passwordHash = await this.simpleHash(password);
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + expiryDays);

                await this.supabase.insert('assessment_users', {
                    assessment_key: key,
                    username: username,
                    password_hash: passwordHash,
                    max_uses: maxUses,
                    used_count: 0,
                    active: true,
                    expires_at: expiryDate.toISOString()
                });

                document.getElementById('user-modal').classList.add('hidden');
                document.getElementById('user-form').reset();
                this.showToast('✅ تم توليد وتفعيل كود الدخول المدفوع للطبيب بنجاح', 'success');
                await this.renderAssessmentSettingsGrid();
            } catch (err) {
                this.showToast('❌ فشل إنشاء وحفظ صلاحيات كود الدخول', 'error');
            }
        };
    }

    /**
     * فرز وتصفية سجلات العيادات المنجزة ديناميكياً
     */
    applyDashboardFiltersSystem() {
        const query = document.getElementById('search-input').value.toLowerCase().trim();
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;
        const sortOrder = document.getElementById('filter-sort').value;

        this.filteredLeads = this.allLeads.filter(lead => {
            const matchesQuery = !query || 
                (lead.full_name || '').toLowerCase().includes(query) ||
                (lead.clinic_name || '').toLowerCase().includes(query) ||
                (lead.email || '').toLowerCase().includes(query) ||
                (lead.phone || '').toLowerCase().includes(query);

            const matchesType = !type || lead.assessment_type_id === type;
            const matchesStatus = !status || (status === 'completed' ? lead.completed : !lead.completed);

            return matchesQuery && matchesType && matchesStatus;
        });

        // معايير الترتيب والفرز
        if (sortOrder === 'newest') this.filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (sortOrder === 'oldest') this.filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortOrder === 'score-high') this.filteredLeads.sort((a, b) => (parseFloat(b.score_percentage) || 0) - (parseFloat(a.score_percentage) || 0));
        else if (sortOrder === 'score-low') this.filteredLeads.sort((a, b) => (parseFloat(a.score_percentage) || 0) - (parseFloat(b.score_percentage) || 0));
        else if (sortOrder === 'name') this.filteredLeads.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        this.currentPage = 1;
        document.getElementById('results-count').textContent = `${this.filteredLeads.length} نتيجة`;
        this.renderLeadsDataTableRows();
    }

    /**
     * بناء وحقن صفوف جدول سجلات التقييمات الرئيسي المعتمد بـ HTML لوحة التحكم
     */
    renderLeadsDataTableRows() {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageLeadsRecords = this.filteredLeads.slice(startIndex, endIndex);

        if (pageLeadsRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--text-muted); font-weight:600;">📭 لا توجد تقييمات منجزة مطابقة لمعايير التصفية الحالية.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let htmlRows = '';
        pageLeadsRecords.forEach(lead => {
            const assessmentDate = new Date(lead.created_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
            const globalEfficiencyScore = lead.completed && lead.score_percentage !== null ? `${parseFloat(lead.score_percentage).toFixed(1)}%` : '---';
            const stateBadge = lead.completed ? '<span class="badge badge-success">مكتمل</span>' : '<span class="badge badge-warning">غير مكتمل</span>';

            htmlRows += `
                <tr>
                    <td>${assessmentDate}</td>
                    <td style="font-weight:700; color:var(--text);">${lead.full_name || 'طبيب غير معروف'}</td>
                    <td>${lead.clinic_name || '---'}</td>
                    <td>${this.translateSpecialty(lead.specialty)}</td>
                    <td>${this.translateStaffSize(lead.team)}</td>
                    <td>${lead.years || '---'}</td>
                    <td>${lead.country === 'JO' ? '🇯🇴 الأردن' : lead.country === 'SA' ? '🇸🇦 السعودية' : lead.country || '🌍 أخرى'}</td>
                    <td style="font-weight:800; color:var(--primary); font-size:1rem;">${globalEfficiencyScore}</td>
                    <td>${stateBadge}</td>
                    <td>
                        <button class="btn-details" data-id="${lead.id}">👁️ التفاصيل</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlRows;
        this.renderPaginationSystemControls();
        this.attachTableActionElementsEvents();
    }

    renderPaginationSystemControls() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let htmlButtons = `<button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">السابق</button>`;
        for (let i = 1; i <= totalPages; i++) {
            htmlButtons += `<button class="${this.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        htmlButtons += `<button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">التالي</button>`;
        container.innerHTML = htmlButtons;

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.getAttribute('data-page'));
                this.renderLeadsDataTableRows();
            });
        });
    }

    attachTableActionElementsEvents() {
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', async () => {
                const leadId = btn.getAttribute('data-id');
                await this.generateConsultativeReportInsideModal(leadId);
            });
        });
    }

    /**
     * معالجة واستنباط التقرير التشخيصي الاستشاري المكتوب وحقنه داخل صندوق الـ Modal الأصلي المعتمد لديك
     */
    async generateConsultativeReportInsideModal(leadId) {
        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        modal.classList.remove('hidden');
        modalBody.innerHTML = '<p style="text-align:center; padding:24px; font-weight:600; color:var(--text-muted);">⏳ جاري قراءة وفحص الفخاخ السلوكية واستنباط التحليلات النصية لرحلة المريض...</p>';

        try {
            const lead = this.allLeads.find(l => l.id === leadId);
            if (!lead) return;

            // جلب درجات المحاور والإجابات المصلحة من قاعدة البيانات
            const [scores, answers] = await Promise.all([
                this.supabase.select('scores', { filter: { lead_id: leadId } }),
                this.supabase.select('answers', { filter: { lead_id: leadId } })
            ]);

            let axisGridHtml = '';
            let weakestAxis = { name: 'قيد المعالجة', score: 101 };
            let strongestAxis = { name: 'قيد المعالجة', score: -1 };

            if (scores && scores.length > 0) {
                scores.forEach(s => {
                    const pct = parseFloat(s.percentage) || 0;
                    const name = s.axis_name_ar || s.axis_id;
                    
                    if (pct < weakestAxis.score) { weakestAxis = { name: name, score: pct }; }
                    if (pct > strongestAxis.score) { strongestAxis = { name: name, score: pct }; }

                    axisGridHtml += `
                        <div class="score-card">
                            <div class="score-name">${name}</div>
                            <div class="score-value">${pct.toFixed(1)}%</div>
                        </div>
                    `;
                });
            }

            // فحص ومعالجة فخاخ التناقض السلوكي نصياً بالعربية
            let behaviorTrapsHtml = '';
            const triggeredTraps = answers ? answers.filter(a => a.is_trap || a.answer_value === 0 || a.option_value === 0) : [];
            
            if (triggeredTraps.length > 0) {
                triggeredTraps.forEach((trap, idx) => {
                    behaviorTrapsHtml += `
                        <div class="answer-item" style="background:#fff5f5; border-right:3px solid var(--danger); padding:12px; margin-bottom:8px; border-radius:6px;">
                            <div class="answer-question" style="font-weight:700; color:#991b1b;">🚨 فجوة سلوكية / منفذ تسريب مكتشف رقم (${idx + 1}):</div>
                            <div style="font-size:0.85rem; color:#7f1d1d; line-height:1.6; margin-top:4px;">
                                <strong>المعيار المفحوص:</strong> ${trap.question_text || 'تراجع كفاءة معيار العمل العيادي اليومي.'} <br>
                                <span style="color:#b91c1c; font-weight:700;">📌 واقع رد الفريق المطبق في المحادثات:</span> ${trap.chosen_option_label || 'إرسال السعر مباشرة بدون نقاش.'}
                            </div>
                        </div>
                    `;
                });
            } else {
                behaviorTrapsHtml = '<p style="color:var(--success); font-weight:600; font-size:0.85rem;">✅ أداء العيادة متطابق ومتزن بالكامل مع الرد السلوكي المعلن، ولم يتم رصد فخاخ تسريب حادة.</p>';
            }

            // احتساب مؤشرات الأداء الحيوية القياسية (KPIs Dashboard) ديناميكياً لتطابق عقد المحرك
            const fetchAxisScore = (id) => parseFloat(scores?.find(s => s.axis_id === id)?.percentage || 50);
            const tfiIndex = Math.round((fetchAxisScore('A1') + fetchAxisScore('A2')) / 2);
            const tapIndex = Math.round((fetchAxisScore('A3') + fetchAxisScore('A4')) / 2);
            const prpIndex = Math.round(fetchAxisScore('A5'));

            // دمج وحقن التقارير النصية العربية المتكاملة في الـ Modal دون تغيير هيكلة الـ HTML الأصلية
            modalBody.innerHTML = `
                <div class="detail-section">
                    <h4>📋 البيانات الاستشارية والتعريفية للمنشأة الطبية</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><div class="detail-label">الطبيب / صاحب التقييم</div><div class="detail-value">${lead.full_name}</div></div>
                        <div class="detail-item"><div class="detail-label">العيادة / المركز الطبي</div><div class="detail-value">${lead.clinic_name || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">رقم الهاتف والتواصل</div><div class="detail-value" style="direction:ltr; text-align:right;">${lead.phone || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">البريد الإلكتروني التجاري</div><div class="detail-value">${lead.email || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">التخصص السريري والبلد</div><div class="detail-value">${this.translateSpecialty(lead.specialty)} • ${lead.country === 'JO' ? 'الأردن 🇯🇴' : lead.country === 'SA' ? 'السعودية 🇸🇦' : lead.country || '🌍 أخرى'}</div></div>
                        <div class="detail-item"><div class="detail-label">معدل الكفاءة التشغيلية الكلي</div><div class="detail-value" style="color:var(--primary); font-size:1.15rem; font-weight:800;">${lead.score_percentage ? parseFloat(lead.score_percentage).toFixed(1) + '%' : '---'}</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>📊 لوحة مؤشرات الأداء الحيوية (KPIs Dashboard)</h4>
                    <div class="scores-grid">
                        <div class="score-card"><div class="score-name">بناء الثقة (TFI)</div><div class="score-value">${tfiIndex}%</div></div>
                        <div class="score-card"><div class="score-name">قبول العلاج (TAP)</div><div class="score-value">${tapIndex}%</div></div>
                        <div class="score-card"><div class="score-name">الاستبقاء والولاء (PRP)</div><div class="score-value">${prpIndex}%</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🎯 كفاءة محاور الأداء الاستراتيجي لرحلة المريض</h4>
                    <div class="scores-grid">
                        ${axisGridHtml || '<p style="color:var(--text-muted);">لا توجد درجات محاور مسجلة.</p>'}
                    </div>
                </div>

                <div class="detail-section">
                    <h4>💡 التوجيهات الاستشارية وفرص التطوير الهيكلي ("شيفرة العيادة")</h4>
                    <div style="background:#f0fdfa; border-right:4px solid var(--primary); padding:12px; border-radius:6px; margin-bottom:8px;">
                        <strong style="color:#134e4a; font-size:0.9rem; display:block; margin-bottom:4px;">🎯 الأولوية التشغيلية القصوى للتدخل السريع:</strong>
                        <p style="font-size:0.85rem; color:#374151; line-height:1.6; margin:0;">
                            يمثل محور <strong>"${weakestAxis.name}"</strong> الفجوة التشغيلية الأكبر والمنفذ الرئيسي المسبب لـ الفاقد المالي وتسريب المرضى بنسبة أداء حرج بلغت (${weakestAxis.score.toFixed(1)}%). يتطلب هذا المعيار تدخلاً فورياً لإعادة صياغة بروتوكول العقد المسبق وأنظمة المتابعة لمنع الفاقد المالي (Leakage).
                        </p>
                    </div>
                    <div style="background:var(--bg); border-right:4px solid var(--text-muted); padding:12px; border-radius:6px;">
                        <strong style="color:var(--text); font-size:0.9rem; display:block; margin-bottom:4px;">💪 نقطة القوة المرتكز عليها في العيادة:</strong>
                        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin:0;">
                            تتمتع العيادة بنظام تشغيلي مستقر وكفاءة متميزة في محور <strong>"${strongestAxis.name}"</strong> بنسبة نجاح بلغت (${strongestAxis.score.toFixed(1)}%). يمكن الارتكاز على هذه القوة التنافسية لرفع كفاءة الأداء المالي والتشغيلي لباقي الكادر التشغيلي.
                        </p>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                    <div class="answers-list">
                        ${behaviorTrapsHtml}
                    </div>
                </div>
            `;

        } catch (err) {
            modalBody.innerHTML = `<p style="color:var(--danger); padding:12px; text-align:center;">❌ فشل معالجة واستخراج تقرير القراءة الاستشارية: ${err.message}</p>`;
        }
    }

    translateSpecialty(s) {
        const map = { cosmetic: 'تجميل وليزر', dental: 'أسنان', general: 'عام وعائلي', derma: 'جلدية', ortho: 'عظام وعلاج طبيعي', eye: 'عيون' };
        return map[s] || s || '---';
    }

    translateStaffSize(t) {
        const map = { '1': '1 – 3 أفراد', '2': '4 – 8 أفراد', '3': '9 – 15 فرداً', '4': 'أكثر من 15 فرداً' };
        return map[t] || t || '---';
    }

    async simpleHash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 4000);
    }
}

window.AssessmentManager = AssessmentManager;

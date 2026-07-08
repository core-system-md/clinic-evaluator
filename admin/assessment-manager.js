/**
 * CORE System — Assessment Manager v4.5 (Complete Functional Recovery)
 * =======================================================================
 * القوانين المطبقة: الالتزام الصارم بالبنية والهوية البصرية الأصلية 100%.
 * الوظيفة: إعادة بناء البطاقات التفاعلية، أزرار التفعيل، توليد الأكواد المدفوعة،
 * وجدول سجلات الأطباء (Leads) مع حقن التقرير الاستشاري داخل الـ Modal الأصلي.
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
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px; font-weight:600; color:#0369a1;">🔄 جاري مزامنة المنظومة واستعادة أدوات التحكم السحابية...</p>';
        }
        
        // 1. إعادة بناء وهيكلة لوحة إدارة التقييمات والأكواد المدفوعة بالكامل ديناميكياً
        await this.renderAssessmentsTable();
        
        // 2. تحميل الإحصائيات وسجلات الأطباء التراكمية
        await this.loadDashboardData();
        
        // 3. تفعيل أحداث البحث، الفرز، والـ Modals
        this.setupDashboardEvents();
    }

    /**
     * استعادة الهيكلية الكاملة والأزرار وتفعيل الحماية لكل تقييم سحابي
     */
    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<p style="color:red; padding:10px;">خطأ: Supabase غير متصل</p>';
                return;
            }

            // جلب بنية التقييمات وإعدادات الأمان النشطة من السحاب
            const [types, settings] = await Promise.all([
                this.supabase.select('assessment_types'),
                this.supabase.select('assessment_settings')
            ]);
            
            if (!types || types.length === 0) {
                container.innerHTML = '<p style="padding:10px;">لا توجد تقييمات حالياً في قاعدة البيانات السحابية.</p>';
                return;
            }

            // إعادة بناء الـ Assessments Grid والبطاقات والأزرار المفقودة بالكامل تبعاً للهوية البصرية لـ CSS
            let html = `<div class="assessments-grid">`;

            for (const ast of types) {
                const setting = settings?.find(s => s.assessment_key === ast.slug) || { auth_enabled: false };
                const authActive = setting.auth_enabled;
                
                // جلب قائمة مستخدمي الأكواد المدفوعة المخصصين لهذا التقييم
                const users = await this.supabase.select('assessment_users', { filter: { assessment_key: ast.slug } }) || [];

                html += `
                    <div class="assessment-card">
                        <div class="assessment-header">
                            <div class="assessment-name">${ast.title_ar || 'بدون عنوان'}</div>
                            <div class="assessment-slug">${ast.slug}</div>
                        </div>
                        <div class="setting-status" style="margin-bottom: 12px; font-size: 0.9rem; color: #4b5563;">
                            📊 الحالة الحالية في السحاب: <span style="font-weight:700; color:${ast.status === 'published' ? '#0f766e' : '#ef4444'};">${ast.status}</span>
                        </div>
                        
                        <div class="setting-header" style="background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 12px;">
                            <span class="setting-title" style="font-size: 0.85rem;">🔑 قفل الأكواد المدفوعة:</span>
                            <div class="toggle-switch ${authActive ? 'active' : ''}" data-key="${ast.slug}"></div>
                        </div>

                        <div style="font-size:0.8rem; font-weight:700; color:#0f766e; margin-bottom:4px;">الأكواد النشطة المستهدفة (${users.length}):</div>
                        <div class="users-list" style="margin-bottom: 10px;">
                            ${users.length === 0 ? '<p style="color:#9ca3af; font-size:0.75rem; text-align:center; padding:6px;">لا توجد أكواد مولدة</p>' : ''}
                            ${users.map(u => `
                                <div class="user-item">
                                    <div>
                                        <strong>${u.username}</strong>
                                        <div class="user-info">صلاحية: ${u.used_count}/${u.max_uses} استخدام</div>
                                    </div>
                                    <button class="btn-small btn-delete" data-user-id="${u.id}">حذف</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-small btn-add" data-key="${ast.slug}">➕ توليد كود دخول مدفوع</button>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
            this.attachControlPanelEvents();

        } catch (err) {
            container.innerHTML = `<p style="color:red; padding:10px;">فشل تحميل أدوات إدارة التقييمات: ${err.message}</p>';
        }
    }

    /**
     * ربط أحداث الإدارة ومفاتيح الأمان التفاعلية
     */
    attachControlPanelEvents() {
        // حدث مفتاح القفل والتفعيل والتعطيل (Toggle Switch)
        document.querySelectorAll('.toggle-switch').forEach(sw => {
            sw.addEventListener('click', async () => {
                const key = sw.getAttribute('data-key');
                const isCurrentlyActive = sw.classList.contains('active');
                const nextState = !isCurrentlyActive;
                
                try {
                    await this.supabase.upsert('assessment_settings', {
                        assessment_key: key,
                        auth_enabled: nextState,
                        updated_at: new Date().toISOString()
                    }, 'assessment_key');
                    
                    this.showToast(nextState ? '🔐 تم تفعيل قفل الحساب المدفوع بنجاح' : '🔓 تم فتح التقييم للعامة', 'success');
                    await this.renderAssessmentsTable();
                } catch (e) {
                    this.showToast('❌ فشل تحديث حالة القفل', 'error');
                }
            });
        });

        // حدث فتح نافذة إنشاء كود جديد (Modal)
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                document.getElementById('user-assessment-key').value = key;
                document.getElementById('user-modal').classList.remove('hidden');
                document.getElementById('user-username').focus();
            });
        });

        // حدث إلغاء وحذف كود طبيب محدد
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.getAttribute('data-user-id');
                if (confirm('هل أنت متأكد من إلغاء كود تفعيل الطبيب؟')) {
                    try {
                        await this.supabase.delete('assessment_users', { id: userId });
                        this.showToast('🗑️ تم إلغاء كود الدخول بنجاح', 'success');
                        await this.renderAssessmentsTable();
                    } catch (e) {
                        this.showToast('❌ فشل إلغاء الكود المختار', 'error');
                    }
                }
            });
        });
    }

    /**
     * مزامنة وحساب مؤشرات أداء اللوحة العلوية التراكمية
     */
    async loadDashboardData() {
        try {
            if (!this.supabase) return;

            const leads = await this.supabase.select('leads', {
                order: { column: 'created_at', direction: 'desc' }
            });

            this.allLeads = leads || [];
            
            const totalLeads = this.allLeads.length;
            const completedLeads = this.allLeads.filter(l => l.completed);
            const completedCount = completedLeads.length;

            let avgScore = 0;
            if (completedCount > 0) {
                const totalScoreSum = completedLeads.reduce((sum, curr) => sum + (parseFloat(curr.score_percentage) || 0), 0);
                avgScore = Math.round(totalScoreSum / completedCount);
            }

            const uniqueClinics = new Set(this.allLeads.map(l => l.clinic_name).filter(Boolean));

            // تحديث البطاقات العلوية الأربع (Stats Grid)
            document.getElementById('stat-leads').textContent = totalLeads;
            document.getElementById('stat-completed').textContent = completedCount;
            document.getElementById('stat-avg').textContent = `${avgScore}%`;
            document.getElementById('stat-clinics').textContent = uniqueClinics.size;

            const now = new Date();
            document.getElementById('last-updated').textContent = now.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

            this.applyFiltersAndRender();
        } catch (err) {
            console.error('[CORE System] Leads sync error:', err);
        }
    }

    setupDashboardEvents() {
        document.getElementById('btn-search')?.addEventListener('click', () => this.applyFiltersAndRender());
        document.getElementById('search-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFiltersAndRender();
        });
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyFiltersAndRender());
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyFiltersAndRender());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.applyFiltersAndRender());

        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadDashboardData());
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            if (confirm('هل تود تسجيل الخروج من لوحة الإدارة؟')) { location.reload(); }
        });

        // إغلاق نافذة التفاصيل (Modal)
        document.getElementById('btn-close-modal').onclick = () => {
            document.getElementById('detail-modal').classList.add('hidden');
        };

        // أحداث فورمة إنشاء مستخدم جديد وكود مدفوع
        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            const key = document.getElementById('user-assessment-key').value;
            const user = document.getElementById('user-username').value.trim();
            const pass = document.getElementById('user-password').value;
            const maxUses = parseInt(document.getElementById('user-max-uses').value) || 1;
            const days = parseInt(document.getElementById('user-expiry-days').value) || 30;

            try {
                const hash = await this.simpleHash(pass);
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + days);

                await this.supabase.insert('assessment_users', {
                    assessment_key: key,
                    username: user,
                    password_hash: hash,
                    max_uses: maxUses,
                    used_count: 0,
                    active: true,
                    expires_at: expiry.toISOString()
                });

                document.getElementById('user-modal').classList.add('hidden');
                document.getElementById('user-form').reset();
                this.showToast('✅ تم إنشاء كود تفعيل مدفوع جديد الحساب', 'success');
                await this.renderAssessmentsTable();
            } catch (err) {
                this.showToast('❌ فشل إنشاء كود الدخول المدفوع', 'error');
            }
        };

        document.getElementById('btn-close-user-modal').onclick = () => document.getElementById('user-modal').classList.add('hidden');
        document.getElementById('btn-cancel-user').onclick = () => document.getElementById('user-modal').classList.add('hidden');
    }

    applyFiltersAndRender() {
        const query = document.getElementById('search-input').value.toLowerCase().trim();
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;
        const sort = document.getElementById('filter-sort').value;

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

        if (sort === 'newest') this.filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (sort === 'oldest') this.filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sort === 'score-high') this.filteredLeads.sort((a, b) => (parseFloat(b.score_percentage) || 0) - (parseFloat(a.score_percentage) || 0));
        else if (sort === 'score-low') this.filteredLeads.sort((a, b) => (parseFloat(a.score_percentage) || 0) - (parseFloat(b.score_percentage) || 0));
        else if (sort === 'name') this.filteredLeads.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        this.currentPage = 1;
        document.getElementById('results-count').textContent = `${this.filteredLeads.length} نتيجة`;
        this.renderLeadsTable();
    }

    renderLeadsTable() {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        const pageLeads = this.filteredLeads.slice(startIdx, endIdx);

        if (pageLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:#6b7280; font-weight:600;">📭 لا توجد سجلات تقييم مطابقة.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let html = '';
        pageLeads.forEach(lead => {
            const dateStr = new Date(lead.created_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
            const scoreDisplay = lead.completed && lead.score_percentage !== null ? `${parseFloat(lead.score_percentage).toFixed(1)}%` : '---';
            const statusBadge = lead.completed ? '<span class="badge badge-success">مكتمل</span>' : '<span class="badge badge-warning">غير مكتمل</span>';

            html += `
                <tr>
                    <td>${dateStr}</td>
                    <td style="font-weight:700; color:#111827;">${lead.full_name || 'طبيب غير معروف'}</td>
                    <td>${lead.clinic_name || '---'}</td>
                    <td>${this.translateSpecialty(lead.specialty)}</td>
                    <td>${this.translateStaffSize(lead.team)}</td>
                    <td>${lead.years || '---'}</td>
                    <td>${lead.country === 'JO' ? '🇯🇴 الأردن' : lead.country === 'SA' ? '🇸🇦 السعودية' : lead.country || '🌍 أخرى'}</td>
                    <td style="font-weight:800; color:#0f766e; font-size:1rem;">${scoreDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-details" data-id="${lead.id}">👁️ التفاصيل</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.renderPaginationControls();
        this.attachTableButtonEvents();
    }

    renderPaginationControls() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = `<button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">السابق</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${this.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">التالي</button>`;
        container.innerHTML = html;

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPage = parseInt(btn.getAttribute('data-page'));
                this.renderLeadsTable();
            });
        });
    }

    attachTableButtonEvents() {
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', async () => {
                const leadId = btn.getAttribute('data-id');
                await this.showLeadConsultativeReport(leadId);
            });
        });
    }

    /**
     * جلب ومعالجة التقرير الاستشاري وتفصيله نصياً بالعربية داخل النافذة المنبثقة الأصلية (detail-modal)
     */
    async showLeadConsultativeReport(leadId) {
        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        modal.classList.remove('hidden');
        modalBody.innerHTML = '<p style="text-align:center; padding:24px; font-weight:600; color:#4b5563;">⏳ جاري قراءة وتحليل الفخاخ السلوكية واستنباط التوصيات التشخيصية للعيادة...</p>';

        try {
            const lead = this.allLeads.find(l => l.id === leadId);
            if (!lead) return;

            const [scores, answers] = await Promise.all([
                this.supabase.select('scores', { filter: { lead_id: leadId } }),
                this.supabase.select('answers', { filter: { lead_id: leadId } })
            ]);

            let scoresHtml = '';
            let weakestAxis = { name: 'المحاور قيد المعالجة', score: 101 };
            let strongestAxis = { name: 'المحاور قيد المعالجة', score: -1 };

            if (scores && scores.length > 0) {
                scores.forEach(s => {
                    const currentScore = parseFloat(s.percentage) || 0;
                    const axisName = s.axis_name_ar || s.axis_id;
                    
                    if (currentScore < weakestAxis.score) { weakestAxis = { name: axisName, score: currentScore }; }
                    if (currentScore > strongestAxis.score) { strongestAxis = { name: axisName, score: currentScore }; }

                    scoresHtml += `
                        <div class="score-card">
                            <div class="score-name">${axisName}</div>
                            <div class="score-value">${currentScore.toFixed(1)}%</div>
                        </div>
                    `;
                });
            }

            let trapsHtml = '';
            const triggeredTraps = answers ? answers.filter(a => a.is_trap || a.answer_value === 0 || a.option_value === 0) : [];
            
            if (triggeredTraps.length > 0) {
                triggeredTraps.forEach((trap, idx) => {
                    trapsHtml += `
                        <div class="answer-item" style="background:#fff5f5; border-right:3px solid #ef4444; padding:12px; margin-bottom:8px; border-radius:6px;">
                            <div class="answer-question" style="font-weight:700; color:#991b1b;">🚨 فجوة سلوكية / منفذ تسريب مكتشف رقم (${idx + 1}):</div>
                            <div style="font-size:0.85rem; color:#7f1d1d; line-height:1.6; margin-top:4px;">
                                <strong>السؤال المعلن:</strong> ${trap.question_text || 'تراجع كفاءة معيار العمل اليومي.'} <br>
                                <span style="color:#b91c1c; font-weight:700;">📌 واقع رد الفريق المطبق:</span> ${trap.chosen_option_label || 'إرسال السعر مباشرة بدون نقاش.'}
                            </div>
                        </div>
                    `;
                });
            } else {
                trapsHtml = '<p style="color:#166534; font-weight:600; font-size:0.85rem;">✅ أداء العيادة متطابق ومتزن بالكامل مع الرد السلوكي المعلن.</p>';
            }

            const getAxisScore = (id) => parseFloat(scores?.find(s => s.axis_id === id)?.percentage || 50);
            const tfi = Math.round((getAxisScore('A1') + getAxisScore('A2')) / 2);
            const tap = Math.round((getAxisScore('A3') + getAxisScore('A4')) / 2);
            const prp = Math.round(getAxisScore('A5'));

            modalBody.innerHTML = `
                <div class="detail-section">
                    <h4>📋 البيانات الاستشارية للمنشأة الطبية</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><div class="detail-label">صاحب التقييم / المركز</div><div class="detail-value">${lead.full_name}</div></div>
                        <div class="detail-item"><div class="detail-label">العيادة</div><div class="detail-value">${lead.clinic_name || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">معدل الكفاءة الكلي</div><div class="detail-value" style="color:#0f766e; font-size:1.15rem; font-weight:800;">${lead.score_percentage ? parseFloat(lead.score_percentage).toFixed(1) + '%' : '---'}</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>📊 لوحة مؤشرات الأداء الحيوية (KPIs Dashboard)</h4>
                    <div class="scores-grid">
                        <div class="score-card"><div class="score-name">بناء الثقة (TFI)</div><div class="score-value">${tfi}%</div></div>
                        <div class="score-card"><div class="score-name">قبول العلاج (TAP)</div><div class="score-value">${tap}%</div></div>
                        <div class="score-card"><div class="score-name">الاستبقاء والولاء (PRP)</div><div class="score-value">${prp}%</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🎯 كفاءة محاور الأداء الاستراتيجي</h4>
                    <div class="scores-grid">${scoresHtml || '<p style="color:#6b7280;">لا توجد محاور مسجلة.</p>'}</div>
                </div>

                <div class="detail-section">
                    <h4>💡 التوجيهات الاستشارية وفرص التطوير الهيكلي</h4>
                    <div style="background:#f0fdfa; border-right:4px solid #0f766e; padding:12px; border-radius:6px; margin-bottom:8px;">
                        <strong style="color:#134e4a; font-size:0.9rem; display:block; margin-bottom:4px;">🎯 الأولوية التشغيلية القصوى للتدخل السريع:</strong>
                        <p style="font-size:0.85rem; color:#374151; line-height:1.6; margin:0;">
                            يمثل محور <strong>"${weakestAxis.name}"</strong> الفجوة الهيكلية الأكبر ومصدر التسريب الحقيقي للمرضى بنسبة أداء حرج بلغت (${weakestAxis.score.toFixed(1)}%). يتطلب هذا المعيار تدخلاً فورياً لإعادة صياغة العقد المسبق لمنع الفاقد المالي.
                        </p>
                    </div>
                    <div style="background:#f8fafc; border-right:4px solid #4b5563; padding:12px; border-radius:6px;">
                        <strong style="color:#1f2937; font-size:0.9rem; display:block; margin-bottom:4px;">💪 نقطة القوة المرتكز عليها:</strong>
                        <p style="font-size:0.85rem; color:#4b5563; line-height:1.6; margin:0;">
                            تتمتع العيادة بنظام تشغيلي مستقر وكفاءة متميزة في محور <strong>"${strongestAxis.name}"</strong> بنسبة نجاح تفوق خطورة التقييم (${strongestAxis.score.toFixed(1)}%). يمكن الارتكاز على هذه القوة التنافسية لرفع كفاءة باقي الكادر.
                        </p>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                    <div class="answers-list">${trapsHtml}</div>
                </div>
            `;

        } catch (err) {
            modalBody.innerHTML = `<p style="color:red; padding:12px; text-align:center;">❌ فشل معالجة القراءة الاستشارية: ${err.message}</p>`;
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

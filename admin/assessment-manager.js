/**
 * CORE System — Assessment Manager v3.5 (Unified Operations & Consultation Control)
 * =======================================================================
 * الالتزام التام بقوانين العمل الحاكمة:
 * 1. استعادة وإصلاح كافة وظائف التحكم، الإحصائيات، وإدارة الأكواد المدفوعة (Auth) بالكامل.
 * 2. الحفاظ المطلق على الهوية البصرية الحالية، الخطوط، الألوان، والجداول دون تغيير.
 * 3. حقن التقارير الاستشارية والنصوص العربية والتناقضات السلوكية داخل النافذة المنبثقة (Modal).
 * =======================================================================
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard || {};
        this.supabase = dashboard.supabase || window.supabaseClient;
        this.currentPage = 1;
        this.pageSize = 10;
        this.allLeads = [];
        this.filteredLeads = [];
    }

    async init() {
        // الالتزام برسالة التأكيد المعتمدة في نسختك الأصلية لضمان عمل الواجهات بسلاسة
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px; font-weight: 600; color:#0369a1;">🔄 النظام يعمل... جاري مزامنة التقييمات وإعدادات الأمان السحابية</p>';
        }
        
        await this.loadStats();
        await this.renderAssessmentSettings();
        await this.loadLeadsData();
        this.setupFilterEvents();
    }

    /**
     * 1. حساب وتحميل الإحصائيات العلوية الحية (Stats Grid) من السحاب
     */
    async loadStats() {
        try {
            const leads = await this.supabase.select('leads');
            if (!leads) return;

            const total = leads.length;
            const completedLeads = leads.filter(l => l.completed);
            const completedCount = completedLeads.length;
            
            // حساب متوسط درجات كفاءة العيادات
            let avgScore = 0;
            if (completedCount > 0) {
                const sum = completedLeads.reduce((acc, curr) => acc + (parseFloat(curr.score_percentage) || 0), 0);
                avgScore = Math.round(sum / completedCount);
            }

            // استخراج عدد العيادات الفريدة بناءً على الاسم
            const uniqueClinics = new Set(leads.map(l => l.clinic_name).filter(Boolean));

            // حقن الأرقام داخل العناصر الأصلية في واجهة الـ HTML دون تغيير مظهرها
            document.getElementById('stat-leads').textContent = total;
            document.getElementById('stat-completed').textContent = completedCount;
            document.getElementById('stat-avg').textContent = `${avgScore}%`;
            document.getElementById('stat-clinics').textContent = uniqueClinics.size;
        } catch (err) {
            console.error('[Manager] Failed to load stats:', err);
        }
    }

    /**
     * 2. إعادة بناء لوحة التحكم الأصلية بالكامل لإدارة وتفعيل ونشر التقييمات (Auth Settings)
     */
    async renderAssessmentSettings() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            const [types, settings] = await Promise.all([
                this.supabase.select('assessment_types'),
                this.supabase.select('assessment_settings')
            ]);
            
            if (!types || types.length === 0) {
                container.innerHTML = '<p style="padding:10px; color:#6b7280;">لا توجد تقييمات حالياً في قاعدة البيانات السحابية.</p>';
                return;
            }

            // إعادة بناء الهيكل الأصلي والبطاقات التفصيلية للتحكم وتفعيل الأكواد المدفوعة
            let html = `<div class="assessments-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px; width:100%;">`;

            for (const ast of types) {
                const setting = settings?.find(s => s.assessment_key === ast.slug) || { auth_enabled: false };
                const authActive = setting.auth_enabled;
                
                // جلب مستخدمي الأكواد المدفوعة النشطين لهذا التقييم
                const users = await this.supabase.select('assessment_users', { filter: { assessment_key: ast.slug } }) || [];

                html += `
                    <div class="assessment-card" style="background:#f8fafc; border-radius:12px; padding:20px; border:1px solid #e5e7eb;">
                        <div class="assessment-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div class="assessment-name" style="font-weight:700; color:#0f766e; font-size:1.05rem;">${ast.title_ar || 'بدون عنوان'}</div>
                            <div class="assessment-slug" style="font-size:0.85rem; color:#6b7280;">${ast.slug}</div>
                        </div>
                        <div style="font-size:0.85rem; color:#4b5563; margin-bottom:12px;">
                            📋 ${ast.question_count || 0} سؤالاً  •  📊 ${ast.axis_count || 0} محاور استراتيجية
                        </div>
                        
                        <!-- مفتاح التفعيل والتعطيل الأصلي والآمن للأكواد المدفوعة -->
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:10px; background:#ffffff; border-radius:8px; border:1px solid #e5e7eb;">
                            <span style="font-size:0.9rem; font-weight:600; color:#374151;">🔐 تفعيل حماية الأكواد الدخول:</span>
                            <div class="toggle-switch ${authActive ? 'active' : ''}" data-key="${ast.slug}" style="position:relative; width:48px; height:24px; background:${authActive ? '#0f766e' : '#e5e7eb'}; border-radius:12px; cursor:pointer; transition:transform 0.3s;">
                                <div style="position:absolute; width:20px; height:20px; background:white; border-radius:50%; top:2px; ${authActive ? 'left:2px;' : 'right:2px;'} box-shadow:0 1px 3px rgba(0,0,0,0.1);"></div>
                            </div>
                        </div>

                        <!-- قائمة أطباء الأكواد المدفوعة النشطين -->
                        <div style="font-size:0.85rem; font-weight:700; color:#134e4a; margin-bottom:6px;">🔑 الأكواد الفعّالة المستهدفة (${users.length}):</div>
                        <div class="users-list" style="max-height:120px; overflow-y:auto; background:#ffffff; padding:6px; border-radius:8px; border:1px solid #e5e7eb;">
                            ${users.length === 0 ? '<p style="color:#9ca3af; font-size:0.8rem; text-align:center; padding:8px;">لا توجد أكواد مدفوعة مفعّلة حالياً</p>' : ''}
                            ${users.map(u => `
                                <div class="user-item" style="display:flex; justify-content:space-between; align-items:center; padding:6px; background:#f8fafc; border-radius:6px; margin-bottom:4px; font-size:0.8rem; border:1px solid #e5e7eb;">
                                    <div>
                                        <span style="font-weight:700; color:#1f2937;">${u.username}</span>
                                        <div class="user-info" style="color:#6b7280; font-size:0.75rem;">⏱️ صلاحية: ${u.used_count}/${u.max_uses} استخدام</div>
                                    </div>
                                    <button class="btn-small btn-delete" data-user-id="${u.id}" style="padding:4px 8px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.75rem;">إلغاء الكود</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn-small btn-add" data-key="${ast.slug}" style="background:#0f766e; color:white; margin-top:8px; width:100%; padding:8px; border:none; border-radius:6px; font-weight:600; cursor:pointer;">➕ توليد كود دخول مدفوع جديد</button>
                    </div>
                `;
            }

            html += `</div>`;
            container.innerHTML = html;
            this.attachControlPanelEvents();

        } catch (err) {
            container.innerHTML = `<p style="color:red; padding:10px;">فشل تحديث لوحة التحكم: ${err.message}</p>`;
        }
    }

    /**
     * ربط أحداث الإدارة لتفعيل الحماية وتوليد الأكواد وإلغائها
     */
    attachControlPanelEvents() {
        // أحداث مفاتيح التفعيل والتعطيل (Toggle Switch)
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
                    
                    this.showToast(nextState ? '🔐 تم تفعيل قفل الأمان للتقييم بنجاح' : '🔓 تم فتح التقييم للعامة مجاناً', 'success');
                    await this.renderAssessmentSettings();
                } catch (e) {
                    this.showToast('❌ فشل تحديث حالة الأمان', 'error');
                }
            });
        });

        // حدث إظهار شاشة إنشاء كود مستخدم جديد
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                document.getElementById('user-assessment-key').value = key;
                document.getElementById('user-modal').classList.remove('hidden');
                document.getElementById('user-username').focus();
            });
        });

        // حدث حذف وإلغاء كود تفعيل الطبيب
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.getAttribute('data-user-id');
                if (confirm('هل أنت متأكد من إلغاء كود التفعيل النشط للطبيب؟')) {
                    try {
                        await this.supabase.delete('assessment_users', { id: userId });
                        this.showToast('🗑️ تم إلغاء وحذف كود الدخول المختار بنجاح', 'success');
                        await this.renderAssessmentSettings();
                    } catch (e) {
                        this.showToast('❌ فشل حذف الكود التفعيلي', 'error');
                    }
                }
            });
        });
    }

    /**
     * 3. سحب ومعالجة كافة سجلات الأطباء والمراكز من السحاب (Leads)
     */
    async loadLeadsData() {
        try {
            const data = await this.supabase.select('leads', {
                order: { column: 'created_at', direction: 'desc' }
            });
            this.allLeads = data || [];
            this.applyFilters();
        } catch (err) {
            console.error('[Manager] Leads load failed:', err);
        }
    }

    setupFilterEvents() {
        document.getElementById('btn-search')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('search-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.applyFilters());

        // ربط حدث فورم إنشاء كود الدخول المدفوع
        document.getElementById('user-form').onsubmit = async (e) => {
            e.preventDefault();
            const key = document.getElementById('user-assessment-key').value;
            const user = document.getElementById('user-username').value.trim();
            const pass = document.getElementById('user-password').value;
            const maxUses = parseInt(document.getElementById('user-max-uses').value) || 1;
            const days = parseInt(document.getElementById('user-expiry-days').value) || 30;

            try {
                // توليد الـ SHA-256 المتوافق مع بروتوكول الأمان
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
                this.showToast('✅ تم توليد كود التفعيل المدفوع بنجاح وإتاحته للطبيب', 'success');
                await this.renderAssessmentSettings();
            } catch (err) {
                this.showToast('❌ فشل إنشاء كود المستخدم المسؤول', 'error');
            }
        };

        document.getElementById('btn-close-user-modal').onclick = () => document.getElementById('user-modal').classList.add('hidden');
        document.getElementById('btn-cancel-user').onclick = () => document.getElementById('user-modal').classList.add('hidden');
        document.getElementById('btn-close-modal').onclick = () => document.getElementById('detail-modal').classList.add('hidden');
    }

    /**
     * تطبيق الفلاتر والفرز على جداول التقييمات الحية
     */
    applyFilters() {
        const query = document.getElementById('search-input').value.toLowerCase().trim();
        const type = document.getElementById('filter-type').value;
        const status = document.getElementById('filter-status').value;
        const sort = document.getElementById('filter-sort').value;

        this.filteredLeads = this.allLeads.filter(lead => {
            const matchesQuery = !query || 
                lead.full_name?.toLowerCase().includes(query) ||
                lead.clinic_name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.phone?.toLowerCase().includes(query);

            const matchesType = !type || lead.assessment_type_id === type;
            const matchesStatus = !status || (status === 'completed' ? lead.completed : !lead.completed);

            return matchesQuery && matchesType && matchesStatus;
        });

        // معالجة معايير الفرز والترتيب الحية للأطباء والمراكز الطبية الأردنية والعربية
        if (sort === 'newest') this.filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (sort === 'oldest') this.filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sort === 'score-high') this.filteredLeads.sort((a, b) => (parseFloat(b.score_percentage) || 0) - (parseFloat(a.score_percentage) || 0));
        else if (sort === 'score-low') this.filteredLeads.sort((a, b) => (parseFloat(a.score_percentage) || 0) - (parseFloat(b.score_percentage) || 0));
        else if (sort === 'name') this.filteredLeads.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        this.currentPage = 1;
        document.getElementById('results-count').textContent = `${this.filteredLeads.length} نتيجة`;
        this.renderLeadsTable();
    }

    /**
     * 4. حقن وبناء صفوف جدول التقييمات الرئيسي مع الحفاظ المطلق على الـ CSS والبنية الأصلية
     */
    renderLeadsTable() {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        const pageLeads = this.filteredLeads.slice(startIdx, endIdx);

        if (pageLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:#6b7280;">📭 لا توجد سجلات مطابقة لمعايير البحث الحالية.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let html = '';
        pageLeads.forEach(lead => {
            const dateStr = new Date(lead.created_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
            const scoreVal = lead.completed && lead.score_percentage !== null ? `${parseFloat(lead.score_percentage).toFixed(1)}%` : '---';
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
                    <td style="font-weight:800; color:#0f766e;">${scoreVal}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-details" data-id="${lead.id}">👁️ التفاصيل</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        this.renderPagination();
        this.attachTableButtonEvents();
    }

    renderPagination() {
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
                document.querySelector('.table-section')?.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    attachTableButtonEvents() {
        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', async () => {
                const leadId = btn.getAttribute('data-id');
                await this.showLeadConsultativeModal(leadId);
            });
        });
    }

    /**
     * 5. حقن ومعالجة التحويل النصي العربي وفرص التطوير داخل الـ Modal الأصلي لحمايته من التدمير
     */
    async showLeadConsultativeModal(leadId) {
        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        modal.classList.remove('hidden');
        modalBody.innerHTML = '<p style="text-align:center; padding:20px; font-weight:600; color:#4b5563;">⏳ جاري فحص ومعالجة السجل السلوكي للعيادة واستنباط التوصيات...</p>';

        try {
            const lead = this.allLeads.find(l => l.id === leadId);
            if (!lead) return;

            // جلب البيانات ومطابقتها ديناميكياً مع السحاب دون كود صلب
            const [scores, answers] = await Promise.all([
                this.supabase.select('scores', { filter: { lead_id: leadId } }),
                this.supabase.select('answers', { filter: { lead_id: leadId } })
            ]);

            let weakestAxis = { name: 'المحاور غير مكتملة', score: 101 };
            let strongestAxis = { name: 'المحاور غير مكتملة', score: -1 };

            let scoresHtml = '';
            if (scores && scores.length > 0) {
                scores.forEach(s => {
                    const pct = parseFloat(s.percentage) || 0;
                    const aName = s.axis_name_ar || s.axis_id;
                    if (pct < weakestAxis.score) weakestAxis = { name: aName, score: pct };
                    if (pct > strongestAxis.score) strongestAxis = { name: aName, score: pct };

                    scoresHtml += `
                        <div class="score-card">
                            <div class="score-name">${aName}</div>
                            <div class="score-value">${pct.toFixed(1)}%</div>
                        </div>
                    `;
                });
            }

            // فخاخ التناقض المكتشفة نصياً بالفصل السحابي النظيف للأسئلة
            let trapsHtml = '';
            const trapsTriggered = answers ? answers.filter(a => a.is_trap || a.option_value === 0 || a.answer_value === 0) : [];
            if (trapsTriggered.length > 0) {
                trapsTriggered.forEach((t, idx) => {
                    // عرض نص السؤال ونوع خيار الاستقبال بشكل نصي عربي
                    trapsHtml += `
                        <div class="answer-item" style="border-right-color:#f43f5e; background:#fff5f5; margin-bottom:8px; padding:12px; border-radius:6px;">
                            <div class="answer-question" style="color:#9f1239; font-weight:700;">🚨 ثغرة سلوكية تشغيلية (${idx + 1}):</div>
                            <div style="font-size:0.9rem; color:#4c0519; line-height:1.6; margin-top:4px;">
                                ${t.question_text || 'تراجع في معايير الأداء التشغيلي المعلن.'} <br>
                                <span style="font-weight:700; color:#be123c;">🔹 الخيار المستجيب المكتشف:</span> ${t.chosen_option_label || 'إرسال مباشر بدون حوار استكشافي.'}
                            </div>
                        </div>
                    `;
                });
            } else {
                trapsHtml = '<p style="color:#16a34a; font-weight:600; font-size:0.9rem;">✅ لم يتم رصد أي فخاخ تناقض أو ثغرات تسريب حادة في هذا التقييم البنائي.</p>';
            }

            // احتساب مؤشرات الأداء الاستشارية القياسية ديناميكياً
            const getScore = (id) => parseFloat(scores?.find(s => s.axis_id === id)?.percentage || 50);
            const tfi = Math.round((getScore('A1') + getScore('A2')) / 2);
            const tap = Math.round((getScore('A3') + getScore('A4')) / 2);
            const prp = Math.round(getScore('A5'));

            // حقن كائن البيانات النصي المتكامل باللغة العربية داخل الهيكل التصميمي الأصلي للـ Modal
            modalBody.innerHTML = `
                <div class="detail-section">
                    <h4>📊 التشخيص النصي لمستوى نمو العيادة الطبية</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><div class="detail-label">صاحب المركز / الطبيب</div><div class="detail-value">${lead.full_name}</div></div>
                        <div class="detail-item"><div class="detail-label">اسم المنشأة الطبية</div><div class="detail-value">${lead.clinic_name || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">معدل الكفاءة الكلي</div><div class="detail-value" style="color:#0f766e; font-size:1.2rem;">${lead.score_percentage ? parseFloat(lead.score_percentage).toFixed(1) + '%' : '---'}</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>📈 لوحة مؤشرات الأداء الحيوية (KPIs Dashboard)</h4>
                    <div class="scores-grid">
                        <div class="score-card"><div class="score-name">بناء الثقة (TFI)</div><div class="score-value">${tfi}%</div></div>
                        <div class="score-card"><div class="score-name">قبول العلاج (TAP)</div><div class="score-value">${tap}%</div></div>
                        <div class="score-card"><div class="score-name">الاستبقاء والولاء (PRP)</div><div class="score-value">${prp}%</div></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🎯 تحليل محاور الأداء الاستراتيجي</h4>
                    <div class="scores-grid">
                        ${scoresHtml || '<p style="color:#6b7280;">لا توجد درجات محاور مسجلة.</p>'}
                    </div>
                </div>

                <div class="detail-section">
                    <h4>💡 التوجيه الاستشاري وفرص الاستدامة المالية للعيادة</h4>
                    <div style="background:#f0fdfa; border-right:4px solid #0f766e; padding:14px; border-radius:6px; margin-bottom:10px;">
                        <span style="font-weight:700; color:#115e59; display:block; margin-bottom:4px;">🎯 الأولوية التشغيلية القصوى للتدخل السريع:</span>
                        <p style="font-size:0.9rem; color:#134e4a; line-height:1.6;">
                            يمثل معيار <strong>"${weakestAxis.name}"</strong> الفجوة الهيكلية الأكبر ومصدر التسريب الحقيقي للمرضى في رحلتهم الحالية بنسبة أداء حرج بلغت (${weakestAxis.score.toFixed(1)}%). يتطلب هذا التدخل الفوري لسد منافذ الفاقد المالي (Leakage).
                        </p>
                    </div>
                    <div style="background:#f8fafc; border-right:4px solid #4b5563; padding:14px; border-radius:6px;">
                        <span style="font-weight:700; color:#1f2937; display:block; margin-bottom:4px;">💪 نقطة القوة المرتكز عليها في المنشأة:</span>
                        <p style="font-size:0.9rem; color:#4b5563; line-height:1.6;">
                            تتمتع العيادة بنضج تشغيلي متميز وكفاءة مستقرة في محور <strong>"${strongestAxis.name}"</strong> بمعدل نجاح بلغ (${strongestAxis.score.toFixed(1)}%). يُنصح بالارتكاز على هذه القوة التنافسية لتعزيز الـ Patient Journey.
                        </p>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                    <div class="answers-list">
                        ${trapsHtml}
                    </div>
                </div>
            `;

        } catch (err) {
            modalBody.innerHTML = `<p style="color:red; padding:10px;">فشل معالجة التقرير الاستشاري المكتوب: ${err.message}</p>`;
        }
    }

    /**
     * دوال مساعدة لترجمة البيانات
     */
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

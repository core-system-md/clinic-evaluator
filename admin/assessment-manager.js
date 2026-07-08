/**
 * CORE System — Assessment Manager v4.0 (Unified Operations & Control Dashboard)
 * =======================================================================
 * الالتزام الصارم بالعقد الهندسي:
 * 1. تجميد الهوية البصرية وعدم تعديل أي مظهر خارجي أو خطوط أو ألوان نهائياً.
 * 2. الحفاظ الكامل على دالة renderAssessmentsTable() الأصلية لإدارة التقييمات وحالاتها.
 * 3. تشغيل وإدارة جدول سجلات الأطباء (Leads) وفلاتر البحث والإحصائيات الأربع العلوية.
 * 4. حقن التقرير التشخيصي الاستشاري والفخاخ السلوكية نصياً بالعربية داخل الـ Modal الأصلي.
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
        // رسالة التأكيد الأصلية والمعتمدة للعمل داخل الصفحة مباشرة دون تجميد صامت
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px; font-weight:600; color:#0369a1;">النظام يعمل... جاري جلب التقييمات ومزامنة سجلات الأداء التشغيلي</p>';
        }
        
        // 1. تشغيل جلب وإدارة التقييمات الأصلية دون مساس بهيكلها
        await this.renderAssessmentsTable();
        
        // 2. مزامنة البيانات السحابية الحية لسجلات الأطباء والمراكز
        await this.loadDashboardData();
        
        // 3. تفعيل أحداث فلاتر البحث والفرز والتحميل
        this.setupDashboardEvents();
    }

    /**
     * الدالة الدستورية الأصلية كما هي لإدارة حالات التقييمات في صندوق (🔐 إدارة التقييمات)
     */
    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<p style="color:red; padding:10px;">خطأ: Supabase غير متصل</p>';
                return;
            }

            const data = await this.supabase.select('assessment_types');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p style="padding:10px;">لا توجد تقييمات حالياً في قاعدة البيانات السحابية.</p>';
                return;
            }

            let html = `
                <table style="width:100%; border-collapse:collapse; margin-top:10px; background:white;">
                    <thead>
                        <tr style="background:#f3f4f6;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:right;">العنوان</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:right;">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(ast => {
                html += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;">${ast.title_ar || 'بدون عنوان'}</td>
                        <td style="padding:10px;">${ast.status}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<p style="color:red; padding:10px;">فشل تحميل البيانات: ${err.message}</p>`;
        }
    }

    /**
     * تحميل سجلات الأطباء وحساب مؤشرات الأداء والإحصائيات العلوية الـ 4
     */
    async loadDashboardData() {
        try {
            if (!this.supabase) return;

            // جلب سجلات الـ leads مرتبة تنازلياً حسب الأحدث
            const leads = await this.supabase.select('leads', {
                order: { column: 'created_at', direction: 'desc' }
            });

            this.allLeads = leads || [];
            
            // حساب الإحصائيات الأربع (Stats Grid) وحقنها في الـ HTML الأصلي للموقع
            const totalLeads = this.allLeads.length;
            const completedLeads = this.allLeads.filter(l => l.completed);
            const completedCount = completedLeads.length;

            let avgScore = 0;
            if (completedCount > 0) {
                const totalScoreSum = completedLeads.reduce((sum, curr) => sum + (parseFloat(curr.score_percentage) || 0), 0);
                avgScore = Math.round(totalScoreSum / completedCount);
            }

            const uniqueClinics = new Set(this.allLeads.map(l => l.clinic_name).filter(Boolean));

            // ربط الحقول الأصلية لـ HTML لوحة الإدارة
            document.getElementById('stat-leads').textContent = totalLeads;
            document.getElementById('stat-completed').textContent = completedCount;
            document.getElementById('stat-avg').textContent = `${avgScore}%`;
            document.getElementById('stat-clinics').textContent = uniqueClinics.size;

            // تحديث وقت المزامنة الأخير
            const now = new Date();
            document.getElementById('last-updated').textContent = now.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

            this.applyFiltersAndRender();
        } catch (err) {
            console.error('[CORE System] Error loading dashboard analytical data:', err);
        }
    }

    /**
     * إعداد وتفعيل الفلاتر والبحث الحي والفرز للأطباء والمراكز الطبية الأردنية والعربية
     */
    setupDashboardEvents() {
        document.getElementById('btn-search')?.addEventListener('click', () => this.applyFiltersAndRender());
        document.getElementById('search-input')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.applyFiltersAndRender();
        });
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyFiltersAndRender());
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyFiltersAndRender());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.applyFiltersAndRender());

        // تفعيل أزرار التحديث والخروج من الهيدر الأصلي
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadDashboardData());
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            if (confirm('هل تود تسجيل الخروج من لوحة الإدارة الآمنة للمنظومة؟')) {
                location.reload();
            }
        });

        // زر إغلاق الـ Modal المعتمد لديك
        document.getElementById('btn-close-modal').onclick = () => {
            document.getElementById('detail-modal').classList.add('hidden');
        };
    }

    /**
     * تصفية وفرز السجلات ديناميكياً
     */
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

        // فرز السجلات
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
     * بناء وحقن صفوف جدول سجلات التقييمات الرئيسي المعتمد بـ HTML العميل
     */
    renderLeadsTable() {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;

        const startIdx = (this.currentPage - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        const pageLeads = this.filteredLeads.slice(startIdx, endIdx);

        if (pageLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:#6b7280; font-weight:600;">📭 لا توجد سجلات تقييم مطابقة للخيارات المدخلة.</td></tr>';
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
                document.querySelector('.table-section')?.scrollIntoView({ behavior: 'smooth' });
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
     * معالجة واستنباط التقرير التشخيصي الاستشاري المكتوب بالعربية وحقنه داخل النافذة المنبثقة الأصلية (detail-modal)
     */
    async showLeadConsultativeReport(leadId) {
        const modal = document.getElementById('detail-modal');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;

        modal.classList.remove('hidden');
        modalBody.innerHTML = '<p style="text-align:center; padding:24px; font-weight:600; color:#4b5563;">⏳ جاري قراءة سجل البيانات وتطهير الفخاخ السلوكية لاستخراج التوصيات النصية...</p>';

        try {
            const lead = this.allLeads.find(l => l.id === leadId);
            if (!lead) return;

            // استدعاء متزامن وآمن من السحاب لجدول الـ scores والـ answers المرتبطة بالطبيب
            const [scores, answers] = await Promise.all([
                this.supabase.select('scores', { filter: { lead_id: leadId } }),
                this.supabase.select('answers', { filter: { lead_id: leadId } })
            ]);

            // بناء بطاقات المحاور التشغيلية التفصيلية
            let scoresHtml = '';
            let weakestAxis = { name: 'غير محدد', score: 101 };
            let strongestAxis = { name: 'غير محدد', score: -1 };

            if (scores && scores.length > 0) {
                scores.forEach(s => {
                    const currentScore = parseFloat(s.percentage) || 0;
                    const axisName = s.axis_name_ar || s.axis_id;
                    
                    if (currentScore < weakestAxis.score) { weakestAxis = { name: axisName, score: currentScore }; }
                    if (currentScore > strongestAxis.score) { strongestAxis = { name: axisName, score: currentScore }; }

                    scoresHtml += `
                        <div class="score-card" style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; text-align:center;">
                            <div class="score-name" style="font-size:0.85rem; color:#6b7280; font-weight:600; margin-bottom:4px;">${axisName}</div>
                            <div class="score-value" style="font-size:1.3rem; font-weight:800; color:#0f766e;">${currentScore.toFixed(1)}%</div>
                        </div>
                    `;
                });
            }

            // فحص ومعالجة فخاخ التناقض السلوكي ومنافذ تسريب المرضى (Leakage) نصياً
            let trapsHtml = '';
            // تصفية الإجابات التي تم تفعيل الفخ السلوكي فيها أو قيمتها صفرية لتعكس الاختيار الاستشاري الحقيقي
            const triggeredTraps = answers ? answers.filter(a => a.is_trap || a.answer_value === 0 || a.option_value === 0) : [];
            
            if (triggeredTraps.length > 0) {
                triggeredTraps.forEach((trap, idx) => {
                    trapsHtml += `
                        <div class="answer-item" style="background:#fff5f5; border-right:4px solid #ef4444; border-radius:8px; padding:12px 16px; margin-bottom:10px;">
                            <div class="answer-question" style="font-weight:700; color:#991b1b; font-size:0.9rem;">🚨 ثغرة سلوكية / منفذ تسريب مكتشف رقم (${idx + 1}):</div>
                            <div style="font-size:0.85rem; color:#7f1d1d; line-height:1.6; margin-top:4px;">
                                <strong>نص السؤال الأصلي:</strong> ${trap.question_text || 'تراجع في جودة المعيار التشغيلي.'} <br>
                                <span style="color:#b91c1c; font-weight:700;">📌 الاختيار التشغيلي المطبق للعيادة:</span> ${trap.chosen_option_label || 'إرسال مباشر بدون حوار استكشافي.'}
                            </div>
                        </div>
                    `;
                });
            } else {
                trapsHtml = `
                    <div style="background:#f0fdf4; border-right:4px solid #22c55e; border-radius:8px; padding:12px 16px; color:#166534; font-weight:600; font-size:0.85rem;">
                        ✅ أداء فريق الاستقبال والعيادة متوازن ومطابق للمعلن، ولم يتم رصد أي فجوات تناقض سلوكي حادة في هذا التقييم.
                    </div>
                `;
            }

            // احتساب مؤشرات الأداء الاستشارية الأساسية (KPIs Dashboard) ديناميكياً لتطابق عقد المحرك الحسابي
            const getAxisScore = (id) => {
                const found = scores?.find(s => s.axis_id === id);
                return found ? parseFloat(found.percentage) : 50;
            };
            const tfi = Math.round((getAxisScore('A1') + getAxisScore('A2')) / 2);
            const tap = Math.round((getAxisScore('A3') + getAxisScore('A4')) / 2);
            const prp = Math.round(getAxisScore('A5'));

            // حقن وهندسة كائنات التقارير النصية داخل البنية الأصلية للـ Modal المعتمد بـ HTML
            modalBody.innerHTML = `
                <div class="detail-section" style="margin-bottom:20px;">
                    <h4>📋 البيانات التعريفية للمنشأة الطبية</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><div class="detail-label">الطبيب / صاحب التقييم</div><div class="detail-value">${lead.full_name}</div></div>
                        <div class="detail-item"><div class="detail-label">العيادة / المركز الطبي</div><div class="detail-value">${lead.clinic_name || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">رقم الهاتف والتواصل</div><div class="detail-value" style="direction:ltr; text-align:right;">${lead.phone || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">البريد الإلكتروني التجاري</div><div class="detail-value">${lead.email || '---'}</div></div>
                        <div class="detail-item"><div class="detail-label">التخصص السريري والبلد</div><div class="detail-value">${this.translateSpecialty(lead.specialty)} • ${lead.country === 'JO' ? 'الأردن 🇯🇴' : lead.country === 'SA' ? 'السعودية 🇸🇦' : lead.country || '🌍 أخرى'}</div></div>
                        <div class="detail-item"><div class="detail-label">معدل الكفاءة التشغيلية الكلي</div><div class="detail-value" style="color:#0f766e; font-size:1.15rem; font-weight:800;">${lead.score_percentage ? parseFloat(lead.score_percentage).toFixed(1) + '%' : '---'}</div></div>
                    </div>
                </div>

                <div class="detail-section" style="margin-bottom:20px;">
                    <h4>📊 لوحة مؤشرات الأداء الحيوية (KPIs Dashboard)</h4>
                    <div class="scores-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                        <div class="score-card"><div class="score-name">بناء الثقة (Trust Formation Index - TFI)</div><div class="score-value">${tfi}%</div></div>
                        <div class="score-card"><div class="score-name">قبول العلاج (Treatment Acceptance Potential - TAP)</div><div class="score-value">${tap}%</div></div>
                        <div class="score-card"><div class="score-name">الاستبقاء والولاء (Patient Retention Potential - PRP)</div><div class="score-value">${prp}%</div></div>
                    </div>
                </div>

                <div class="detail-section" style="margin-bottom:20px;">
                    <h4>🎯 كفاءة محاور الأداء الاستراتيجي للعيادة</h4>
                    <div class="scores-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
                        ${scoresHtml || '<p style="grid-column: 1/-1; text-align:center; color:#6b7280;">لا توجد درجات تفصيلية مسجلة للمحاور.</p>'}
                    </div>
                </div>

                <div class="detail-section" style="margin-bottom:20px;">
                    <h4>💡 التوجيهات الاستشارية وفرص التطوير الهيكلي ("شيفرة العيادة")</h4>
                    <div class="insight-box" style="background:#f0fdfa; border-right:4px solid #0f766e; border-radius:8px; padding:14px; margin-bottom:10px;">
                        <h5 style="color:#134e4a; font-size:0.9rem; font-weight:700; margin-bottom:4px;">🎯 الأولوية التشغيلية القصوى للتدخل المباشر:</h5>
                        <p style="font-size:0.85rem; color:#374151; line-height:1.7; margin:0;">
                            يمثل محور <strong>"${weakestAxis.name}"</strong> الفجوة التشغيلية الأكبر والمنفذ الرئيسي المسبب لـ الفاقد المالي وتسريب المرضى في رحلتهم التشغيلية الحالية بنسبة أداء حرجة بلغت (${weakestAxis.score.toFixed(1)}%). يتطلب هذا المعيار إعادة صياغة بروتوكول العقد المسبق وأنظمة المتابعة الفورية لاستعادة الـ Patient Journey.
                        </p>
                    </div>
                    <div class="insight-box" style="background:#f8fafc; border-right:4px solid #4b5563; border-radius:8px; padding:14px; margin-bottom:0;">
                        <h5 style="color:#1f2937; font-size:0.9rem; font-weight:700; margin-bottom:4px;">💪 نقطة القوة المرتكز عليها للمنشأة:</h5>
                        <p style="font-size:0.85rem; color:#4b5563; line-height:1.7; margin:0;">
                            تتمتع العيادة أو المركز الطبي بنضج تشغيلي متميز ومعيار كفاءة مستقر في محور <strong>"${strongestAxis.name}"</strong> بمعدل نجاح واستدامة بلغ (${strongestAxis.score.toFixed(1)}%). يُنصح بالارتكاز على هذه القوة التنافسية لرفع الأداء المالي والتشغيلي لباقي أفراد الكادر الطبي وموظفي الاستقبال.
                        </p>
                    </div>
                </div>

                <div class="detail-section" style="margin-bottom:0;">
                    <h4>🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                    <div class="answers-list" style="display:flex; flex-direction:column; gap:8px;">
                        ${trapsHtml}
                    </div>
                </div>
            `;

        } catch (err) {
            modalBody.innerHTML = `<p style="color:red; padding:12px; text-align:center; font-weight:700;">❌ فشل تحليل واستنباط تقرير القراءة الاستشارية: ${err.message}</p>`;
        }
    }

    /**
     * دوال الترجمة المساعدة للرموز والمصطلحات التشغيلية
     */
    translateSpecialty(s) {
        const map = { cosmetic: 'تجميل وليزر', dental: 'أسنان', general: 'عام وعائلي', derma: 'جلدية', ortho: 'عظام وعلاج طبيعي', eye: 'عيون' };
        return map[s] || s || '---';
    }

    translateStaffSize(t) {
        const map = { '1': '1 – 3 أفراد', '2': '4 – 8 أفراد', '3': '9 – 15 فرداً', '4': 'أكثر من 15 فرداً' };
        return map[t] || t || '---';
    }
}

// سطر الأمان لضمان رؤية الملف من خلال متصفحات الهاتف ومنع التجميد الصامت
window.AssessmentManager = AssessmentManager;

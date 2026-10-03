/**
 * CORE System — Assessment Manager v7.0 (Strict Analytical Update)
 * =======================================================================
 * الالتزام المطلق بحدود العمل:
 * 1. تجميد كافة الدوال الإدارية، وعمليات الـ RPC، والتشفير، وصناديق التحكم الأصلية.
 * 2. معالجة دالة generateConsultativeReportInsideModal لتقرأ الحقول الحقيقية (answer_value, trap_triggered).
 * 3. إظهار اسم التقييم المستخدم ديناميكياً داخل بطاقة البيانات التعريفية.
 * =======================================================================
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.supabase = dashboard ? dashboard.supabase : window.supabaseClient;
        
        // مخازن برمجية مخصصة للتحكم في جدول تقييمات المستخدمين والفلاتر دون تداخل
        this.allLeads = [];
        this.filteredLeads = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.assessmentTypesMap = {}; // مخزن ديناميكي لربط المعرفات بأسماء التقييمات
        this.familyByVersionId = {};
        this.familyBySlug = {};
        this.editingAssessmentSlug = null;
    }

    async init() {
        // تحميل كل التقييمات للوصول إلى axis_roles و kpi_mappings
        try {
            this.allAssessments = await this.supabase.select('assessment_types') || [];
            const families = await this.supabase.select('assessment_families') || [];
            this.familyByVersionId = {};
            this.familyBySlug = {};
            families.forEach(f => { this.familyBySlug[f.slug] = f; });
            this.allAssessments.forEach(a => { const family = families.find(f => f.id === a.family_id); if (family) this.familyByVersionId[a.id] = family; });
        } catch (e) {
            this.allAssessments = [];
        }

        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px; text-align:center;">النظام يعمل... جاري جلب التقييمات وتجهيز أدوات التحكم...</p>';
        }
        
        // تشغيل الجزء الأول: إدارة وهيكلة التقييمات الأصلية دون مساس
        await this.renderAssessmentsTable();
        this.populateFilterDropdown();

        // تشغيل الجزء الثاني: مزامنة لوحة التحكم وجدول التقييمات التي نفذها المستخدمون
        await this.loadUserSubmissionsDashboard();
        this.setupDashboardFilterEvents();
    }

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    rpcScalar(result) {
        if (result === null || result === undefined) return null;
        if (typeof result === 'string') return result;
        if (typeof result === 'object') {
            if (typeof result.data === 'string') return result.data;
            if (typeof result.id === 'string') return result.id;
        }
        return null;
    }

    async invokeAdminManagement(payload) {
        const token = window.AdminSession?.session?.access_token;
        if (!token) throw new Error('جلسة الإدارة غير صالحة.');
        const baseUrl = this.supabase?.url || 'https://oaqpzaarppccbnepffxx.supabase.co';
        const anonKey = this.supabase?.anonKey || this.supabase?.key;
        const response = await fetch(baseUrl + '/functions/v1/admin-management', {
            method: 'POST',
            headers: {
                apikey: anonKey,
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            cache: 'no-store',
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
            throw new Error(data?.message || ('فشل اتصال إدارة المساعدين: ' + response.status));
        }
        return data;
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return alert(message);
        toast.innerText = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
    }

    // خوارزمية التشفير القياسية SHA-256 المتوافقة تماماً مع نظام مطابقة نفاذ المرضى والعيادات
    async simpleHash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<p style="color:red; padding:10px;">خطأ: Supabase غير متصل</p>';
                return;
            }

            // جلب حزم البيانات المتزامنة للتقييمات وإعدادات بوابات النفاذ ماليًا
            const data = await this.supabase.select('assessment_types');
            const families = await this.supabase.select('assessment_families') || [];
            families.forEach(f => { this.familyBySlug[f.slug] = f; });
            (data || []).forEach(ast => { const family = families.find(f => f.id === ast.family_id); if (family) this.familyByVersionId[ast.id] = family; });
            const authSettings = await this.supabase.select('assessment_settings') || [];

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div style="padding:20px; text-align:center; color:#6b7280;">
                        <p>لا توجد تقييمات حالياً في قاعدة البيانات.</p>
                        <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="margin-top:10px; padding:8px 16px;">إضافة تقييم جديد +</button>
                    </div>`;
                return;
            }

            // بناء خارطة الأسماء محلياً لحل مشكلة غياب اسم التقييم في لوحة العرض
            data.forEach(ast => {
                this.assessmentTypesMap[ast.id] = ast.title_ar || ast.title_en || ast.slug;
            });

            this.populateFilterDropdown();

            // تطبيق الـ Soft Delete برمجياً لعرض السجلات النشطة فقط ومنع الفوضى البصرية
            const activeAssessments = data.filter(ast => ast.is_active !== false);

            if (activeAssessments.length === 0) {
                container.innerHTML = `
                    <div style="padding:20px; text-align:center; color:#6b7280;">
                        <p>جميع التقييمات مشطوبة أو مؤرشفة حالياً.</p>
                        <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="margin-top:10px; padding:8px 16px;">إضافة تقييم جديد +</button>
                    </div>`;
                return;
            }

            activeAssessments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="color:#134e4a; font-weight:700;">التقييمات المتاحة في النظام</h4>
                    <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="padding:6px 12px; font-size:0.85rem;">+ تقييم جديد</button>
                    <button onclick="window.assessmentManager.importAssessment()" class="btn-primary" style="padding:6px 12px; font-size:0.85rem; background:#6366f1;">📥 استيراد</button>
                </div>
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table style="width:100%; border-collapse:collapse; background:white; font-size:0.85rem; text-align:right;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                <th style="padding:12px 10px; color:#475569;">عنوان التقييم</th>
                                <th style="padding:12px 10px; color:#475569;">الحالة</th>
                                <th style="padding:12px 10px; color:#475569;">نمط النفاذ</th>
                                <th style="padding:12px 10px; color:#475569; text-align:center;">إجراءات التحكم</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            activeAssessments.forEach(ast => {
                let badgeClass = 'badge-warning';
                let statusText = 'مسودة';
                
                const currentStatusClean = (ast.status || '').toLowerCase();
                if (currentStatusClean === 'published') { badgeClass = 'badge-success'; statusText = 'منشور'; }
                if (currentStatusClean === 'archived') { badgeClass = 'btn-secondary'; statusText = 'مؤرشف'; }

                // تتبع ومطابقة قفل بوابات الدفع والنفاذ المالي للتقييم
                const family = this.familyByVersionId[ast.id];
                const publicSlug = family?.slug || ast.slug;
                const lockedSetting = authSettings.find(s => s.assessment_key === publicSlug);
                const isLocked = lockedSetting ? !!lockedSetting.auth_enabled : false;

                html += `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:12px 10px; font-weight:600; color:#1e293b;">
                            ${ast.title_ar || 'بدون عنوان'}
                            <div style="font-size:0.75rem; color:#94a3b8; font-weight:400; margin-top:2px;">
                                المحاور: ${ast.axis_count || 0} | الأسئلة: ${ast.question_count || 0}
                            </div>
                        </td>
                        <td style="padding:12px 10px;">
                            <span class="badge ${badgeClass}">${statusText}</span>
                        </td>
                        <td style="padding:12px 10px;">
                            <span class="badge" style="background:${isLocked ? '#fee2e2' : '#dcfce7'}; color:${isLocked ? '#991b1b' : '#166534'}; border:1px solid ${isLocked ? '#fca5a5' : '#86efac'};">
                                ${isLocked ? '🔒 مدفوع محمي' : '🔓 مجاني عام'}
                            </span>
                        </td>
                        <td style="padding:12px 10px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                                <button onclick="window.assessmentManager.editAssessment('${ast.id}')" class="btn-details" style="padding:4px 6px; font-size:0.75rem;">⚙️ هيكلة</button>
                                <button onclick="window.assessmentManager.duplicateAssessment('${ast.id}')" class="btn-details" style="padding:4px 6px; font-size:0.75rem; background:#6366f1;">📋 إصدار جديد</button>
                                ${currentStatusClean === 'draft' ? `<button onclick="window.assessmentManager.publishAssessment('${ast.id}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#dcfce7; color:#166534;">🚀 نشر</button>` : ''}
                                ${currentStatusClean === 'published'
                                    ? (family?.id ? `<button onclick="window.assessmentManager.archiveAssessment('${ast.id}', 'published')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#fff7ed; color:#9a3412;">⏹ إيقاف الظهور</button>` : '')
                                    : currentStatusClean === 'draft'
                                        ? `<button onclick="window.assessmentManager.archiveAssessment('${ast.id}', 'draft')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#e2e8f0; color:#334155;">📦 أرشفة</button>`
                                        : `<button onclick="window.assessmentManager.restorePublicAssessment('${ast.id}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#dcfce7; color:#166534;">↩️ استعادة للعرض</button>`}
                                <button onclick="window.assessmentManager.toggleAuthLock('${publicSlug}', ${isLocked})" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#fffbeb; color:#b45309; border:1px solid #fef3c7;">
                                    ${isLocked ? '🔓 فتح مجاني' : '🔒 قفل مدفوع'}
                                </button>
                                ${isLocked ? `<button onclick="window.assessmentManager.openUserModal('${ast.slug}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#0f766e; color:white;">🔑 كود</button>` : ''}
                                ${currentStatusClean !== 'published' ? `<button onclick="window.assessmentManager.deleteAssessment('${ast.id}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#fef2f2; color:#dc2626; border:1px solid #fee2e2;">🗑️ شطب</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<p style="color:red; padding:10px;">فشل تحميل مخرجات قاعدة البيانات: ${err.message}</p>`;
        }
    }

    // استدعاء دالة الـ RPC السحابية الآمنة لتبديل نمط النفاذ (مجاني / مدفوع)
    async toggleAuthLock(slug, isLocked) {
        try {
            await this.supabase.request('rpc/toggle_assessment_auth_secure', {
                method: 'POST',
                body: JSON.stringify({ p_slug: slug, p_enabled: !isLocked })
            });
            this.showToast("تم تحديث نمط النفاذ المالي ومستوى الأمان سحابياً.");
            await this.renderAssessmentsTable();
        this.populateFilterDropdown();
        } catch (err) {
            this.showToast("تعذر تعديل نمط النفاذ: " + err.message, true);
        }
    }

    openUserModal(slug) {
        const modal = document.getElementById('user-modal');
        const form = document.getElementById('user-form');
        const keyInput = document.getElementById('user-assessment-key');
        
        if (form) form.reset();
        if (keyInput) keyInput.value = (this.familyBySlug[slug]?.slug || slug);
        if (modal) modal.classList.remove('hidden');
    }

    // توليد أكواد ورموز النفاذ المشفرة بـ SHA-256 وحقنها سحابياً عبر الـ RPC الآمن للعيادات المدفوعة
    async generateAccessCode() {
        const slug = document.getElementById('user-assessment-key').value;
        const username = document.getElementById('user-username').value.trim();
        const password = document.getElementById('user-password').value;
        const maxUses = parseInt(document.getElementById('user-max-uses').value, 10) || 1;
        const expiryDays = parseInt(document.getElementById('user-expiry-days').value, 10) || 30;

        try {
            const hashedPassword = await this.simpleHash(password);
            
            await this.supabase.request('rpc/generate_assessment_user_secure', {
                method: 'POST',
                body: JSON.stringify({
                    p_slug: slug,
                    p_username: username,
                    p_password_hash: hashedPassword,
                    p_max_uses: maxUses,
                    p_expiry_days: expiryDays
                })
            });

            this.showToast(`تم بنجاح توليد كود النفاذ المالي للعيادة: ${username}`);
            const modal = document.getElementById('user-modal');
            if (modal) modal.classList.add('hidden');
        } catch (err) {
            this.showToast("فشل تفعيل وحقن كود النفاذ: " + err.message, true);
        }
    }

    // استدعاء دالة الـ RPC لحفظ وتحديث البيانات الأساسية للتقييمات
    async saveAssessment() {
        const id = document.getElementById('ast-id').value || null;
        const titleEn = document.getElementById('ast-title-en').value;
        const generatedSlug = this.editingAssessmentSlug || (titleEn ? titleEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'assessment-' + Date.now());
        
        const rawStatusValue = document.getElementById('ast-status').value;
        const databaseStatus = rawStatusValue ? rawStatusValue.toLowerCase() : 'draft';

        const payload = {
            p_id: id,
            p_title_ar: document.getElementById('ast-title-ar').value,
            p_title_en: titleEn,
            p_slug: generatedSlug,
            p_description: document.getElementById('ast-description').value,
            p_status: databaseStatus, 
            p_has_traps: document.getElementById('ast-has-traps').checked,
            p_has_ev_simulator: document.getElementById('ast-has-simulator').checked
        };

        try {
            await this.supabase.request('rpc/save_assessment_secure', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            this.showToast("تمت معالجة وحفظ البيانات الهيكلية سحابياً بأمان.");
            document.getElementById('assessment-modal').classList.add('hidden');
            await this.renderAssessmentsTable();
        this.populateFilterDropdown();
        } catch (err) {
            this.showToast("فشل حفظ التعديلات: " + err.message, true);
        }
    }

    // استدعاء دالة الـ RPC للتبديل السريع للحالات (مسودة / مؤرشف)
    async archiveAssessment(id, currentStatus) {
        const currentClean = (currentStatus || '').toLowerCase();
        try {
            if (currentClean === 'published') {
                const family = this.familyByVersionId[id];
                if (!family?.id) throw new Error('تعذر تحديد عائلة التقييم المنشور.');
                if (!confirm('سيتم إيقاف ظهور هذا التقييم للعامة مع إبقاء بياناته ونتائجه التاريخية داخل الإدارة. متابعة؟')) return;
                await this.supabase.request('rpc/stop_public_assessment_secure', {
                    method: 'POST',
                    body: JSON.stringify({ p_family_id: family.id })
                });
                this.showToast('تم إيقاف الظهور العام مع حفظ التاريخ.');
            } else if (currentClean === 'draft') {
                await this.supabase.request('rpc/update_assessment_status_secure', {
                    method: 'POST',
                    body: JSON.stringify({ p_id: id, p_status: 'archived', p_is_active: true })
                });
                this.showToast('تمت أرشفة نسخة العمل.');
            } else {
                this.showToast('النسخة المؤرشفة غير قابلة للتعديل.', true);
                return;
            }
            await this.renderAssessmentsTable();
            this.populateFilterDropdown();
        } catch (err) {
            this.showToast("فشل تغيير الحالة: " + err.message, true);
        }
    }

    async restorePublicAssessment(id) {
        if (!confirm('إعادة هذه النسخة السابقة للظهور العام؟')) return;
        try {
            await this.supabase.request('rpc/restore_public_assessment_secure', {
                method: 'POST',
                body: JSON.stringify({ p_version_id: id })
            });
            this.showToast('تمت استعادة التقييم للظهور العام.');
            await this.renderAssessmentsTable();
            this.populateFilterDropdown();
        } catch (err) {
            this.showToast('فشل استعادة الظهور العام: ' + err.message, true);
        }
    }

    // استدعاء دالة الـ RPC لشطب التقييم (Soft Delete) وإخفائه منعاً للفوضى
    async deleteAssessment(id) {
        if (!confirm("هل أنت متأكد من شطب هذا التقييم نهائياً وإخفائه من لوحة التحكم؟")) return;
        try {
            await this.supabase.request('rpc/update_assessment_status_secure', {
                method: 'POST',
                body: JSON.stringify({ p_id: id, p_status: 'draft', p_is_active: false })
            });
            this.showToast("تم شطب وإخفاء سجل التقييم بنجاح حماية للمنظومة.");
            await this.renderAssessmentsTable();
        this.populateFilterDropdown();
        } catch (err) {
            this.showToast("فشل شطب التقييم: " + err.message, true);
        }
    }

    // استدعاء دالة الـ RPC لتنفيذ محرك النسخ المتطابق الشامل والعميق (Deep Relational Duplication)
    async duplicateAssessment(id) {
        if (!confirm("إنشاء إصدار جديد كمسودة من هذا التقييم؟ سيبقى الإصدار المنشور الحالي ثابتاً حتى يتم النشر.")) return;
        try {
            const result = await this.supabase.request('rpc/create_assessment_version_secure', {
                method: 'POST',
                body: JSON.stringify({ p_source_version_id: id })
            });
            const newId = this.rpcScalar(result);
            this.showToast("تم إنشاء إصدار جديد كمسودة.");
            await this.renderAssessmentsTable();
            this.populateFilterDropdown();
            if (newId) await this.editAssessment(newId);
        } catch (err) {
            this.showToast("فشل إنشاء الإصدار الجديد: " + err.message, true);
        }
    }

    async publishAssessment(id) {
        if (!confirm("نشر هذه المسودة سيجعلها الإصدار الحالي، وسيتم أرشفة الإصدار المنشور السابق. متابعة؟")) return;
        try {
            await this.supabase.request('rpc/publish_assessment_version_secure', {
                method: 'POST',
                body: JSON.stringify({ p_version_id: id })
            });
            this.showToast("تم نشر الإصدار الجديد وتثبيت الرابط العام.");
            await this.renderAssessmentsTable();
            this.populateFilterDropdown();
        } catch (err) {
            this.showToast("فشل نشر الإصدار: " + err.message, true);
        }
    }


    createNewAssessment() {
        document.getElementById('assessment-form').reset();
        document.getElementById('ast-id').value = '';
        document.getElementById('assessment-modal-title').innerText = "إنشاء تقييم استشاري جديد";
        document.getElementById('modal-tab-content').innerHTML = '<p style="color:#0f766e; padding:15px; background:#f0fdf4; border-radius:8px; text-align:center; font-size:0.85rem; font-weight:600;">يرجى حفظ بيانات التقييم الأساسية أولاً لتتمكن من تخصيص هيكله السحابي علائقياً.</p>';
        document.getElementById('assessment-modal').classList.remove('hidden');
    }

    async editAssessment(id) {
        try {
            const allAssessments = await this.supabase.select('assessment_types');
            let ast = allAssessments.find(a => a.id === id);
            if (!ast) return this.showToast("التقييم المطلوب غير موجود.", true);

            if ((ast.status || '').toLowerCase() === 'published') {
                const result = await this.supabase.request('rpc/create_assessment_version_secure', {
                    method: 'POST',
                    body: JSON.stringify({ p_source_version_id: ast.id })
                });
                const draftId = this.rpcScalar(result);
                if (!draftId) return this.showToast("تعذر إنشاء مسودة جديدة من الإصدار المنشور.", true);
                ast = (await this.supabase.select('assessment_types') || []).find(a => a.id === draftId);
                if (!ast) return this.showToast("تم إنشاء المسودة ولكن تعذر تحميلها.", true);
            } else if ((ast.status || '').toLowerCase() === 'archived') {
                return this.showToast("الإصدار المؤرشف غير قابل للتعديل.", true);
            }

            this.editingAssessmentSlug = ast.slug || null;

            let mappedStatus = 'Draft';
            const rawStat = (ast.status || '').toLowerCase();
            if (rawStat === 'published') mappedStatus = 'Published';
            if (rawStat === 'archived') mappedStatus = 'Archived';

            document.getElementById('ast-id').value = ast.id;
            document.getElementById('ast-title-ar').value = ast.title_ar || '';
            document.getElementById('ast-title-en').value = ast.title_en || '';
            document.getElementById('ast-description').value = ast.description || '';
            document.getElementById('ast-status').value = mappedStatus;
            document.getElementById('ast-has-traps').checked = !!ast.has_traps;
            document.getElementById('ast-has-simulator').checked = !!ast.has_ev_simulator;

            const allAxes = await this.supabase.select('axes') || [];
            const allQuestions = await this.supabase.select('questions') || [];
            
            const currentAxes = allAxes.filter(x => x.assessment_type_id === ast.id);
            const currentQuestions = allQuestions.filter(q => q.assessment_type_id === ast.id);
            const allOptions = await this.supabase.select('options') || [];
            this.currentOptions = allOptions.filter(o => currentQuestions.some(q => q.id === o.question_id));

            this.renderModalTabs(currentAxes, currentQuestions, ast.id);

            document.getElementById('assessment-modal-title').innerText = "تعديل تقييم: " + (ast.title_ar || '');
            document.getElementById('assessment-modal').classList.remove('hidden');
        } catch (err) {
            this.showToast("خطأ أثناء تحميل تفاصيل الهيكل العلائقي: " + err.message, true);
        }
    }

    renderModalTabs(axes, questions, assessmentId) {
        const contentContainer = document.getElementById('modal-tab-content');
        if (!contentContainer) return;

        let html = '<div style="display:flex; flex-direction:column; gap:12px; text-align:right; dir:rtl;">';
        html += `
            <div style="text-align:left; margin-bottom:5px;">
                <button type="button" onclick="window.assessmentManager.addAxisInline('${assessmentId}')" class="btn-primary" style="padding:6px 12px; font-size:0.8rem;">+ إضافة محور جديد</button>
            </div>
        `;

        if (axes.length === 0) {
            html += '<p style="color:#6b7280; text-align:center; padding:20px; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1; font-size:0.85rem;">لا توجد محاور مرتبطة حالياً. اضغط أعلاه لإضافة محورك الأول.</p>';
        } else {
            axes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

            axes.forEach(axis => {
                const axisQuestions = questions.filter(q => q.axis_id === axis.id);
                axisQuestions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                html += `
                    <div style="background:#f8fafc; padding:12px; border-radius:8px; border-right:4px solid #0f766e; border-top:1px solid #e5e7eb; border-left:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; color:#134e4a; font-size:0.85rem; margin-bottom:8px; flex-wrap:wrap; gap:5px;">
                            <span>📌 محور: ${this.escapeHtml(axis.title_ar || axis.title || 'بدون اسم')} (${this.escapeHtml(axis.code || '')})</span>
                            <span style="font-size:0.75rem; color:#6b7280; margin-right:auto; margin-left:10px;">الوزن: %${axis.weight || 0}</span>
                            <button type="button" onclick="window.assessmentManager.addQuestionInline('${assessmentId}', '${axis.id}')" style="padding:2px 6px; font-size:0.7rem; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-family:'Cairo'; font-weight:600;">+ إضافة سؤال</button>
                        </div>
                        <div style="padding-right:8px; display:flex; flex-direction:column; gap:4px;">
                `;

                if (axisQuestions.length === 0) {
                    html += '<p style="font-size:0.75rem; color:#94a3b8; margin:0; padding:4px 0;">⚠️ لا توجد أسئلة تحت هذا المحور حالياً.</p>';
                } else {
                    axisQuestions.forEach(q => {
                        const qOptions = (this.currentOptions || []).filter(o => o.question_id === q.id);
                        qOptions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                        html += `
                            <div style="font-size:0.75rem; color:#334155; background:white; padding:6px 8px; border-radius:4px; border:1px solid #f1f5f9; margin-bottom:4px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <span style="font-weight:600;">❓ ${this.escapeHtml(q.question_text_ar || q.question_text)}</span>
                                    <span style="color:#0f766e; font-weight:600; font-size:0.7rem;">(${this.escapeHtml(q.code || '')})</span>
                                </div>
                                <div style="padding-right:12px; border-right:2px solid #e5e7eb; margin-right:4px;">
                                    <div style="font-size:0.7rem; color:#6b7280; margin-bottom:4px; font-weight:600;">خيارات الإجابة:</div>
                        `;

                        if (qOptions.length === 0) {
                            html += '<p style="font-size:0.7rem; color:#94a3b8; margin:0;">لا توجد خيارات لهذا السؤال.</p>';
                        } else {
                            qOptions.forEach((opt, idx) => {
                                html += `
                                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                                        <span style="font-size:0.7rem; color:#6b7280; min-width:20px;">${idx + 1}.</span>
                                        <input type="text" 
                                            value="${this.escapeHtml(opt.label_ar || opt.label || '')}" 
                                            onblur="window.assessmentManager.updateOption('${opt.id}', 'label_ar', this.value)"
                                            placeholder="نص الخيار بالعربية"
                                            style="flex:1; min-width:120px; padding:4px 6px; border:1px solid #e5e7eb; border-radius:4px; font-family:'Cairo'; font-size:0.7rem;"
                                        >
                                        <input type="number" 
                                            value="${opt.option_value !== null && opt.option_value !== undefined ? opt.option_value : ''}" 
                                            onblur="window.assessmentManager.updateOption('${opt.id}', 'option_value', this.value)"
                                            placeholder="الوزن"
                                            style="width:60px; padding:4px 6px; border:1px solid #e5e7eb; border-radius:4px; font-family:'Cairo'; font-size:0.7rem; text-align:center;"
                                        >
                                        <button type="button" onclick="window.assessmentManager.deleteOption('${opt.id}', '${assessmentId}')" style="padding:2px 6px; font-size:0.65rem; background:#fef2f2; color:#dc2626; border:1px solid #fee2e2; border-radius:4px; cursor:pointer; font-family:'Cairo';">🗑️</button>
                                    </div>
                                `;
                            });
                        }

                        const canAddMore = qOptions.length < 5;
                        html += `
                                    <button type="button" 
                                        onclick="window.assessmentManager.addOption('${q.id}', '${assessmentId}')" 
                                        style="margin-top:4px; padding:3px 8px; font-size:0.65rem; background:#f0fdf4; color:#0f766e; border:1px solid #86efac; border-radius:4px; cursor:pointer; font-family:'Cairo'; font-weight:600; ${canAddMore ? '' : 'opacity:0.4; cursor:not-allowed;'}"
                                        ${canAddMore ? '' : 'disabled'}
                                    >+ إضافة خيار (${qOptions.length}/5)</button>
                                </div>
                            </div>
                        `;
                    });
                }

                html += `</div></div>`;
            });
        }

        html += '</div>';
        contentContainer.innerHTML = html;
    }

    async addAxisInline(assessmentId) {
        const titleAr = prompt("أدخل اسم المحور الجديد (بالعربية):");
        if (!titleAr) return;
        try {
            await this.supabase.request('rpc/save_axis_secure', {
                method: 'POST',
                body: JSON.stringify({
                    p_assessment_type_id: assessmentId,
                    p_title: titleAr,
                    p_title_ar: titleAr,
                    p_code: 'AX' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    p_weight: 10,
                    p_display_order: 1
                })
            });
            await this.editAssessment(assessmentId);
        } catch (err) { this.showToast("فشل إضافة المحور: " + err.message, true); }
    }

    async addQuestionInline(assessmentId, axisId) {
        const qTextAr = prompt("أدخل نص السؤال الجديد (بالعربية):");
        if (!qTextAr) return;
        try {
            await this.supabase.request('rpc/save_question_secure', {
                method: 'POST',
                body: JSON.stringify({
                    p_assessment_type_id: assessmentId,
                    p_axis_id: axisId,
                    p_question_text: qTextAr,
                    p_question_text_ar: qTextAr,
                    p_code: 'Q' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    p_question_type: 'select',
                    p_display_order: 1,
                    p_is_required: true,
                    p_trap_index: null
                })
            });
            await this.editAssessment(assessmentId);
        } catch (err) { this.showToast("فشل إضافة السؤال: " + err.message, true); }
    }

    async importAssessment() {
        const jsonText = prompt("الصق JSON التقييم هنا:");
        if (!jsonText) return;

        try {
            const data = JSON.parse(jsonText);
            const result = await this.supabase.request('rpc/import_assessment_secure', {
                method: 'POST',
                body: JSON.stringify({ p_data: data })
            });

            this.showToast("تم استيراد التقييم بنجاح!");
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل الاستيراد: " + err.message, true);
        }
    }

    async updateOption(optionId, field, value) {
        try {
            const payload = { p_option_id: optionId };
            if (field === 'option_value') {
                payload.p_option_value = parseInt(value, 10) || 0;
            } else if (field === 'label_ar') {
                payload.p_label_ar = value.trim();
            }

            await this.supabase.request('rpc/update_option_secure', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            this.showToast("تم تحديث الخيار بنجاح.");
        } catch (err) {
            this.showToast("فشل تحديث الخيار: " + err.message, true);
        }
    }

    async addOption(questionId, assessmentId) {
        try {
            const allOptions = await this.supabase.select('options') || [];
            const qOptions = allOptions.filter(o => o.question_id === questionId);

            if (qOptions.length >= 5) {
                this.showToast("الحد الأقصى 5 خيارات لكل سؤال.", true);
                return;
            }

            const maxOrder = qOptions.reduce((max, o) => Math.max(max, o.display_order || 0), 0);

            await this.supabase.request('rpc/add_option_secure', {
                method: 'POST',
                body: JSON.stringify({
                    p_question_id: questionId,
                    p_label_ar: 'خيار جديد',
                    p_label: 'New Option',
                    p_option_value: 0,
                    p_option_index: qOptions.length,
                    p_display_order: maxOrder + 1,
                    p_is_trap: false
                })
            });

            this.showToast("تم إضافة الخيار الجديد.");
            await this.editAssessment(assessmentId);
        } catch (err) {
            this.showToast("فشل إضافة الخيار: " + err.message, true);
        }
    }

    async deleteOption(optionId, assessmentId) {
        if (!confirm("هل أنت متأكد من حذف هذا الخيار؟")) return;
        try {
            await this.supabase.request('rpc/delete_option_secure', {
                method: 'POST',
                body: JSON.stringify({ p_option_id: optionId })
            });
            this.showToast("تم حذف الخيار.");
            await this.editAssessment(assessmentId);
        } catch (err) {
            this.showToast("فشل حذف الخيار: " + err.message, true);
        }
    }


    /* ─────────────── تفعيل وتطوير جدول المستخدمين (LEADS) ─────────────── */

    async loadUserSubmissionsDashboard() {
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

            document.getElementById('stat-leads').textContent = totalLeads;
            document.getElementById('stat-completed').textContent = completedCount;
            document.getElementById('stat-avg').textContent = `${avgScore}%`;
            document.getElementById('stat-clinics').textContent = uniqueClinics.size;

            const now = new Date();
            document.getElementById('last-updated').textContent = now.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

            this.populateFilterDropdown();
            this.applyDashboardFilters();
        } catch (err) {
            console.error('[CORE System] Leads compilation error:', err);
        }
    }

    // ملء قائمة الفلترة ديناميكياً بأنواع التقييمات الحقيقية من قاعدة البيانات
    populateFilterDropdown() {
        const select = document.getElementById('filter-type');
        if (!select) return;

        // الاحتفاظ بخيار "كل التقييمات" فقط وإزالة الباقي
        select.innerHTML = '<option value="">كل التقييمات</option>';

        // القائمة العامة للنتائج تعتمد على Families التي لها نسخة منشورة حالياً فقط.
        const seenFamilies = new Set();
        (this.allAssessments || []).forEach(ast => {
            const family = this.familyByVersionId[ast.id];
            if (!family?.id || family.current_published_version_id !== ast.id) return;
            if ((ast.status || '').toLowerCase() !== 'published' || ast.is_active === false) return;
            if (seenFamilies.has(family.id)) return;
            seenFamilies.add(family.id);

            const option = document.createElement('option');
            option.value = family.id;
            option.textContent = ast.title_ar || ast.title_en || family.slug;
            select.appendChild(option);
        });
    }

    setupDashboardFilterEvents() {
        document.getElementById('btn-search')?.addEventListener('click', () => this.applyDashboardFilters());
        document.getElementById('search-input')?.addEventListener('keyup', (e) => {
            this.populateFilterDropdown();
            if (e.key === 'Enter') this.applyDashboardFilters();
        });
        document.getElementById('filter-type')?.addEventListener('change', () => this.applyDashboardFilters());
        document.getElementById('filter-status')?.addEventListener('change', () => this.applyDashboardFilters());
        document.getElementById('filter-sort')?.addEventListener('change', () => this.applyDashboardFilters());
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.loadUserSubmissionsDashboard());
        
        const userForm = document.getElementById('user-form');
        if (userForm) {
            userForm.onsubmit = async (e) => {
                e.preventDefault();
                await this.generateAccessCode();
            };
        }
        
        document.getElementById('btn-close-modal').onclick = () => document.getElementById('detail-modal').classList.add('hidden');
        document.getElementById('btn-close-user-modal')?.addEventListener('click', () => document.getElementById('user-modal').classList.add('hidden'));
        document.getElementById('btn-cancel-user')?.addEventListener('click', () => document.getElementById('user-modal').classList.add('hidden'));
    }

    applyDashboardFilters() {
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

            const leadFamilyId = this.familyByVersionId[lead.assessment_type_id]?.id || null;
            const matchesType = !type || leadFamilyId === type;
            const matchesStatus = !status || (status === 'completed' ? lead.completed : !lead.completed);

            return matchesQuery && matchesType && matchesStatus;
        });

        if (sortOrder === 'newest') this.filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else if (sortOrder === 'oldest') this.filteredLeads.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortOrder === 'score-high') this.filteredLeads.sort((a, b) => (parseFloat(b.score_percentage) || 0) - (parseFloat(a.score_percentage) || 0));
        else if (sortOrder === 'score-low') this.filteredLeads.sort((a, b) => (parseFloat(a.score_percentage) || 0) - (parseFloat(b.score_percentage) || 0));
        else if (sortOrder === 'name') this.filteredLeads.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        this.currentPage = 1;
        document.getElementById('results-count').textContent = `${this.filteredLeads.length} نتيجة`;
        this.renderLeadsTable();
    }

    renderLeadsTable() {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageLeads = this.filteredLeads.slice(startIndex, endIndex);

        if (pageLeads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:#6b7280; font-weight:600;">📭 لا توجد تقييمات منجزة مطابقة لمعايير التصفية الحالية.</td></tr>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let htmlRows = '';
        pageLeads.forEach(lead => {
            const dateStr = new Date(lead.created_at).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric' });
            const scoreDisplay = lead.completed && lead.score_percentage !== null ? `${parseFloat(lead.score_percentage).toFixed(1)}%` : '---';
            const stateBadge = lead.completed ? '<span class="badge badge-success">مكتمل</span>' : '<span class="badge badge-warning">غير مكتمل</span>';

            htmlRows += `
                <tr>
                    <td>${dateStr}</td>
                    <td style="font-weight:700; color:#111827;">${this.escapeHtml(lead.full_name || 'طبيب غير معروف')}</td>
                    <td>${this.escapeHtml(lead.clinic_name || '---')}</td>
                    <td>${this.translateSpecialty(lead.specialty)}</td>
                    <td>${this.translateStaffSize(lead.team)}</td>
                    <td>${lead.years || '---'}</td>
                    <td>${this.escapeHtml(lead.country === 'JO' ? '🇯🇴 الأردن' : lead.country === 'SA' ? '🇸🇦 السعودية' : lead.country || '🌍 أخرى')}</td>
                    <td style="font-weight:800; color:#0f766e; font-size:1rem;">${scoreDisplay}</td>
                    <td>${stateBadge}</td>
                    <td>
                        <button class="btn-details" data-id="${lead.id}">👁️ التفاصيل</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = htmlRows;
        this.renderPaginationSystemControls();
        this.attachTableActionEvents();
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
                this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
                this.renderLeadsTable();
            });
        });
    }

    attachTableActionEvents() {
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
        modalBody.innerHTML = '<p style="text-align:center; padding:24px; font-weight:600; color:#475569;">⏳ جاري قراءة وفحص الفخاخ السلوكية واستنباط التحليلات النصية لرحلة المريض...</p>';

        try {
            const lead = this.allLeads.find(l => l.id === leadId);
            if (!lead) return;

            // النتيجة الرسمية تأتي من assessment_results عند توفرها.
            // البيانات القديمة تبقى معروضة كتاريخية، دون إعادة احتساب KPI في المتصفح.
            const [sessions, legacyScores, answers, axesForAssessment] = await Promise.all([
                this.supabase.select('sessions', { filter: { lead_id: leadId } }),
                this.supabase.select('scores', { filter: { lead_id: leadId } }),
                this.supabase.select('answers', { filter: { lead_id: leadId } }),
                this.supabase.select('axes', { filter: { assessment_type_id: lead.assessment_type_id } })
            ]);

            const completedSession = (sessions || [])
                .slice()
                .sort((a, b) => new Date(b.completed_at || b.created_at || 0) - new Date(a.completed_at || a.created_at || 0))
                .find(s => (s.status || '').toLowerCase() === 'completed')
                || (sessions || [])[0]
                || null;

            const canonicalRows = completedSession
                ? await this.supabase.select('assessment_results', { filter: { session_id: completedSession.id } })
                : [];
            const officialResult = canonicalRows?.[0]?.result || null;
            const isOfficialResult = !!officialResult;

            const axisNameByCode = {};
            (axesForAssessment || []).forEach(axis => {
                axisNameByCode[axis.code] = axis.title_ar || axis.title || axis.code;
            });

            const reportScores = isOfficialResult
                ? (officialResult?.scores?.axes || []).map(s => ({
                    name: axisNameByCode[s.axisCode] || s.axisCode || 'محور',
                    score: Number.isFinite(Number(s.score)) ? Number(s.score) : null,
                    status: s.status
                }))
                : (legacyScores || []).map(s => ({
                    name: s.axis_name_ar || s.axis_id || 'محور',
                    score: Number.isFinite(parseFloat(s.percentage)) ? parseFloat(s.percentage) : null,
                    status: 'historical'
                }));

            let axisGridHtml = '';
            let weakestAxis = { name: 'المحاور قيد المعالجة', score: 101 };
            let strongestAxis = { name: 'المحاور قيد المعالجة', score: -1 };

            reportScores.forEach(s => {
                if (!Number.isFinite(s.score)) return;
                if (s.score < weakestAxis.score) weakestAxis = { name: s.name, score: s.score };
                if (s.score > strongestAxis.score) strongestAxis = { name: s.name, score: s.score };

                axisGridHtml += `
                    <div class="score-card">
                        <div class="score-name">${this.escapeHtml(s.name)}</div>
                        <div class="score-value">${s.score.toFixed(1)}%</div>
                    </div>
                `;
            });

            let behaviorTrapsHtml = '';
            const triggeredTraps = answers ? answers.filter(a => a.trap_triggered === true || a.is_trap === true) : [];

            if (triggeredTraps.length > 0) {
                triggeredTraps.forEach((trap, idx) => {
                    behaviorTrapsHtml += `
                        <div class="answer-item" style="background:#fff5f5; border-right:3px solid #ef4444; padding:12px; margin-bottom:8px; border-radius:6px; text-align:right;">
                            <div class="answer-question" style="font-weight:700; color:#991b1b;">🚨 فجوة سلوكية / منفذ تسريب مكتشف رقم (${idx + 1}):</div>
                            <div style="font-size:0.85rem; color:#7f1d1d; line-height:1.6; margin-top:4px;">
                                <strong>المعيار المفحوص:</strong> ${this.escapeHtml(trap.question_text || 'تراجع كفاءة معيار العمل العيادي اليومي.')} <br>
                                <span style="color:#b91c1c; font-weight:700;">📌 واقع الرد (قيمة: ${this.escapeHtml(trap.answer_value ?? '—')}):</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                behaviorTrapsHtml = '<p style="color:#166534; font-weight:600; font-size:0.85rem; text-align:right;">لا توجد فخاخ مسجلة لهذا السجل.</p>';
            }

            const kpiMap = Object.fromEntries(
                (Array.isArray(officialResult?.kpis) ? officialResult.kpis : [])
                    .map(k => [k.kpiCode, k])
            );
            const kpiValue = (code) => {
                const item = kpiMap[code];
                if (!item || item.value === null || item.value === undefined || item.status === 'unavailable') return 'غير متاح';
                return Number(item.value).toFixed(1).replace(/\\.0$/, '') + '%';
            };

            const overallScore = officialResult?.scores?.overallScore ?? (
                lead.score_percentage !== null && lead.score_percentage !== undefined
                    ? parseFloat(lead.score_percentage)
                    : null
            );

            const tfiIndex = kpiValue('TFI');
            const tapIndex = kpiValue('TAP');
            const prpIndex = kpiValue('PRP');
            const pliIndex = kpiValue('PLI');
            const psiIndex = kpiValue('PSI');
            const npiIndex = kpiValue('NPI');
            const eviIndex = kpiValue('EVI');
            const tciIndex = kpiValue('TCI');
            const rriValue = kpiMap.RRI?.value !== null && kpiMap.RRI?.value !== undefined && kpiMap.RRI?.status !== 'unavailable'
                ? Number(kpiMap.RRI.value).toFixed(1).replace(/\\.0$/, '') + '%'
                : null;

            const resultSourceLabel = isOfficialResult
                ? '✅ النتيجة الرسمية P3'
                : '🕘 نتيجة تاريخية (البيانات القديمة)';

            // جلب اسم التقييم الفعلي من الخارطة التي قمنا ببنائها ديناميكياً
            const currentAssessmentName = this.assessmentTypesMap[lead.assessment_type_id] || 'نموذج تقييم استشاري';

            // دمج وحقن التقارير النصية العربية المتكاملة في الـ Modal دون تغيير هيكلة الـ HTML الأصلية
            modalBody.innerHTML = `
                <div class="detail-section" style="text-align:right;">
                    <h4>📋 البيانات الاستشارية والتعريفية للمنشأة الطبية</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><div class="detail-label">النموذج الطبي المفحوص</div><div class="detail-value" style="color:#0f766e; font-weight:800;">🔍 ${this.escapeHtml(currentAssessmentName)}</div>
                        <div class="detail-item"><div class="detail-label">مصدر النتيجة</div><div class="detail-value">${resultSourceLabel}</div></div></div>
                        <div class="detail-item"><div class="detail-label">الطبيب / صاحب التقييم</div><div class="detail-value">${this.escapeHtml(lead.full_name)}</div></div>
                        <div class="detail-item"><div class="detail-label">العيادة / المركز الطبي</div><div class="detail-value">${this.escapeHtml(lead.clinic_name || '---')}</div></div>
                        <div class="detail-item"><div class="detail-label">رقم الهاتف والتواصل</div><div class="detail-value" style="direction:ltr; text-align:right;">${this.escapeHtml(lead.phone || '---')}</div></div>
                        <div class="detail-item"><div class="detail-label">البريد الإلكتروني التجاري</div><div class="detail-value">${this.escapeHtml(lead.email || '---')}</div></div>
                        <div class="detail-item"><div class="detail-label">التخصص السريري والبلد</div><div class="detail-value">${this.translateSpecialty(lead.specialty)} • ${lead.country === 'JO' ? 'الأردن 🇯🇴' : lead.country === 'SA' ? 'السعودية 🇸🇦' : lead.country || '🌍 أخرى'}</div></div>
                        <div class="detail-item"><div class="detail-label">معدل الكفاءة التشغيلية الكلي</div><div class="detail-value" style="color:#0f766e; font-size:1.15rem; font-weight:800;">${overallScore !== null && Number.isFinite(Number(overallScore)) ? Number(overallScore).toFixed(1) + '%' : '---'}</div></div>
                    </div>
                </div>

                <div class="detail-section" style="text-align:right;">
                    <h4>📊 لوحة مؤشرات الأداء الحيوية (KPIs Dashboard)</h4>
                    <div class="scores-grid">
                        <div class="score-card"><div class="score-name">بناء الثقة (TFI)</div><div class="score-value">${tfiIndex}%</div></div>
                        <div class="score-card"><div class="score-name">قبول العلاج (TAP)</div><div class="score-value">${tapIndex}%</div></div>
                        <div class="score-card"><div class="score-name">الاستبقاء (PRP)</div><div class="score-value">${prpIndex}%</div></div>
                        <div class="score-card"><div class="score-name">الولاء (PLI)</div><div class="score-value">${pliIndex}%</div></div>
                        <div class="score-card"><div class="score-name">رضا المريض (PSI)</div><div class="score-value">${psiIndex}%</div></div>
                        <div class="score-card"><div class="score-name">التوصية (NPI)</div><div class="score-value">${npiIndex}%</div></div>
                        <div class="score-card"><div class="score-name">قيمة التجربة (EVI)</div><div class="score-value">${eviIndex}%</div></div>
                        <div class="score-card"><div class="score-name">ثقة العلاج (TCI)</div><div class="score-value">${tciIndex}%</div></div>
                        ${rriValue !== null ? `<div class="score-card"><div class="score-name">جاهزية الاستقبال (RRI)</div><div class="score-value">${rriValue}</div></div>` : ''}
                    </div>
                </div>

                <div class="detail-section" style="text-align:right;">
                    <h4>🎯 كفاءة محاور الأداء الاستراتيجي لرحلة المريض</h4>
                    <div class="scores-grid">
                        ${axisGridHtml || '<p style="color:#6b7280; text-align:center; grid-column: 1/-1;">لا توجد درجات محاور مسجلة في قاعدة البيانات لهذا السجل حالياً.</p>'}
                    </div>
                </div>

                <div class="detail-section" style="text-align:right;">
                    <h4>💡 التوجيهات الاستشارية وفرص التطوير الهيكلي ("شيفرة العيادة")</h4>
                    <div style="background:#f0fdfa; border-right:4px solid #0f766e; padding:12px; border-radius:6px; margin-bottom:8px;">
                        <strong style="color:#134e4a; font-size:0.9rem; display:block; margin-bottom:4px;">🎯 الأولوية التشغيلية القصوى للتدخل السريع:</strong>
                        <p style="font-size:0.85rem; color:#374151; line-height:1.6; margin:0;">
                            يمثل محور <strong>"${weakestAxis.name}"</strong> الفجوة التشغيلية الأكبر والمنفذ الرئيسي المسبب لـ الفاقد المالي وتسريب المرضى بنسبة أداء بلغت (${weakestAxis.score <= 100 ? weakestAxis.score.toFixed(1) + '%' : 'قيد الاحتساب'}). يتطلب هذا المعيار تدخلاً فورياً لإعادة صياغة بروتوكول العقد المسبق وأنظمة المتابعة لمنع الفاقد المالي (Leakage).
                        </p>
                    </div>
                    <div style="background:#f8fafc; border-right:4px solid #6b7280; padding:12px; border-radius:6px;">
                        <strong style="color:#1f2937; font-size:0.9rem; display:block; margin-bottom:4px;">💪 نقطة القوة المرتكز عليها في العيادة:</strong>
                        <p style="font-size:0.85rem; color:#6b7280; line-height:1.6; margin:0;">
                            تتمتع العيادة بنظام تشغيلي مستقر وكفاءة متميزة في محور <strong>"${strongestAxis.name}"</strong> بنسبة نجاح بلغت (${strongestAxis.score >= 0 ? strongestAxis.score.toFixed(1) + '%' : 'قيد الاحتساب'}). يمكن الارتكاز على هذه القوة التنافسية لرفع كفاءة الأداء المالي والتشغيلي لباقي الكادر.
                        </p>
                    </div>
                </div>

                <div class="detail-section" style="text-align:right;">
                    <h4>🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                    <div class="answers-list">
                        ${behaviorTrapsHtml}
                    </div>
                </div>
            `;

        } catch (err) {
            modalBody.innerHTML = `<p style="color:red; padding:12px; text-align:center;">❌ فشل معالجة واستخراج تقرير القراءة الاستشارية: ${err.message}</p>`;
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
}

window.AssessmentManager = AssessmentManager;
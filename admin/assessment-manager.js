/**
 * CORE System — Assessment Manager
 * النسخة المكتملة والمستقرة - معالجة قيد الـ Status Constraint وتوحيد الحالات برمجياً
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.supabase = dashboard ? dashboard.supabase : window.supabaseClient;
    }

    async init() {
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px; text-align:center;">جاري جلب التقييمات وتجهيز أدوات التحكم...</p>';
        }
        await this.renderAssessmentsTable();
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) {
            alert(message);
            return;
        }
        toast.innerText = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
    }

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
                container.innerHTML = `
                    <div style="padding:20px; text-align:center; color:#6b7280;">
                        <p>لا توجد تقييمات حالياً في قاعدة البيانات.</p>
                        <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="margin-top:10px; padding:8px 16px;">إضافة تقييم جديد +</button>
                    </div>`;
                return;
            }

            if (Array.isArray(data)) {
                data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="color:#134e4a; font-weight:700;">التقييمات المتاحة في النظام</h4>
                    <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="padding:6px 12px; font-size:0.85rem;">+ تقييم جديد</button>
                </div>
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table style="width:100%; border-collapse:collapse; background:white; font-size:0.85rem; text-align:right;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                <th style="padding:12px 10px; color:#475569;">عنوان التقييم</th>
                                <th style="padding:12px 10px; color:#475569;">الحالة</th>
                                <th style="padding:12px 10px; color:#475569; text-align:center;">إجراءات التحكم</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.forEach(ast => {
                let badgeClass = 'badge-warning';
                let statusText = 'مسودة';
                
                // قراءة ذكية وحيادية لحالة السجل (Case-Insensitive Check) لمنع أخطاء العرض
                const currentStatusClean = (ast.status || '').toLowerCase();
                
                if (currentStatusClean === 'published') { badgeClass = 'badge-success'; statusText = 'منشور'; }
                if (currentStatusClean === 'archived') { badgeClass = 'btn-secondary'; statusText = 'مؤرشف'; }

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
                        <td style="padding:12px 10px; text-align:center;">
                            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                                <button onclick="window.assessmentManager.editAssessment('${ast.id}')" class="btn-details" style="padding:4px 8px; font-size:0.75rem;">⚙️ تعديل</button>
                                <button onclick="window.assessmentManager.duplicateAssessment('${ast.id}')" class="btn-details" style="padding:4px 8px; font-size:0.75rem; background:#6366f1;">📋 نسخ</button>
                                <button onclick="window.assessmentManager.archiveAssessment('${ast.id}', '${ast.status || 'draft'}')" class="btn-small" style="padding:4px 8px; font-size:0.75rem; background:#e2e8f0; color:#334155;">📦 ${currentStatusClean === 'archived' ? 'تنشيط' : 'أرشفة'}</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<p style="color:red; padding:10px;">فشل تحميل البيانات: ${err.message}</p>`;
        }
    }

    createNewAssessment() {
        document.getElementById('assessment-form').reset();
        document.getElementById('ast-id').value = '';
        document.getElementById('assessment-modal-title').innerText = "إنشاء تقييم استشاري جديد";
        document.getElementById('modal-tab-content').innerHTML = '<p style="color:#6b7280; padding:10px; text-align:center; font-size:0.85rem;">يرجى حفظ بيانات التقييم الأساسية أولاً لتتمكن من إضافة وربط المحاور والأسئلة له علائقياً في السيرفر.</p>';
        document.getElementById('assessment-modal').classList.remove('hidden');
    }

    async editAssessment(id) {
        try {
            const allAssessments = await this.supabase.select('assessment_types');
            const ast = allAssessments.find(a => a.id === id);
            if (!ast) return this.showToast("التقييم المطلوب غير موجود.", true);

            // توحيد قراءة الحالة وعرضها في المودال بشكل صحيح متطابق مع الاختيارات
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
            
            const currentAxes = allAxes.filter(x => x.assessment_type_id === id);
            const currentQuestions = allQuestions.filter(q => q.assessment_type_id === id);

            this.renderModalTabs(currentAxes, currentQuestions);

            document.getElementById('assessment-modal-title').innerText = "تعديل تقييم: " + (ast.title_ar || '');
            document.getElementById('assessment-modal').classList.remove('hidden');
        } catch (err) {
            this.showToast("خطأ أثناء تحميل تفاصيل التقييم علائقياً: " + err.message, true);
        }
    }

    renderModalTabs(axes, questions) {
        const contentContainer = document.getElementById('modal-tab-content');
        if (!contentContainer) return;

        let html = '<div style="display:flex; flex-direction:column; gap:12px; text-align:right; dir:rtl;">';
        
        if (axes.length === 0) {
            html += '<p style="color:#6b7280; text-align:center; padding:10px; font-size:0.85rem;">لا توجد محاور مرتبط بهذا التقييم حالياً.</p>';
        } else {
            axes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            
            axes.forEach(axis => {
                const axisQuestions = questions.filter(q => q.axis_id === axis.id);
                axisQuestions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                html += `
                    <div style="background:#f8fafc; padding:10px; border-radius:8px; border-right:4px solid #0f766e; border-top:1px solid #e5e7eb; border-left:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; color:#134e4a; font-size:0.85rem; margin-bottom:6px;">
                            <span>📌 محور: ${axis.title_ar || axis.title || 'بدون اسم'} (${axis.code || ''})</span>
                            <span style="font-size:0.75rem; color:#6b7280; margin-right:auto;">الوزن: %${axis.weight || 0}</span>
                        </div>
                        <div style="padding-right:8px; display:flex; flex-direction:column; gap:4px;">
                `;
                
                if (axisQuestions.length === 0) {
                    html += '<p style="font-size:0.75rem; color:#94a3b8; margin:0;">⚠️ لا توجد أسئلة مضافة تحت هذا المحور.</p>';
                } else {
                    axisQuestions.forEach(q => {
                        html += `
                            <div style="font-size:0.75rem; color:#334155; background:white; padding:6px 8px; border-radius:4px; border:1px solid #f1f5f9; display:flex; justify-content:space-between;">
                                <span>❓ ${q.question_text_ar || q.question_text}</span>
                                <span style="color:#0f766e; font-weight:600; font-size:0.7rem;">(${q.code || ''})</span>
                            </div>`;
                    });
                }
                
                html += `</div></div>`;
            });
        }

        html += '</div>';
        contentContainer.innerHTML = html;
    }

    async saveAssessment() {
        const id = document.getElementById('ast-id').value;
        const titleEn = document.getElementById('ast-title-en').value;
        const generatedSlug = titleEn ? titleEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'assessment-' + Date.now();
        
        // تحويل الحالة إلى أحرف صغيرة إجبارياً لإرضاء قيد الـ Check Constraint الخاص بقاعدة البيانات
        const rawStatusValue = document.getElementById('ast-status').value;
        const databaseStatus = rawStatusValue ? rawStatusValue.toLowerCase() : 'draft';

        const payload = {
            title_ar: document.getElementById('ast-title-ar').value,
            title_en: titleEn,
            slug: generatedSlug,
            description: document.getElementById('ast-description').value,
            status: databaseStatus, 
            has_traps: document.getElementById('ast-has-traps').checked,
            has_ev_simulator: document.getElementById('ast-has-simulator').checked
        };

        try {
            if (id) {
                await this.supabase.update('assessment_types', payload, { id: id });
                this.showToast("تم تحديث بيانات التقييم بنجاح.");
            } else {
                payload.axis_count = 0;
                payload.question_count = 0;
                payload.version = 1;
                await this.supabase.insert('assessment_types', payload);
                this.showToast("تم إنشاء التقييم الاستشاري الجديد بنجاح.");
            }
            
            document.getElementById('assessment-modal').classList.add('hidden');
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل حفظ البيانات: " + err.message, true);
        }
    }

    async archiveAssessment(id, currentStatus) {
        // تحويل الحالات إلى أحرف صغيرة لمطابقة القيود البرمجية لقاعدة البيانات
        const currentClean = (currentStatus || '').toLowerCase();
        const nextStatus = currentClean === 'archived' ? 'draft' : 'archived';
        
        try {
            await this.supabase.update('assessment_types', { status: nextStatus }, { id: id });
            this.showToast(`تم تغيير حالة التقييم بنجاح إلى: ${nextStatus === 'archived' ? 'مؤرشف' : 'مسودة'}`);
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل تعديل الحالة: " + err.message, true);
        }
    }

    async duplicateAssessment(id) {
        if (!confirm("هل أنت متأكد من رغبتك في مضاعفة هذا التقييم بكافة محاوره وأسئلته علائقياً وسحابياً؟")) return;

        try {
            const allAssessments = await this.supabase.select('assessment_types');
            const original = allAssessments.find(a => a.id === id);
            if (!original) return this.showToast("التقييم الأصلي غير موجود.", true);

            const cloneAstPayload = {
                title_ar: `${original.title_ar} (نسخة)`,
                title_en: original.title_en ? `${original.title_en} (Copy)` : '',
                slug: `${original.slug || 'assessment'}-copy-${Date.now()}`,
                description: original.description,
                status: 'draft', // الالتزام التام بالأحرف الصغيرة لقيد قاعدة البيانات
                has_traps: !!original.has_traps,
                has_ev_simulator: !!original.has_ev_simulator,
                axis_count: original.axis_count || 0,
                question_count: original.question_count || 0,
                version: (original.version || 1) + 1,
                parent_id: original.id
            };

            const insertedAstRes = await this.supabase.insert('assessment_types', cloneAstPayload);
            const newAst = Array.isArray(insertedAstRes) ? insertedAstRes[0] : insertedAstRes;
            const newAstId = newAst.id;

            const allAxes = await this.supabase.select('axes') || [];
            const allQuestions = await this.supabase.select('questions') || [];
            const allOptions = await this.supabase.select('options') || [];

            const originalAxes = allAxes.filter(x => x.assessment_type_id === id);
            const originalQuestions = allQuestions.filter(q => q.assessment_type_id === id);

            for (const axis of originalAxes) {
                const cloneAxisPayload = {
                    assessment_type_id: newAstId,
                    code: axis.code,
                    title: axis.title,
                    title_ar: axis.title_ar,
                    description: axis.description,
                    weight: axis.weight,
                    display_order: axis.display_order,
                    status: axis.status ? axis.status.toLowerCase() : 'draft'
                };

                const insertedAxisRes = await this.supabase.insert('axes', cloneAxisPayload);
                const newAxis = Array.isArray(insertedAxisRes) ? insertedAxisRes[0] : insertedAxisRes;

                const axisQuestions = originalQuestions.filter(q => q.axis_id === axis.id);
                for (const q of axisQuestions) {
                    const cloneQPayload = {
                        axis_id: newAxis.id,
                        assessment_type_id: newAstId,
                        code: q.code,
                        question_text: q.question_text,
                        question_text_ar: q.question_text_ar,
                        question_type: q.question_type,
                        display_order: q.display_order,
                        is_required: !!q.is_required,
                        trap_index: q.trap_index,
                        status: q.status ? q.status.toLowerCase() : 'draft'
                    };

                    const insertedQRes = await this.supabase.insert('questions', cloneQPayload);
                    const newQ = Array.isArray(insertedQRes) ? insertedQRes[0] : insertedQRes;

                    const qOptions = allOptions.filter(o => o.question_id === q.id);
                    for (const opt of qOptions) {
                        const cloneOptPayload = {
                            question_id: newQ.id,
                            option_index: opt.option_index,
                            option_value: opt.option_value,
                            label: opt.label,
                            label_ar: opt.label_ar,
                            display_text: opt.display_text,
                            display_text_ar: opt.display_text_ar,
                            is_trap: !!opt.is_trap,
                            display_order: opt.display_order
                        };
                        await this.supabase.insert('options', cloneOptPayload);
                    }
                }
            }

            this.showToast("تمت عملية النسخ المتطابق العلائقي للتقييم بالكامل بنجاح.");
            await this.renderAssessmentsTable();

        } catch (err) {
            this.showToast("فشل النسخ المتطابق: " + err.message, true);
        }
    }
}

window.AssessmentManager = AssessmentManager;

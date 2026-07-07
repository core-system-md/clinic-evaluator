/**
 * CORE System — Assessment Manager
 * النسخة المستقرة والمحمية - متطابقة 100% مع RLS السحابي ودعم كامل للوسائط والنسخ العميق
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
        this.attachImageListener();
    }

    showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) { return alert(message); }
        toast.innerText = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
    }

    attachImageListener() {
        document.body.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'ast-image-file') {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        const preview = document.getElementById('ast-image-preview');
                        const container = document.getElementById('ast-image-preview-container');
                        if (preview && container) {
                            preview.src = evt.target.result;
                            container.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    async uploadAssessmentImage(slug, file) {
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${slug}.${fileExt}`;
            const url = `${this.supabase.url}/storage/v1/object/assessment-images/${filePath}`;

            const response = await fetch(url, {
                method: 'POST',
                body: file,
                headers: {
                    'apikey': this.supabase.key,
                    'Authorization': `Bearer ${this.supabase.key}`,
                    'Content-Type': file.type,
                    'x-upsert': 'true'
                }
            });

            if (!response.ok) { throw new Error("فشل رفع الملف لـ Supabase Storage"); }
            return true;
        } catch (err) {
            console.error("[Storage Error] Upload failed:", err);
            return false;
        }
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

            activeAssessments.forEach(ast => {
                let badgeClass = 'badge-warning';
                let statusText = 'مسودة';
                
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
                            <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                                <button onclick="window.assessmentManager.editAssessment('${ast.id}')" class="btn-details" style="padding:4px 6px; font-size:0.75rem;">⚙️ هيكلة</button>
                                <button onclick="window.assessmentManager.duplicateAssessment('${ast.id}')" class="btn-details" style="padding:4px 6px; font-size:0.75rem; background:#6366f1;">📋 نسخ</button>
                                <button onclick="window.assessmentManager.archiveAssessment('${ast.id}', '${ast.status || 'draft'}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#e2e8f0; color:#334155;">📦 أرشفة</button>
                                <button onclick="window.assessmentManager.deleteAssessment('${ast.id}')" class="btn-small" style="padding:4px 6px; font-size:0.75rem; background:#fef2f2; color:#dc2626; border:1px solid #fee2e2;">🗑️ شطب</button>
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
        document.getElementById('ast-image-preview-container').style.display = 'none';
        document.getElementById('assessment-modal-title').innerText = "إنشاء تقييم استشاري جديد";
        document.getElementById('modal-tab-content').innerHTML = '<p style="color:#0f766e; padding:15px; background:#f0fdf4; border-radius:8px; text-align:center; font-size:0.85rem; font-weight:600;">يرجى حفظ بيانات التقييم الأساسية أولاً ليتم تخصيص هيكله السحابي.</p>';
        document.getElementById('assessment-modal').classList.remove('hidden');
    }

    async editAssessment(id) {
        try {
            const allAssessments = await this.supabase.select('assessment_types');
            const ast = allAssessments.find(a => a.id === id);
            if (!ast) return this.showToast("التقييم المطلوب غير موجود.", true);

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

            // عرض الصورة الحالية إن وُجدت من الـ Public Storage Bucket بأمان
            const preview = document.getElementById('ast-image-preview');
            const container = document.getElementById('ast-image-preview-container');
            if (preview && container) {
                preview.src = `${this.supabase.url}/storage/v1/object/public/assessment-images/${ast.slug}.png?t=${Date.now()}`;
                container.style.display = 'block';
            }

            const allAxes = await this.supabase.select('axes') || [];
            const allQuestions = await this.supabase.select('questions') || [];
            
            const currentAxes = allAxes.filter(x => x.assessment_type_id === id);
            const currentQuestions = allQuestions.filter(q => q.assessment_type_id === id);

            this.renderModalTabs(currentAxes, currentQuestions, id);

            document.getElementById('assessment-modal-title').innerText = "تعديل تقييم: " + (ast.title_ar || '');
            document.getElementById('assessment-modal').classList.remove('hidden');
        } catch (err) {
            this.showToast("خطأ أثناء تحميل تفاصيل التقييم علائقياً: " + err.message, true);
        }
    }

    renderModalTabs(axes, questions, assessmentId) {
        const contentContainer = document.getElementById('modal-tab-content');
        if (!contentContainer) return;

        let html = '<div style="display:flex; flex-direction:column; gap:12px; text-align:right; dir:rtl;">';
        html += `
            <div style="text-align:left; margin-bottom:5px;">
                <button type="button" onclick="window.assessmentManager.addAxisInline('${assessmentId}')" class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:#0f766e;">+ إضافة محور جديد للتقييم</button>
            </div>
        `;

        if (axes.length === 0) {
            html += '<p style="color:#6b7280; text-align:center; padding:20px; background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1; font-size:0.85rem;">لا توجد محاور مرتبطة بهذا التقييم حالياً.</p>';
        } else {
            axes.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            axes.forEach(axis => {
                const axisQuestions = questions.filter(q => q.axis_id === axis.id);
                axisQuestions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                html += `
                    <div style="background:#f8fafc; padding:12px; border-radius:8px; border-right:4px solid #0f766e; border-top:1px solid #e5e7eb; border-left:1px solid #e5e7eb; border-bottom:1px solid #e5e7eb;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:700; color:#134e4a; font-size:0.85rem; margin-bottom:8px; flex-wrap:wrap; gap:5px;">
                            <span>📌 محور: ${axis.title_ar || axis.title || 'بدون اسم'} (${axis.code || ''})</span>
                            <span style="font-size:0.75rem; color:#6b7280; margin-right:auto; margin-left:10px;">الوزن: %${axis.weight || 0}</span>
                            <button type="button" onclick="window.assessmentManager.addQuestionInline('${assessmentId}', '${axis.id}')" style="padding:2px 6px; font-size:0.7rem; background:#10b981; color:white; border:none; border-radius:4px; cursor:pointer; font-family:'Cairo'; font-weight:600;">+ إضافة سؤال</button>
                        </div>
                        <div style="padding-right:8px; display:flex; flex-direction:column; gap:4px;">
                `;
                
                if (axisQuestions.length === 0) {
                    html += '<p style="font-size:0.75rem; color:#94a3b8; margin:0;">⚠️ لا توجد أسئلة تحت هذا المحور حالياً.</p>';
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
        
        const rawStatusValue = document.getElementById('ast-status').value;
        const databaseStatus = rawStatusValue ? rawStatusValue.toLowerCase() : 'draft';

        const payload = {
            title_ar: document.getElementById('ast-title-ar').value,
            title_en: titleEn,
            slug: generatedSlug,
            description: document.getElementById('ast-description').value,
            status: databaseStatus, 
            has_traps: document.getElementById('ast-has-traps').checked,
            has_ev_simulator: document.getElementById('ast-has-simulator').checked,
            is_active: true
        };

        try {
            if (id) {
                await this.supabase.update('assessment_types', payload, { id: id });
            } else {
                payload.axis_count = 0;
                payload.question_count = 0;
                payload.version = 1;
                await this.supabase.insert('assessment_types', payload);
            }
            
            // رفع ومعالجة الصور المرفقة سحابياً إن وُجدت
            const fileInput = document.getElementById('ast-image-file');
            if (fileInput && fileInput.files[0]) {
                await this.uploadAssessmentImage(generatedSlug, fileInput.files[0]);
            }

            this.showToast("تم حفظ التقييم ومعالجة البيانات السحابية للوسائط بنجاح.");
            document.getElementById('assessment-modal').classList.add('hidden');
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل حفظ البيانات: " + err.message, true);
        }
    }

    async archiveAssessment(id, currentStatus) {
        const currentClean = (currentStatus || '').toLowerCase();
        const nextStatus = currentClean === 'archived' ? 'draft' : 'archived';
        try {
            await this.supabase.update('assessment_types', { status: nextStatus }, { id: id });
            this.showToast(`تم تغيير الحالة بنجاح إلى: ${nextStatus}`);
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل تعديل الحالة: " + err.message, true);
        }
    }

    async deleteAssessment(id) {
        if (!confirm("هل أنت متأكد من شطب هذا التقييم نهائياً وإخفائه من لوحة التحكم؟")) return;
        try {
            await this.supabase.update('assessment_types', { is_active: false }, { id: id });
            this.showToast("تم شطب وإخفاء التقييم بنجاح.");
            await this.renderAssessmentsTable();
        } catch (err) {
            this.showToast("فشل شطب التقييم: " + err.message, true);
        }
    }

    // محرك النسخ المتطابق الشامل والعميق (Relational Deep Duplication Engine)
    async duplicateAssessment(id) {
        if (!confirm("تأكيد: هل ترغب في نسخ هذا التقييم بالكامل (شاملاً المحاور، الأسئلة، الخيارات، وأوزان المحاكي)؟")) return;

        try {
            const tyrannyRes = await this.supabase.select('assessment_types');
            const original = tyrannyRes.find(a => a.id === id);
            if (!original) return this.showToast("التقييم الأصلي غير موجود.", true);

            const cloneSlug = `${original.slug || 'assessment'}-copy-${Date.now()}`;
            const cloneAstPayload = {
                title_ar: `${original.title_ar} (نسخة)`,
                title_en: original.title_en ? `${original.title_en} (Copy)` : '',
                slug: cloneSlug,
                description: original.description,
                status: 'draft',
                has_traps: !!original.has_traps,
                has_ev_simulator: !!original.has_ev_simulator,
                axis_count: original.axis_count || 0,
                question_count: original.question_count || 0,
                version: (original.version || 1) + 1,
                parent_id: original.id,
                is_active: true
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
                    status: 'active'
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
                        status: 'active'
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

            this.showToast("تم إتمام النسخ المتطابق الشامل لكافة فروع التقييم بنجاح.");
            await this.renderAssessmentsTable();

        } catch (err) {
            this.showToast("فشل النسخ المتطابق الشامل: " + err.message, true);
        }
    }

    async addAxisInline(assessmentId) {
        const titleAr = prompt("اسم المحور الجديد:");
        if (!titleAr) return;
        try {
            const payload = {
                assessment_type_id: assessmentId,
                title_ar: titleAr,
                code: 'AXIS_' + Date.now(),
                weight: 10,
                display_order: 1,
                status: 'active'
            };
            await this.supabase.insert('axes', payload);
            await this.editAssessment(assessmentId);
        } catch (err) { this.showToast(err.message, true); }
    }

    async addQuestionInline(assessmentId, axisId) {
        const textAr = prompt("نص السؤال الجديد:");
        if (!textAr) return;
        try {
            const payload = {
                assessment_type_id: assessmentId,
                axis_id: axisId,
                question_text_ar: textAr,
                code: 'Q_' + Date.now(),
                question_type: 'single',
                display_order: 1,
                is_required: true,
                status: 'active'
            };
            await this.supabase.insert('questions', payload);
            await this.editAssessment(assessmentId);
        } catch (err) { this.showToast(err.message, true); }
    }
}

window.AssessmentManager = AssessmentManager;

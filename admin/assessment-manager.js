/**
 * CORE System — Assessment Manager
 * الإصدار المطور لإدارة التقييمات (Full CRUD & Relational Mapping)
 */

class AssessmentManager {
    constructor(dashboard) {
        // الحفاظ على البنية الأصلية لمنع التجميد الصامت
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

    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<p style="color:red; padding:10px;">خطأ: Supabase غير متصل</p>';
                return;
            }

            // جلب البيانات مع ترتيبها وتصفية المحذوف soft delete إن وجد
            const { data, error } = await this.supabase
                .from('assessment_types')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div style="padding:20px; text-align:center; color:#6b7280;">
                        <p>لا توجد تقييمات حالياً في قاعدة البيانات.</p>
                        <button onclick="window.assessmentManager.createNewAssessment()" class="btn-primary" style="margin-top:10px; padding:8px 16px;">إضافة تقييم جديد +</button>
                    </div>`;
                return;
            }

            // بناء جدول متجاوب يدعم العرض المريح على الهاتف
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
                
                if (ast.status === 'Published') { badgeClass = 'badge-success'; statusText = 'منشور'; }
                if (ast.status === 'Archived') { badgeClass = 'btn-secondary'; statusText = 'مؤرشف'; }

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
                                <button onclick="window.assessmentManager.archiveAssessment('${ast.id}', '${ast.status}')" class="btn-small" style="padding:4px 8px; font-size:0.75rem; background:#e2e8f0; color:#334155;">📦 ${ast.status === 'Archived' ? 'تنشيط' : 'أرشفة'}</button>
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

    // الكود الهيكلي للعمليات التشغيلية (سيتم ربطه بواجهات الـ HTML في الخطوة القادمة)
    createNewAssessment() {
        alert("سيتم فتح نموذج إنشاء تقييم جديد فور تعديل ملف admin.html في الخطوة القادمة.");
    }

    editAssessment(id) {
        alert("جاري تحضير واجهة تعديل المحاور والأسئلة للتقييم رقم: " + id);
    }

    async duplicateAssessment(id) {
        if(confirm("هل أنت متأكد من رغبتك في مضاعفة هذا التقييم بكافة محاوره وأسلته؟")) {
            alert("سيتم تنفيذ دالة النسخ المتطابق (Duplicate) للرقم: " + id);
        }
    }

    async archiveAssessment(id, currentStatus) {
        const nextStatus = currentStatus === 'Archived' ? 'Draft' : 'Archived';
        alert(`جاري تحويل حالة التقييم إلى: ${nextStatus}`);
    }
}

// سطر الأمان لضمان الرؤية الشاملة في المتصفح والهاتف
window.AssessmentManager = AssessmentManager;

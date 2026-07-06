/**
 * CORE System — Assessment Manager
 * الإصدار المتوافق مع شاشات الهاتف - لا يحتاج لـ Console
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.supabase = dashboard.supabase;
    }

    async init() {
        // رسالة تأكيد للعمل داخل الصفحة مباشرة
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p style="padding:10px; background:#e0f2fe; border-radius:8px;">النظام يعمل... جاري جلب التقييمات</p>';
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

            const data = await this.supabase.select('assessment_types');
            
            if (!data || data.length === 0) {
                container.innerHTML = '<p style="padding:10px;">لا توجد تقييمات حالياً.</p>';
                return;
            }

            let html = `
                <table style="width:100%; border-collapse:collapse; margin-top:10px; background:white;">
                    <thead>
                        <tr style="background:#f3f4f6;">
                            <th style="padding:10px; border:1px solid #ddd;">العنوان</th>
                            <th style="padding:10px; border:1px solid #ddd;">الحالة</th>
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
}

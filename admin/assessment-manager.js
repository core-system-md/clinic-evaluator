/**
 * CORE System — Assessment Manager
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.supabase = dashboard.supabase;
    }

    async init() {
        console.log('[Module] Assessment Manager Active');
        await this.renderAssessmentsTable();
    }

    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        container.innerHTML = '<p>جاري تحميل التقييمات...</p>';

        try {
            const data = await this.supabase.select('assessment_types');
            
            let html = `
                <table border="1" width="100%" style="border-collapse:collapse; text-align:center;">
                    <thead>
                        <tr><th>العنوان</th><th>الحالة</th><th>الإجراءات</th></tr>
                    </thead>
                    <tbody>
            `;

            data.forEach(ast => {
                html += `
                    <tr>
                        <td>${ast.title_ar}</td>
                        <td>${ast.status}</td>
                        <td>
                            <button onclick="adminDashboard.assessmentManager.toggleStatus('${ast.id}', '${ast.status === 'published' ? 'archived' : 'published'}')">
                                ${ast.status === 'published' ? 'إخفاء' : 'نشر'}
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = '<p style="color:red;">خطأ في تحميل البيانات</p>';
        }
    }

    async toggleStatus(id, newStatus) {
        await this.supabase.update('assessment_types', { status: newStatus }, { id: id });
        await this.renderAssessmentsTable(); // تحديث الجدول بعد التغيير
    }
}

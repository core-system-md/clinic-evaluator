class AssessmentManager {
    constructor() {
        this.supabase = window.supabaseClient;
    }
    async init() {
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = '<p>جاري سحب البيانات...</p>';
            try {
                const data = await this.supabase.select('assessment_types', { columns: '*' });
                if (!data || data.length === 0) {
                    container.innerHTML = '<p>لا توجد بيانات حالياً.</p>';
                    return;
                }
                let html = '<table style="width:100%; border-collapse:collapse;">';
                data.forEach(ast => {
                    html += `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${ast.title_ar || 'بدون عنوان'}</td></tr>`;
                });
                html += '</table>';
                container.innerHTML = html;
            } catch (err) {
                container.innerHTML = '<p style="color:red;">خطأ: ' + err.message + '</p>';
            }
        }
    }
}
window.assessmentManager = new AssessmentManager();

/**
 * CORE System — Assessment Manager
 * المسؤول عن إدارة التقييمات في لوحة الإدارة
 */

class AssessmentManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.supabase = dashboard.supabase;
    }

    async init() {
        console.log('[Module] Assessment Manager Active');
        await this.loadAssessments();
    }

    async loadAssessments() {
        if (!this.supabase) return;
        try {
            // جلب البيانات من Supabase
            const assessments = await this.supabase.select('assessment_types');
            
            // تسجيل البيانات للتأكد من وصولها (يمكنك رؤيتها في Console المتصفح)
            console.log('[Module] Assessments Loaded:', assessments);
            
            // هنا سنقوم بإضافة كود بناء الجدول في واجهة admin.html لاحقاً
        } catch (err) {
            console.error('[Module] Failed to load assessments:', err);
        }
    }
}

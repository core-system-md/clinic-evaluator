/**
 * CORE System — Admin Coordinator
 * المسؤول عن تنسيق الوحدات النمطية (Modules) في بيئة العمل الحالية
 */

class AdminDashboard {
    constructor() {
        this.supabase = window.supabaseClient;
        // الوحدات النمطية (Modules) تعمل في نفس المجلد الحالي
        this.assessmentManager = new AssessmentManager(this);
    }

    async init() {
        console.log('[CORE Admin] Initializing Dashboard...');
        if (!this.checkLogin()) {
            this.showLoginScreen();
            return;
        }
        
        // ربط الواجهات أو العمليات عند تحميل الصفحة
        await this.assessmentManager.init();
    }

    checkLogin() { return true; } // سيتم ربطها لاحقاً بالمصادقة
    showDashboard() { console.log('Dashboard active'); }
    showLoginScreen() { console.log('Show login screen'); }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
    window.adminDashboard.init();
});

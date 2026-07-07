// admin.js - النسخة المعدلة بالكامل لإدارة جلسة الدخول لمدة 24 ساعة وتفعيل زر الخروج
(function() {
    // دالة موحدة لإظهار لوحة التحكم وتشغيل مدير التقييمات
    function showDashboard() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardContent = document.getElementById('dashboard-content');
        
        if (loginScreen) {
            loginScreen.classList.add('hidden');
            loginScreen.style.display = 'none';
        }
        if (dashboardContent) {
            dashboardContent.classList.remove('hidden');
            dashboardContent.style.display = 'block';
        }
        
        // تشغيل مدير التقييمات الأصلي ديناميكياً
        if (typeof AssessmentManager !== 'undefined') {
            window.assessmentManager = new AssessmentManager({ supabase: window.supabaseClient });
            window.assessmentManager.init();
        } else if (window.AssessmentManager) {
            window.assessmentManager = new window.AssessmentManager({ supabase: window.supabaseClient });
            window.assessmentManager.init();
        }
    }

    // دالة الفحص الذكي لصلاحية الجلسة (24 ساعة)
    function checkSession() {
        const sessionTime = localStorage.getItem('core_admin_session');
        if (sessionTime) {
            const diff = Date.now() - parseInt(sessionTime, 10);
            const twentyFourHours = 24 * 60 * 60 * 1000; // 24 ساعة بالملي ثانية
            if (diff < twentyFourHours) {
                showDashboard();
                return true;
            }
        }
        return false;
    }

    function start() {
        // 1. فحص الجلسة تلقائياً عند تحميل الشاشة
        const hasActiveSession = checkSession();

        // 2. إدارة عملية الدخول وحفظ الجلسة سحابياً ومحلياً
        const loginForm = document.getElementById('login-form');
        const passwordInput = document.getElementById('login-password');

        if (loginForm && passwordInput) {
            loginForm.onsubmit = function(e) {
                e.preventDefault();
                if (passwordInput.value === "admin") {
                    // حفظ وقت الدخول الفعلي في متصفح الهاتف
                    localStorage.setItem('core_admin_session', Date.now().toString());
                    showDashboard();
                } else {
                    const errorDiv = document.getElementById('login-error');
                    if (errorDiv) errorDiv.classList.remove('hidden');
                    else alert("كلمة المرور غير صحيحة");
                }
            };
        } else {
            // كود احتياطي متوافق مع الآلية القديمة للأزرار العامة
            const buttons = document.querySelectorAll('button');
            const inputs = document.querySelectorAll('input');
            if (buttons.length > 0 && !hasActiveSession) {
                buttons[0].onclick = function(e) {
                    e.preventDefault();
                    if (inputs.length > 0 && inputs[0].value === "admin") {
                        localStorage.setItem('core_admin_session', Date.now().toString());
                        showDashboard();
                    } else {
                        alert("كلمة المرور غير صحيحة");
                    }
                };
            }
        }

        // 3. تفعيل زر الخروج (🚪) المتاح في كود الـ HTML الأصلي للأمان
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.onclick = function(e) {
                e.preventDefault();
                localStorage.removeItem('core_admin_session'); // مسح الجلسة فوراً
                window.location.reload(); // إعادة تحميل الشاشة للقفل
            };
        }
    }
    window.addEventListener('load', start);
})();

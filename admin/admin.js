// admin.js - النسخة الهيكلية لإعادة التصميم والأزرار الأصلية
(function() {
    function start() {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');

        if (buttons.length > 0) {
            buttons[0].onclick = function(e) {
                e.preventDefault();
                if (inputs.length > 0 && inputs[0].value === "admin") {
                    
                    // 1. جلب شاشة الدخول وشاشة لوحة التحكم المبرمجة في الـ HTML
                    const loginScreen = document.getElementById('login-screen');
                    const dashboardContent = document.getElementById('dashboard-content');
                    
                    // 2. التنقل الذكي: إخفاء صندوق الدخول وإظهار التصميم الكامل والأزرار دون مسحها
                    if (loginScreen) {
                        loginScreen.classList.add('hidden');
                        loginScreen.style.display = 'none';
                    }
                    if (dashboardContent) {
                        dashboardContent.classList.remove('hidden');
                        dashboardContent.style.display = 'block';
                    }
                    
                    // 3. تشغيل مدير التقييمات ليقوم بحقن الجدول داخل التصميم المخصص له
                    if (typeof AssessmentManager !== 'undefined') {
                        window.assessmentManager = new AssessmentManager({ supabase: window.supabaseClient });
                        window.assessmentManager.init();
                    } else if (window.AssessmentManager) {
                        window.assessmentManager = new window.AssessmentManager({ supabase: window.supabaseClient });
                        window.assessmentManager.init();
                    }
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            };
        }
    }
    window.addEventListener('load', start);
})();

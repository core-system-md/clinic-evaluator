// admin.js - النسخة الكاملة الجاهزة للنسخ واللصق المشترك
(function() {
    function start() {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');

        if (buttons.length > 0) {
            buttons[0].onclick = function(e) {
                e.preventDefault();
                if (inputs.length > 0 && inputs[0].value === "admin") {
                    // 1. إظهار واجهة التحميل المبدئية كما هي في الكود الأصلي الخاص بك
                    document.body.innerHTML = '<div style="padding:20px;"><h1>لوحة التحكم</h1><div id="assessments-table-container">جاري التحميل والربط بالسيرفر...</div></div>';
                    
                    // 2. تفعيل مدير التقييمات تلقائياً وربطه بقائمة مفاتيح السيرفر النشطة
                    if (typeof AssessmentManager !== 'undefined') {
                        window.assessmentManager = new AssessmentManager({ supabase: window.supabaseClient });
                        window.assessmentManager.init();
                    } else if (window.AssessmentManager) {
                        window.assessmentManager = new window.AssessmentManager({ supabase: window.supabaseClient });
                        window.assessmentManager.init();
                    } else {
                        document.getElementById('assessments-table-container').innerHTML = 
                            '<p style="color:red; padding:10px;">خطأ فني: لم يتم التعرف على ملف مدير التقييمات (AssessmentManager). تأكد من تحديث ورفع الملف الآخر.</p>';
                    }
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            };
        }
    }
    window.addEventListener('load', start);
})();

// admin.js - النسخة النهائية المصححة (ربط وتفعيل فقط)
(function() {
    function start() {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');

        if (buttons.length > 0) {
            buttons[0].onclick = function(e) {
                e.preventDefault();
                if (inputs.length > 0 && inputs[0].value === "admin") {
                    // 1. مسح الشاشة وكتابة العبارة التمهيدية كما هي في كودك الأصلي
                    document.body.innerHTML = '<div style="padding:20px;"><h1>لوحة التحكم</h1><div id="assessments-table-container">جاري التحميل...</div></div>';
                    
                    // 2. خطوة الربط الحاسمة: تفعيل المدير وتزويده بمفاتيح السيرفر النشطة فوراً
                    if (!window.assessmentManager && window.AssessmentManager) {
                        window.assessmentManager = new window.AssessmentManager({ supabase: window.supabaseClient });
                    }
                    
                    // 3. إطلاق أمر جلب البيانات
                    if (window.assessmentManager) window.assessmentManager.init();
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            };
        }
    }
    window.addEventListener('load', start);
})();

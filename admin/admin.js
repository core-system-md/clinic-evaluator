(function() {
    function start() {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');

        if (buttons.length > 0) {
            buttons[0].onclick = function(e) {
                e.preventDefault();
                if (inputs.length > 0 && inputs[0].value === "admin") {
                    document.body.innerHTML = '<div style="padding:20px;"><h1>لوحة التحكم</h1><div id="assessments-table-container">جاري تحميل البيانات...</div></div>';
                    
                    // محاولة تشغيل المدير مع مراقب خطأ
                    try {
                        if (window.assessmentManager) {
                            window.assessmentManager.init();
                            // كشف الفشل الصامت: إذا بقيت الرسالة بعد 5 ثواني
                            setTimeout(() => {
                                const container = document.getElementById('assessments-table-container');
                                if (container && container.innerText === "جاري تحميل البيانات...") {
                                    container.innerText = "خطأ: فشل الاتصال بقاعدة البيانات. تأكد من إعدادات Supabase.";
                                }
                            }, 5000);
                        } else {
                            document.getElementById('assessments-table-container').innerText = "خطأ: لم يتم العثور على ملف assessment-manager.js";
                        }
                    } catch (err) {
                        document.getElementById('assessments-table-container').innerText = "خطأ تقني: " + err.message;
                    }
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            };
        }
    }
    window.addEventListener('load', start);
})();

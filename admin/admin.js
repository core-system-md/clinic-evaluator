// admin.js - النسخة النهائية
(function() {
    function start() {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');

        if (buttons.length > 0) {
            buttons[0].onclick = function(e) {
                e.preventDefault();
                if (inputs.length > 0 && inputs[0].value === "admin") {
                    document.body.innerHTML = '<div style="padding:20px;"><h1>لوحة التحكم</h1><div id="assessments-table-container">جاري التحميل...</div></div>';
                    if (window.assessmentManager) window.assessmentManager.init();
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            };
        }
    }
    window.addEventListener('load', start);
})();

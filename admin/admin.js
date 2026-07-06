(function() {
    function start() {
        const btn = document.querySelector('button');
        const input = document.querySelector('input');
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                if (input && input.value === "admin") {
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

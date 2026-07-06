/**
 * CORE System - Admin Manager (v3.0)
 */
(function() {
    function initAdmin() {
        console.log("Admin System Loading...");
        const loginBtn = document.querySelector('button');
        const passInput = document.querySelector('input');

        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log("Button Clicked");
                if (passInput && passInput.value === "admin") {
                    document.body.innerHTML = `
                        <div style="padding:20px;">
                            <h1>لوحة التحكم</h1>
                            <div id="assessments-table-container">جاري تحميل البيانات...</div>
                        </div>
                    `;
                    if (window.assessmentManager) {
                        window.assessmentManager.init();
                    }
                } else {
                    alert("كلمة المرور غير صحيحة");
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdmin);
    } else {
        initAdmin();
    }
})();

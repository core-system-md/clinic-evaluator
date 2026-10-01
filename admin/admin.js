// Admin Dashboard bootstrap — real Supabase Auth + admin_users authorization.
(function () {
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

    if (typeof AssessmentManager !== 'undefined') {
      window.assessmentManager = new AssessmentManager({ supabase: window.supabaseClient });
      window.assessmentManager.init().catch((error) => {
        console.error('[Admin] Dashboard initialization failed:', error);
      });
    }
  }

  function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      loginScreen.style.display = 'flex';
    }
    if (dashboardContent) {
      dashboardContent.classList.add('hidden');
      dashboardContent.style.display = 'none';
    }
  }

  async function start() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorDiv = document.getElementById('login-error');
    const logoutBtn = document.getElementById('btn-logout');
    const forgotBtn = document.getElementById('btn-forgot-password');

    const authorizedSession = await window.AdminSession.init();
    if (authorizedSession) {
      showDashboard();
    } else {
      showLogin();
    }

    if (loginForm && emailInput && passwordInput) {
      loginForm.onsubmit = async function (e) {
        e.preventDefault();
        errorDiv?.classList.add('hidden');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const result = await window.AdminSession.signIn(email, password);
        if (result.success) {
          passwordInput.value = '';
          showDashboard();
        } else if (errorDiv) {
          errorDiv.textContent = result.message || 'تعذر تسجيل الدخول.';
          errorDiv.classList.remove('hidden');
        }
      };
    }

    if (forgotBtn) {
      forgotBtn.onclick = async function () {
        const email = emailInput.value.trim();
        if (!email) {
          if (errorDiv) {
            errorDiv.textContent = 'أدخل بريد الحساب أولًا ثم اضغط استرجاع كلمة المرور.';
            errorDiv.classList.remove('hidden');
          }
          emailInput.focus();
          return;
        }
        forgotBtn.disabled = true;
        forgotBtn.textContent = 'جاري إرسال رابط الاسترجاع...';
        const result = await window.AdminSession.requestPasswordReset(email);
        if (errorDiv) {
          errorDiv.textContent = result.success
            ? 'إذا كان البريد مسجلاً، فسيصلك رابط استرجاع كلمة المرور. تحقق من البريد والرسائل غير المرغوب فيها.'
            : (result.message || 'تعذر إرسال رابط الاسترجاع.');
          errorDiv.classList.remove('hidden');
          errorDiv.style.color = result.success ? '#166534' : '#dc2626';
          errorDiv.style.background = result.success ? '#f0fdf4' : '#fef2f2';
        }
        forgotBtn.disabled = false;
        forgotBtn.textContent = 'نسيت كلمة المرور؟ إرسال رابط استرجاع';
      };
    }

    if (logoutBtn) {
      logoutBtn.onclick = async function (e) {
        e.preventDefault();
        await window.AdminSession.signOut();
        window.location.reload();
      };
    }

    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.onclick = () => window.location.reload();
    }
  }

  window.addEventListener('load', start);
})();
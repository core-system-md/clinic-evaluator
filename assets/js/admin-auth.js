/**
 * Clinic Evaluator — Assessment Authentication System
 * Version: 2.0.0
 * Updated: Uses Edge Function (no exposed Service Role Key)
 */

class AssessmentAuth {
  constructor() {
    this.currentUser = null;
    this.assessmentKey = null;
    this.isEnabled = false;
    this.edgeUrl = 'https://oaqpzaarppccbnepffxx.supabase.co/functions/v1/admin-auth';
  }

  async init(assessmentKey) {
    this.assessmentKey = assessmentKey;
    await this.checkAuthStatus();
    if (this.isEnabled) {
      return await this.showLoginModal();
    }
    return { success: true };
  }

  async checkAuthStatus() {
    try {
      const res = await fetch(this.edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_auth_status', data: { assessment_key: this.assessmentKey } })
      });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        this.isEnabled = json.data[0].auth_enabled;
      } else {
        this.isEnabled = false;
      }
    } catch (err) {
      console.warn('[Auth] Could not check auth status:', err);
      this.isEnabled = false;
    }
  }

  async showLoginModal() {
    return new Promise((resolve) => {
      let modal = document.getElementById('auth-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
              <h3>🔐 تسجيل الدخول</h3>
            </div>
            <div class="modal-body">
              <p style="color: #6b7280; margin-bottom: 16px; text-align: center;">
                هذا التقييم محمي. يرجى إدخال بيانات الدخول.
              </p>
              <form id="auth-form">
                <div class="form-group">
                  <label>اسم المستخدم</label>
                  <input type="text" id="auth-username" required autofocus>
                </div>
                <div class="form-group">
                  <label>كلمة المرور</label>
                  <input type="password" id="auth-password" required>
                </div>
                <div class="form-actions" style="justify-content: center;">
                  <button type="submit" class="btn-primary" style="width: 100%;">دخول</button>
                </div>
              </form>
              <div id="auth-error" style="color: #dc2626; text-align: center; margin-top: 12px; display: none; font-weight: 600;"></div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            // Don't close — force login
          }
        });
      }

      const form = document.getElementById('auth-form');
      const errorDiv = document.getElementById('auth-error');

      form.onsubmit = async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';

        const username = document.getElementById('auth-username').value.trim();
        const password = document.getElementById('auth-password').value;

        const result = await this.authenticate(username, password);

        if (result.success) {
          modal.remove();
          resolve({ success: true, user: result.user });
        } else {
          errorDiv.textContent = result.message || 'بيانات الدخول غير صحيحة';
          errorDiv.style.display = 'block';
        }
      };

      modal.classList.remove('hidden');
      document.getElementById('auth-username')?.focus();
    });
  }

  async authenticate(username, password) {
    try {
      const res = await fetch(this.edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assessment_auth',
          data: { username, password, assessment_key: this.assessmentKey }
        })
      });
      const json = await res.json();
      
      if (!res.ok || json.error) {
        return { success: false, message: json.error || 'بيانات الدخول غير صحيحة' };
      }

      this.currentUser = json.data.user;
      sessionStorage.setItem('assessment_auth_' + this.assessmentKey, JSON.stringify({
        userId: this.currentUser.id,
        username: this.currentUser.username,
        timestamp: Date.now()
      }));

      return { success: true, user: this.currentUser };

    } catch (err) {
      console.error('[Auth] Authentication error:', err);
      return { success: false, message: 'خطأ في الاتصال' };
    }
  }

  async checkExistingSession() {
    const session = sessionStorage.getItem('assessment_auth_' + this.assessmentKey);
    if (!session) return false;
    try {
      const data = JSON.parse(session);
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem('assessment_auth_' + this.assessmentKey);
        return false;
      }
      this.currentUser = { id: data.userId, username: data.username };
      return true;
    } catch {
      return false;
    }
  }

  logout() {
    sessionStorage.removeItem('assessment_auth_' + this.assessmentKey);
    this.currentUser = null;
  }
}

window.AssessmentAuth = AssessmentAuth;

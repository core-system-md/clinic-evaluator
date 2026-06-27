/**
 * Clinic Evaluator — Admin Authentication System
 * Version: 1.0.0
 * Status: Ready but inactive (AUTH_ENABLED = false)
 * 
 * This file handles user authentication for protected assessments.
 * When AUTH_ENABLED is set to true, assessments will require login.
 */

class AssessmentAuth {
  constructor() {
    this.supabase = window.supabaseClient;
    this.currentUser = null;
    this.assessmentKey = null;
    this.isEnabled = false;
  }

  async init(assessmentKey) {
    this.assessmentKey = assessmentKey;

    // Check if auth is enabled for this assessment
    await this.checkAuthStatus();

    if (this.isEnabled) {
      // Show login modal before allowing access
      return await this.showLoginModal();
    }

    // Auth not enabled - allow direct access
    return { success: true };
  }

  async checkAuthStatus() {
    if (!this.supabase) {
      this.isEnabled = false;
      return;
    }

    try {
      const settings = await this.supabase.select('assessment_settings', {
        filter: { assessment_key: this.assessmentKey }
      });

      if (settings && settings.length > 0) {
        this.isEnabled = settings[0].auth_enabled;
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
      // Create modal if not exists
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
              <p style="color: var(--text-muted); margin-bottom: 16px; text-align: center;">
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
              <div id="auth-error" style="color: var(--danger); text-align: center; margin-top: 12px; display: none;"></div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            // Don't close - force login
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

      // Show modal
      modal.classList.remove('hidden');
      document.getElementById('auth-username')?.focus();
    });
  }

  async authenticate(username, password) {
    if (!this.supabase) {
      return { success: false, message: 'نظام المصادقة غير متاح' };
    }

    try {
      // Hash password
      const passwordHash = await this.simpleHash(password);

      // Find user
      const users = await this.supabase.select('assessment_users', {
        filter: { 
          assessment_key: this.assessmentKey,
          username: username
        }
      });

      if (!users || users.length === 0) {
        return { success: false, message: 'اسم المستخدم غير موجود' };
      }

      const user = users[0];

      // Check password
      if (user.password_hash !== passwordHash) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }

      // Check if active
      if (!user.active) {
        return { success: false, message: 'الحساب معطل' };
      }

      // Check uses
      if (user.used_count >= user.max_uses) {
        return { success: false, message: 'تم استنفاد عدد الاستخدامات المسموح بها' };
      }

      // Check expiry
      if (user.expires_at && new Date(user.expires_at) < new Date()) {
        return { success: false, message: 'انتهت صلاحية الحساب' };
      }

      // Increment used_count
      await this.supabase.update('assessment_users', {
        used_count: user.used_count + 1
      }, { id: user.id });

      // Store current user
      this.currentUser = {
        id: user.id,
        username: user.username,
        assessment_key: user.assessment_key
      };

      // Store in session
      sessionStorage.setItem('assessment_auth_' + this.assessmentKey, JSON.stringify({
        userId: user.id,
        username: user.username,
        timestamp: Date.now()
      }));

      return { success: true, user: this.currentUser };

    } catch (err) {
      console.error('[Auth] Authentication error:', err);
      return { success: false, message: 'خطأ في المصادقة' };
    }
  }

  async checkExistingSession() {
    const session = sessionStorage.getItem('assessment_auth_' + this.assessmentKey);
    if (!session) return false;

    try {
      const data = JSON.parse(session);
      // Session valid for 24 hours
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

  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export for use in app.js
window.AssessmentAuth = AssessmentAuth;

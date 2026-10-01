/**
 * Clinic Evaluator — Admin Session
 * Real Supabase Auth + public.admin_users authorization.
 */
(function () {
  const SUPABASE_URL = 'https://oaqpzaarppccbnepffxx.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ5NTMsImV4cCI6MjA5NjA5MDk1M30.quCL_HfvUiLYKkp5yTipdafPQ3ktRZNgDD1XDd4PHaF';
  const STORAGE_KEY = 'core_admin_auth_session';

  class AdminSession {
    constructor() { this.session = null; this.user = null; this.role = null; }

    async init() {
      const stored = this.readStoredSession();
      if (!stored) return false;
      let session = stored;
      if (this.isExpired(session)) session = await this.refresh(session.refresh_token);
      if (!session) { this.clear(); return false; }
      if (!(await this.applyAndVerify(session))) { this.clear(); return false; }
      return true;
    }

    async signIn(email, password) {
      const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.access_token || !json.refresh_token || !json.user?.id) {
        return { success: false, message: this.authMessage(json) };
      }

      const session = {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        expires_at: Date.now() + ((json.expires_in || 3600) * 1000) - 30000,
        user: json.user
      };

      if (!(await this.applyAndVerify(session))) {
        this.clear();
        return { success: false, message: 'الحساب صحيح، لكنه غير مخول للوصول إلى لوحة الإدارة.' };
      }
      return { success: true, user: this.user, role: this.role };
    }

    async applyAndVerify(session) {
      const userId = session.user?.id;
      if (!userId || !session.access_token) return false;

      const url = SUPABASE_URL + '/rest/v1/admin_users?select=user_id,role,active&user_id=eq.' +
        encodeURIComponent(userId) + '&active=eq.true';
      const response = await fetch(url, {
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + session.access_token }
      });
      if (!response.ok) return false;

      const rows = await response.json();
      const admin = rows?.[0];
      if (!admin || !['owner', 'admin'].includes(admin.role)) return false;

      this.session = session;
      this.user = session.user;
      this.role = admin.role;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      if (window.supabaseClient?.setAuthToken) {
        window.supabaseClient.setAuthToken(session.access_token);
      } else if (window.supabaseClient) {
        window.supabaseClient.headers.Authorization = 'Bearer ' + session.access_token;
      }
      return true;
    }

    async refresh(refreshToken) {
      if (!refreshToken) return null;
      const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.access_token || !json.refresh_token) return null;
      return {
        access_token: json.access_token,
        refresh_token: json.refresh_token,
        expires_at: Date.now() + ((json.expires_in || 3600) * 1000) - 30000,
        user: json.user || this.readStoredSession()?.user
      };
    }

    async requestPasswordReset(email) {
      const response = await fetch(SUPABASE_URL + '/auth/v1/recover', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirect_to: window.location.origin + '/admin/'
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: this.authMessage(json) };
      }
      return { success: true };
    }

    async signOut() {
      const token = this.session?.access_token;
      if (token) {
        await fetch(SUPABASE_URL + '/auth/v1/logout', {
          method: 'POST',
          headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
        }).catch(() => {});
      }
      this.clear();
    }

    clear() {
      sessionStorage.removeItem(STORAGE_KEY);
      this.session = null; this.user = null; this.role = null;
      if (window.supabaseClient?.clearAuthToken) window.supabaseClient.clearAuthToken();
    }

    readStoredSession() {
      try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); }
      catch { return null; }
    }

    isExpired(session) {
      return !session?.expires_at || Date.now() >= Number(session.expires_at);
    }

    authMessage(json) {
      const message = String(json?.error_description || json?.msg || json?.message || '').toLowerCase();
      if (message.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      if (message.includes('email not confirmed')) return 'يجب تأكيد البريد الإلكتروني أولاً.';
      if (message.includes('email rate limit exceeded')) return 'تم طلب الاسترجاع مؤخرًا. انتظر قليلًا ثم حاول مرة أخرى.';
      return 'تعذر تسجيل الدخول. تحقق من بيانات الحساب ثم حاول مرة أخرى.';
    }
  }

  window.AdminSession = new AdminSession();
})();
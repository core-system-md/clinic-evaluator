/**
 * ============================================================
 * Supabase Client — supabase-client.js
 * Database connection for Clinic Evaluator
 * Separated from engine.js per Blueprint v3.0
 * ============================================================
 * NOTE: Credentials will be moved to Cloudflare Secrets later
 * ============================================================
 */

const SUPABASE_URL = 'https://oaqpzaarppccbnepffxx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ5NTMsImV4cCI6MjA5NjA5MDk1M30.quCL_HfvUiLYKkp5yTipdafPQ3ktRZNgDD1XDd4PHfA';

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async insert(table, data) {
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase insert failed: ${res.status} - ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[Supabase] Insert error:', err);
      throw err;
    }
  }

  async select(table, columns = '*', filters = {}) {
    try {
      let url = `${this.url}/rest/v1/${table}?select=${columns}`;
      for (const [key, val] of Object.entries(filters)) {
        url += `&${key}=eq.${encodeURIComponent(val)}`;
      }
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase select failed: ${res.status} - ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[Supabase] Select error:', err);
      throw err;
    }
  }

  async upsert(table, data, onConflict = 'id') {
    try {
      const res = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.headers, 'Prefer': `resolution=merge-duplicates,return=representation` },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase upsert failed: ${res.status} - ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[Supabase] Upsert error:', err);
      throw err;
    }
  }
}

// Initialize global instance
window.supabaseClient = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);
console.log('[supabase-client.js] ✅ Initialized');

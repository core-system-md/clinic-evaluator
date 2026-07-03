/**
 * ============================================================
 * Centralized Supabase Client — supabase-client.js v2.0
 * CORE SYSTEM — التحديث الأمني وعزل صلاحيات النفاذ
 * ============================================================
 */

class SupabaseClient {
  constructor(useServiceRole = false) {
    this.url = 'https://oaqpzaarppccbnepffxx.supabase.co';

    // المفتاح العام (Anon Key) - آمن للنشر في متصفحات المرضى ويسمح بالإدخال فقط
    this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ5NTMsImV4cCI6MjA5NjA5MDk1M30.quCL_HfvUiLYKkp5yTipdafPQ3ktRZNgDD1XDd4PHfA';

    // في حال استدعاء العميل من لوحة الإدارة، يتم تمرير مفتاح التحكم المطلق المعزول ديناميكياً
    this.key = useServiceRole && window.adminServiceKey ? window.adminServiceKey : this.anonKey;

    this.headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase Error: ${response.status} - ${errText}`);
    }

    if (options.method === 'HEAD') return response;
    return await response.json();
  }

  async insert(table, data) {
    return this.request(table, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async select(table, options = {}) {
    let endpoint = table;
    const params = new URLSearchParams();

    if (options.columns) {
      params.append('select', options.columns);
    } else {
      params.append('select', '*');
    }

    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
    }

    if (options.order) {
      params.append('order', `${options.order.column}.${options.order.direction}`);
    }

    if (options.limit) {
      params.append('limit', options.limit);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    return this.request(endpoint, { method: 'GET' });
  }

  async update(table, data, filter) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });

    return this.request(`${table}?${params.toString()}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async upsert(table, data, conflictColumn) {
    const params = new URLSearchParams();
    if (conflictColumn) {
      params.append('on_conflict', conflictColumn);
    }
    const url = params.toString() ? `${table}?${params.toString()}` : table;
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    });
  }

  async delete(table, filter) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });

    return this.request(`${table}?${params.toString()}`, { method: 'DELETE' });
  }

  async count(table, filter = {}) {
    const params = new URLSearchParams();
    params.append('select', '*');
    Object.entries(filter).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });

    const response = await this.request(`${table}?${params.toString()}`, {
      method: 'HEAD',
      headers: { 'Prefer': 'count=exact' }
    });

    const range = response.headers.get('content-range');
    return parseInt(range?.split('/')[1] || '0');
  }
}

// إنشاء النسخة التلقائية لصفحات التقييم العامة للعيادات
window.supabaseClient = new SupabaseClient(false);

/**
 * Supabase Client — Clinic Evaluator
 * Project: oaqpzaarppccbnepffxx
 * Version: 1.1.0 (Added Service Role Key support for Admin Dashboard)
 * 
 * NOTE: Service Role Key is ONLY used in admin.html for dashboard functionality.
 * Assessment pages (patient-journey.html, clinic-performance.html) continue using Anon Key.
 */

class SupabaseClient {
  constructor(useServiceRole = false) {
    this.url = 'https://oaqpzaarppccbnepffxx.supabase.co';

    // Anon Key — used for assessment submissions (public)
    this.anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ5NTMsImV4cCI6MjA5NjA5MDk1M30.quCL_HfvUiLYKkp5yTipdafPQ3ktRZNgDD1XDd4PHfA';

    // Service Role Key — used ONLY for admin dashboard (private)
    this.serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXB6YWFycHBjY2JuZXBmZnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDUxNDk1MywiZXhwIjoyMDk2MDkwOTUzfQ.m2hy7TtZgSjJ4NfI4gDSQqrexi4Y9RJ1Otp05ZL5TS4';

    // Use Service Role Key only when explicitly requested (admin dashboard)
    this.key = useServiceRole ? this.serviceKey : this.anonKey;

    this.headers = {
      'apikey': this.key,
      'Authorization': 'Bearer ' + this.key,
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
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Supabase Error:', error);
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async insert(table, data) {
    return this.request(table, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async select(table, options = {}) {
    const params = new URLSearchParams();
    if (options.columns) params.append('select', options.columns);
    else params.append('select', '*');

    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
    }

    if (options.order) {
      params.append('order', `${options.order.column}.${options.order.direction || 'desc'}`);
    }

    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    return this.request(`${table}?${params.toString()}`, { method: 'GET' });
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

    const response = await fetch(`${this.url}/rest/v1/${table}?${params.toString()}`, {
      method: 'HEAD',
      headers: this.headers
    });

    return parseInt(response.headers.get('content-range')?.split('/')[1] || '0');
  }
}

// Default instance uses Anon Key (for assessment pages)
window.supabaseClient = new SupabaseClient(false);

// Export class for admin dashboard to create Service Role instance
window.SupabaseClient = SupabaseClient;

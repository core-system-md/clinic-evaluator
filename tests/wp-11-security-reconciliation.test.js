const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20261018120000_wp11_security_database_reconciliation.sql",
);
const harnessPath = path.join(__dirname, "wp-11-security-reconciliation-harness.sql");
const migration = fs.readFileSync(migrationPath, "utf8");
const harness = fs.readFileSync(harnessPath, "utf8");

test("WP-11 migration bounds excess admin table privileges without reducing approved SELECT", () => {
  assert.match(
    migration,
    /revoke\s+maintain\s*,\s*references\s*,\s*trigger\s*,\s*truncate\s+on table public\.admin_audit_log, public\.admin_capabilities\s+from authenticated/i,
  );
  assert.match(migration, /service_role privileges are intentionally unchanged/i);
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+table\s+public\.admin_audit_log/i);
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+table\s+public\.admin_capabilities/i);
});

test("WP-11 RLS policies bind identity checks to the current authenticated user", () => {
  const identityPolicies = [
    "admin_users_delete_owner_admins",
    "admin_users_insert_owner",
    "admin_users_select_self_or_admin",
    "admin_users_update_owner",
    "p0_admin_select_admin_users",
  ];
  for (const policy of identityPolicies) {
    assert.match(migration, new RegExp(`drop policy ${policy} on public\\.admin_users`, "i"));
  }

  for (const table of [
    "assessment_settings",
    "assessment_types",
    "axes",
    "questions",
    "options",
    "leads",
    "scores",
    "answers",
  ]) {
    assert.match(
      migration,
      new RegExp(`p0_admin_select_${table} on public\\.${table} for select to authenticated using \\(public\\.is_active_admin\\(\\)\\)`, "i"),
    );
  }

  assert.match(
    migration,
    /revoke all on function public\.is_active_admin\(uuid\) from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.is_owner\(uuid\) from public, anon, authenticated/i,
  );
  assert.doesNotMatch(migration, /revoke all on function public\.is_active_admin\(\) from/i);
  assert.doesNotMatch(migration, /revoke all on function public\.is_owner\(\) from/i);
});

test("WP-11 migration fails closed on missing expected schema objects or policies", () => {
  assert.match(migration, /to_regprocedure\('public\.is_active_admin\(uuid\)'\)/i);
  assert.match(migration, /to_regprocedure\('public\.is_owner\(uuid\)'\)/i);
  assert.match(migration, /expected 13 known admin identity policies/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
});

test("WP-11 SQL harness asserts actual privileges, direct probe denial, and RLS behavior", () => {
  assert.match(harness, /\i supabase\/migrations\/20261018120000_wp11_security_database_reconciliation\.sql/i);
  assert.match(harness, /has_table_privilege\('authenticated'.*'MAINTAIN'\)/i);
  assert.match(harness, /has_function_privilege\('authenticated', 'public\.is_owner\(uuid\)', 'EXECUTE'\)/i);
  assert.match(harness, /wp11_owner_visible_rows = 3/i);
  assert.match(harness, /wp11_staff_visible_rows = 1/i);
  assert.match(harness, /identity_probe_rejected/i);
  assert.match(harness, /disposable PostgreSQL/i);
});

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
const manager = fs.readFileSync(path.join(__dirname, "..", "admin", "assessment-manager.js"), "utf8");
const lifecycle = fs.readFileSync(path.join(__dirname, "..", "admin", "assessment-lifecycle.js"), "utf8");
const workspace = fs.readFileSync(path.join(__dirname, "..", "admin", "assessment-editor-workspace.js"), "utf8");
const adminHtml = fs.readFileSync(path.join(__dirname, "..", "admin", "admin.html"), "utf8");

test("WP-11 migration bounds excess admin table privileges without reducing approved SELECT", () => {
  assert.match(
    migration,
    /revoke\s+maintain\s*,\s*references\s*,\s*trigger\s*,\s*truncate\s+on table public\.admin_audit_log, public\.admin_capabilities\s+from authenticated/i,
  );
  assert.match(migration, /service_role privileges are intentionally unchanged/i);
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+table\s+public\.admin_audit_log/i);
  assert.doesNotMatch(migration, /revoke\s+all\s+on\s+table\s+public\.admin_capabilities/i);
  assert.doesNotMatch(migration, /alter\s+default\s+privileges/i);
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
    assert.ok(
      migration.includes(`('${table}','p0_admin_select_${table}')`),
      `preflight must enumerate the expected policy for ${table}`,
    );
  }

  assert.match(
    migration,
    /create policy p0_admin_select_%I on public\.%I for select to authenticated using \(public\.is_active_admin\(\)\)/i,
  );
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
  assert.match(migration, /expected RLS enabled on 11 protected tables/i);
  assert.match(migration, /c\.relrowsecurity/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
});

test("WP-11 SQL harness asserts actual privileges, direct probe denial, and RLS behavior", () => {
  assert.ok(
    harness.includes("\\i supabase/migrations/20261018120000_wp11_security_database_reconciliation.sql"),
    "the disposable harness must apply the exact candidate migration",
  );
  assert.match(harness, /has_table_privilege\('authenticated'/i);
  assert.match(harness, /'MAINTAIN'/i);
  assert.match(harness, /has_function_privilege\('authenticated', 'public\.is_owner\(uuid\)', 'EXECUTE'\)/i);
  assert.match(harness, /wp11_owner_visible_rows = 3/i);
  assert.match(harness, /wp11_staff_visible_rows = 1/i);
  for (const table of [
    "answers",
    "assessment_settings",
    "assessment_types",
    "axes",
    "leads",
    "options",
    "questions",
    "scores",
  ]) {
    assert.ok(harness.includes(`wp11_owner_${table}`), `owner RLS check missing for ${table}`);
    assert.ok(harness.includes(`wp11_staff_${table}`), `staff RLS check missing for ${table}`);
    assert.match(harness, new RegExp(`wp11_staff_${table} = 0`, "i"));
  }
  assert.match(harness, /identity_probe_rejected/i);
  assert.match(harness, /disposable PostgreSQL/i);
});

test("WP-11 D-12 database path keeps the active editor on its capability-guarded draft RPC", () => {
  assert.ok(adminHtml.indexOf("assessment-manager.js") < adminHtml.indexOf("assessment-lifecycle.js"));
  assert.ok(adminHtml.indexOf("assessment-lifecycle.js") < adminHtml.indexOf("assessment-editor-workspace.js"));
  assert.ok(workspace.includes("AssessmentManager.prototype.editAssessment = async function"));
  assert.ok(workspace.includes("window.assessmentManager.updateDraftOption"));
  assert.ok(lifecycle.includes("rpc/update_draft_option_secure"));
  assert.ok(!lifecycle.includes("rpc/update_option_secure"));
  assert.ok(!workspace.includes("rpc/update_option_secure"));
  // The old manager still contains a legacy handler; the active workspace path above
  // must not depend on granting authenticated EXECUTE to the legacy service-role-only RPC.
  assert.ok(manager.includes("rpc/update_option_secure"));
});

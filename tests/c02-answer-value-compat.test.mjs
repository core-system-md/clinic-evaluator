import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

test("C-02 adds 70 to the answer-value compatibility constraint without editing history", () => {
  const migrationPath = "supabase/migrations/20261013110000_c02_allow_answer_value_70.sql";
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /begin;/i);
  assert.match(sql, /answers_answer_value_compat_check/);
  assert.match(sql, /answer_value in \\(0, 1, 2, 3, 4, 5, 40, 70, 100\\)/i);
  assert.match(sql, /existing answers\\.answer_value contains values outside/i);
  assert.match(sql, /commit;/i);
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\\.answers/i);

  const priorMigration = fs.readFileSync(
    "supabase/migrations/20261001120000_protected_assessment_access_foundation.sql",
    "utf8",
  );
  assert.match(priorMigration, /answer_value in \\(0, 1, 2, 3, 4, 5, 40, 100\\)/i);
});

test("C-02 disposable PostgreSQL harness calls the actual save_assessment_answer RPC", () => {
  const harness = fs.readFileSync("tests/c02-answer-value-compat-harness.sql", "utf8");
  assert.match(harness, /\\\\i tests\\/p4-protected-function-harness\\.sql/);
  assert.match(harness, /\\\\i supabase\\/migrations\\/20261013110000_c02_allow_answer_value_70\\.sql/);
  assert.match(harness, /public\\.save_assessment_answer\\(/);
  assert.match(harness, /option_value=70/);
  assert.match(harness, /answer_value=70/);
  assert.match(harness, /check_violation/i);
  assert.match(harness, /option value 99/i);
});

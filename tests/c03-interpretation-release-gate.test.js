const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const test = require("node:test");

const ROOT = process.cwd();
const MIGRATION = path.join(ROOT, "supabase/migrations/20261014120000_c03_interpretation_release_publication_gate.sql");
const PUBLISH_MIGRATION = path.join(ROOT, "supabase/migrations/20261003175645_p5_p2_immutability_lifecycle_compat.sql");
const source = fs.readFileSync(MIGRATION, "utf8");
const publishSource = fs.readFileSync(PUBLISH_MIGRATION, "utf8");
const ENGINE = path.join(ROOT, "supabase/functions/assessment-access/engine.ts");
const engineSource = fs.readFileSync(ENGINE, "utf8");
const INDEX = path.join(ROOT, "supabase/functions/assessment-access/index.ts");
const indexSource = fs.readFileSync(INDEX, "utf8");

test("C-03 registers an owner-controlled release with source and runtime provenance", () => {
  assert.match(source, /register_assessment_interpretation_release_secure/);
  assert.match(source, /if not public\.is_owner\(\)/);
  assert.match(source, /registry_digest/);
  assert.match(source, /source_commit_sha/);
  assert.match(source, /edge_release_ref/);
  assert.match(source, /status not in/);
  assert.match(source, /assessment\.interpretation_release\.register/);
});

test("C-03 release manifest must cover each live option identity exactly once", () => {
  assert.match(source, /Option manifest must cover every option exactly once/);
  assert.match(source, /m\.option_id/);
  assert.match(source, /m\.option_index/);
  assert.match(source, /m\.source_option_value/);
  assert.match(source, /unknown or mismatched question\/option identities/);
});

test("C-03 publication and restoration are guarded through the shared validator", () => {
  assert.match(source, /interpretation_release_registered/);
  assert.match(source, /and v_release_valid/);
  assert.match(publishSource, /v_validation:=public\.validate_assessment_version_secure\(p_version_id\)/);
  assert.match(publishSource, /validation:=public\.validate_assessment_version_secure\(p_version_id\)/);
});

test("C-03 release registration cannot be called by public or anonymous clients", () => {
  assert.match(source, /revoke all on function public\.register_assessment_interpretation_release_secure\(uuid, integer, text, text, text, jsonb\) from public, anon/);
  assert.match(source, /grant execute on function public\.register_assessment_interpretation_release_secure\(uuid, integer, text, text, text, jsonb\) to authenticated/);
  assert.match(source, /assessment_interpretation_releases enable row level security/);
  assert.match(source, /revoke all on public\.assessment_interpretation_releases from public, anon, authenticated/);
});

test("C-03 runtime fails closed on release lookup errors and attests the selected registry", () => {
  assert.match(engineSource, /from\(["']assessment_interpretation_releases["']\)/);
  assert.match(engineSource, /assertInterpretationReleaseMatches/);
  assert.match(engineSource, /Interpretation release lookup failed/);
  assert.match(engineSource, /interpretationRegistryDigest/);
  assert.match(engineSource, /C03_SOURCE_COMMIT_SHA/);
  assert.equal((engineSource.match(/runtimeOptionManifest: buildRuntimeOptionManifest\(runtime\)/g) || []).length, 2);
  assert.match(engineSource, /question_code: questionCode/);
});

test("C-03 publication requires a runtime attestation from the Edge service role", () => {
  assert.match(source, /runtime_verified_at is not null/);
  assert.match(source, /runtime_verified_digest = r\.registry_digest/);
  assert.match(source, /runtime_verified_edge_release_ref = r\.edge_release_ref/);
  assert.match(source, /auth\.role\(\).*service_role/);
  assert.match(source, /grant execute on function public\.mark_assessment_interpretation_release_runtime_verified_secure\(uuid, text, text, text\)\s+to service_role/);
  assert.match(source, /runtime_verified_source_commit_sha = r\.source_commit_sha/);
  assert.match(source, /public\.write_admin_audit\([\s\S]*true,[\s\S]*null/);
});

test("C-03 Edge attestation action is owner-authorized and records runtime verification", () => {
  assert.match(indexSource, /action === "verify_interpretation_release"/);
  assert.match(indexSource, /isOwnerRequest\(req\)/);
  assert.match(indexSource, /attestInterpretationRelease\(supabase, assessmentTypeId\)/);
  assert.match(engineSource, /mark_assessment_interpretation_release_runtime_verified_secure/);
});

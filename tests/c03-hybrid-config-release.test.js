const fs = require("node:fs");
const assert = require("node:assert/strict");
const test = require("node:test");

const migration = fs.readFileSync(
  "supabase/migrations/20261015100000_c03_hybrid_config_release_gate.sql",
  "utf8",
);
const engine = fs.readFileSync("supabase/functions/assessment-access/engine.ts", "utf8");
const index = fs.readFileSync("supabase/functions/assessment-access/index.ts", "utf8");
const provenance = fs.readFileSync(
  "supabase/functions/assessment-access/interpretation-release-provenance.mjs",
  "utf8",
);

test("C-03 release registration is service-role-only and records the owner identity", () => {
  assert.match(migration, /auth\.role\(\).*service_role/);
  assert.match(migration, /p_registered_by uuid/);
  assert.match(migration, /role = 'owner'/);
  assert.match(migration, /assessment_config_digest/);
  assert.match(migration, /config_manifest/);
  assert.match(migration, /release_state = 'PREPARED'/);
});

test("C-03 runtime attestation binds Git registry, full config, Edge ref, and source SHA", () => {
  assert.match(engine, /getAssessmentConfigAttestation/);
  assert.match(engine, /digestAssessmentConfig\(versionedConfig\)/);
  assert.match(engine, /p_runtime_config_digest: verified\.assessmentConfigDigest/);
  assert.match(provenance, /runtimeConfigDigest/);
  assert.match(provenance, /runtimeConfigManifest/);
  assert.match(provenance, /source commit does not match this Edge runtime build/);
});

test("C-03 publish and restore validation require VERIFIED drift-free config", () => {
  assert.match(migration, /r\.release_state in \('VERIFIED', 'PUBLISHED'\)/);
  assert.match(migration, /r\.config_manifest = public\.assessment_config_manifest_secure\(v\.id\)/);
  assert.match(migration, /r\.runtime_verified_config_digest = r\.assessment_config_digest/);
  assert.match(migration, /trg_mark_assessment_configuration_release_published/);
  assert.match(migration, /Published releases are immutable; create a new assessment version/);
  assert.match(migration, /'REJECTED', 'DEGRADED'/);
});

test("C-03 release actions are owner-gated and never accept client-supplied digests", () => {
  assert.match(index, /action === "register_interpretation_release"/);
  assert.match(index, /action === "verify_interpretation_release"/);
  assert.match(index, /getOwnerUserId\(req\)/);
  assert.match(index, /registerInterpretationRelease\(supabase, assessmentTypeId, ownerId\)/);
  assert.match(index, /attestInterpretationRelease\(supabase, assessmentTypeId\)/);
});

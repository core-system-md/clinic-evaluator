const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const verifier = fs.readFileSync(
  'supabase/functions/assessment-config-release/index.ts',
  'utf8',
);
const engine = fs.readFileSync(
  'supabase/functions/assessment-access/engine.ts',
  'utf8',
);

test('C-03 release verifier requires authenticated owner before export or verification', () => {
  assert.match(verifier, /async function requireOwner\(/);
  assert.match(verifier, /userClient\.auth\.getUser/);
  assert.match(verifier, /userClient\.rpc\("is_owner"\)/);
  assert.ok(verifier.indexOf('const authorization = await requireOwner(req);') < verifier.indexOf('if (action === "export")'));
  assert.ok(verifier.indexOf('const authorization = await requireOwner(req);') < verifier.indexOf('if (action === "verify")'));
});

test('C-03 release verifier exports canonical config and attests live runtime evidence only', () => {
  assert.match(engine, /export async function computeAssessmentConfigReleaseEvidence\(/);
  assert.match(verifier, /canonicalConfig: evidence\.canonicalConfig/);
  assert.match(verifier, /verify_assessment_config_release_secure/);
  assert.match(verifier, /p_actual_config_digest: evidence\.configDigest/);
  assert.match(verifier, /p_actual_registry_digest: evidence\.interpretationRegistryDigest/);
  assert.match(verifier, /p_actual_family_id: evidence\.familyId/);
  assert.match(verifier, /p_actual_assessment_type_id: evidence\.assessmentTypeId/);
});

test('C-03 release verifier binds immutable build-time attestation and fails closed on blank metadata', () => {
  const attestation = fs.readFileSync(
    'supabase/functions/_shared/c03-runtime-attestation.ts',
    'utf8',
  );
  assert.ok(verifier.includes('import { C03_RUNTIME_ATTESTATION } from "../_shared/c03-runtime-attestation.ts"'));
  assert.match(verifier, /schemaVersion: C03_RUNTIME_ATTESTATION\.schemaVersion/);
  assert.match(verifier, /gitCommitSha: C03_RUNTIME_ATTESTATION\.gitCommitSha/);
  assert.match(verifier, /edgeReleaseRef: C03_RUNTIME_ATTESTATION\.edgeReleaseRef/);
  assert.match(verifier, /fixtureSetVersion: C03_RUNTIME_ATTESTATION\.fixtureSetVersion/);
  assert.match(verifier, /migrationContractVersion: C03_RUNTIME_ATTESTATION\.migrationContractVersion/);
  assert.match(verifier, /Object\.values\(runtimeMetadata\)\.some\(\(value\) => !value\.trim\(\)\)/);
  assert.match(verifier, /C-03 runtime release metadata is not configured/);
  assert.doesNotMatch(verifier, /Deno\.env\.get\("C03_(?:GIT_COMMIT_SHA|EDGE_RELEASE_REF|FIXTURE_SET_VERSION|MIGRATION_CONTRACT_VERSION)"\)/);
  assert.match(attestation, /gitCommitSha: ""/);
  assert.match(attestation, /edgeReleaseRef: ""/);
});

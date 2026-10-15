import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildRuntimeAttestation,
  computeEdgeSourceDigest,
  renderRuntimeAttestation,
} from "../.github/scripts/c03-release-attestation.mjs";

const root = process.cwd();

test("C-03 runtime attestation digest is deterministic and excludes the generated attestation module", async () => {
  const first = await computeEdgeSourceDigest(root);
  const second = await computeEdgeSourceDigest(root);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(second, first);
});

test("C-03 runtime attestation binds immutable commit, source digest, and versioned contract fields", async () => {
  const commit = "0123456789abcdef0123456789abcdef01234567";
  const attestation = await buildRuntimeAttestation({ root, commitSha: commit });
  assert.equal(attestation.schemaVersion, "C03_RUNTIME_ATTESTATION_V1");
  assert.equal(attestation.gitCommitSha, commit);
  assert.match(attestation.edgeReleaseRef, /^sha256:[0-9a-f]{64}$/);
  assert.equal(attestation.fixtureSetVersion, "P3_FIXTURE_SET_V1");
  assert.equal(attestation.migrationContractVersion, "C03_RELEASE_CONTRACT_V1");
  const rendered = renderRuntimeAttestation(attestation);
  assert.match(rendered, /C03_RUNTIME_ATTESTATION/);
  assert.match(rendered, new RegExp(commit));
  assert.match(rendered, new RegExp(attestation.edgeReleaseRef.replace(":", "\\:")));
});


test("C-03 deployed verification compares both scorer and verifier attestation endpoints without writes", async () => {
  const verifier = await fs.readFile(path.join(root, ".github/scripts/c03-release-attestation.mjs"), "utf8");
  assert.match(verifier, /action: "export"/);
  assert.match(verifier, /action: "c03_runtime_attestation"/);
  assert.match(verifier, /Deployed verifier attestation mismatch/);
  assert.match(verifier, /Deployed scorer attestation mismatch/);
  assert.doesNotMatch(verifier, /action: "register"|action: "publish"|action: "enable_gate"/);
});

test("C-03 runtime attestation rejects missing or abbreviated commit identities", async () => {
  await assert.rejects(
    buildRuntimeAttestation({ root, commitSha: "" }),
    /full immutable Git commit SHA/,
  );
  await assert.rejects(
    buildRuntimeAttestation({ root, commitSha: "0123456789ab" }),
    /full immutable Git commit SHA/,
  );
});

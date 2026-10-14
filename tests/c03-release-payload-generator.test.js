const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { generateReleasePayload, DEFAULT_EDGE_RELEASE_REF } = require("../.github/scripts/c03-generate-release-payload.cjs");

const ROOT = path.resolve(__dirname, "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/c03-release-snapshot.json"), "utf8"));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "tests/fixtures/c03-release-registry.json"), "utf8"));
const sourceCommitSha = "b".repeat(40);

test("C-03 generator emits deterministic RPC-compatible arguments and complete sorted option manifest", async () => {
  const first = await generateReleasePayload({ snapshot, registry, sourceCommitSha });
  const second = await generateReleasePayload({ snapshot, registry, sourceCommitSha });
  assert.deepEqual(first, second);
  assert.equal(first.rpc.function, "register_assessment_interpretation_release_secure");
  assert.deepEqual(Object.keys(first.rpc.args).sort(), [
    "p_assessment_type_id", "p_edge_release_ref", "p_interpretation_version",
    "p_option_manifest", "p_registry_digest", "p_source_commit_sha",
  ].sort());
  assert.equal(first.provenance.registry_digest, first.rpc.args.p_registry_digest);
  assert.match(first.rpc.args.p_registry_digest, /^[0-9a-f]{64}$/);
  assert.equal(first.rpc.args.p_source_commit_sha, sourceCommitSha);
  assert.equal(first.rpc.args.p_edge_release_ref, DEFAULT_EDGE_RELEASE_REF);
  assert.equal(first.rpc.args.p_option_manifest.length, 2);
  assert.deepEqual(first.rpc.args.p_option_manifest.map((row) => row.option_index), [0, 1]);
  assert.deepEqual(first.rpc.args.p_option_manifest.map((row) => row.option_id), [
    "ffffffff-ffff-4fff-8fff-ffffffffffff",
    "11111111-1111-4111-8111-111111111111",
  ]);
});

test("C-03 generator refuses an incomplete or mismatched option identity snapshot", async () => {
  const incomplete = structuredClone(snapshot);
  incomplete.questions[0].options.pop();
  await assert.rejects(
    generateReleasePayload({ snapshot: incomplete, registry, sourceCommitSha }),
    /do not exactly match/,
  );
});

test("C-03 generator refuses invalid provenance instead of inventing it", async () => {
  await assert.rejects(
    generateReleasePayload({ snapshot, registry, sourceCommitSha: "not-a-commit" }),
    /lowercase Git commit SHA/,
  );
  await assert.rejects(
    generateReleasePayload({ snapshot, registry, sourceCommitSha, edgeReleaseRef: "latest" }),
    /must match the Edge runtime constant/,
  );
});

const assert = require("node:assert/strict");
const test = require("node:test");

let provenance;

test.before(async () => {
  provenance = await import("../supabase/functions/assessment-access/interpretation-release-provenance.mjs");
});

const entries = [
  {
    assessmentSlug: "sample-assessment",
    questionCode: "Q1",
    optionId: "11111111-1111-4111-8111-111111111111",
    optionIndex: 0,
    sourceOptionValue: 0,
    interpretationVersion: 1,
    anchorScore: 0,
  },
  {
    assessmentSlug: "sample-assessment",
    questionCode: "Q1",
    optionId: "22222222-2222-4222-8222-222222222222",
    optionIndex: 1,
    sourceOptionValue: 40,
    interpretationVersion: 1,
    anchorScore: 40,
  },
];

function manifestFrom(entriesToUse) {
  return entriesToUse.map((entry) => ({
    question_code: entry.questionCode,
    option_id: entry.optionId,
    option_index: entry.optionIndex,
    source_option_value: entry.sourceOptionValue,
  }));
}

async function validRelease() {
  return {
    assessment_type_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    family_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    assessment_version: 1,
    interpretation_version: 1,
    registry_digest: await provenance.digestInterpretationEntries(entries),
    source_commit_sha: "c".repeat(40),
    edge_release_ref: "assessment-access-v-test",
    option_manifest: manifestFrom(entries),
  };
}

const expected = {
  assessmentTypeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  familyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  assessmentVersion: 1,
  interpretationVersion: 1,
  registryEntries: entries,
};

test("runtime release attestation accepts matching digest and exact manifest", async () => {
  const release = await validRelease();
  const result = await provenance.assertInterpretationReleaseMatches({ release, ...expected });
  assert.equal(result.registryDigest, release.registry_digest);
  assert.equal(result.sourceCommitSha, release.source_commit_sha);
  assert.equal(result.edgeReleaseRef, release.edge_release_ref);
});

test("runtime release attestation rejects a registered digest from another registry", async () => {
  const release = await validRelease();
  release.registry_digest = "0".repeat(64);
  await assert.rejects(
    provenance.assertInterpretationReleaseMatches({ release, ...expected }),
    /digest does not match/,
  );
});

test("runtime release attestation rejects incomplete or mismatched option coverage", async () => {
  const release = await validRelease();
  release.option_manifest = release.option_manifest.slice(0, 1);
  await assert.rejects(
    provenance.assertInterpretationReleaseMatches({ release, ...expected }),
    /does not exactly cover/,
  );
});

test("runtime release attestation rejects duplicate option identities", async () => {
  const release = await validRelease();
  release.option_manifest.push({ ...release.option_manifest[0] });
  await assert.rejects(
    provenance.assertInterpretationReleaseMatches({ release, ...expected }),
    /duplicate option identities/,
  );
});

test("runtime release attestation rejects assessment or interpretation version drift", async () => {
  const release = await validRelease();
  release.assessment_version = 2;
  await assert.rejects(
    provenance.assertInterpretationReleaseMatches({ release, ...expected }),
    /assessment version mismatch/,
  );
});

test("registry digest serialization is deterministic across object key order", async () => {
  const left = await provenance.digestInterpretationEntries([{ z: 1, a: { y: 2, x: 3 } }]);
  const right = await provenance.digestInterpretationEntries([{ a: { x: 3, y: 2 }, z: 1 }]);
  assert.equal(left, right);
});

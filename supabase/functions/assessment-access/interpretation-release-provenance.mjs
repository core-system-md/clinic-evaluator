/**
 * Runtime attestation for the interpretation registry selected by the scoring engine.
 * The digest covers the stable-serialized selected registry entries, preserving entry order.
 */

export const RUNTIME_EDGE_RELEASE_REF = "assessment-access-c03-registry-attestation-v1";

export function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(value[key]))
    .join(",") + "}";
}

export function selectInterpretationEntries(registry, assessmentSlug, interpretationVersion) {
  if (!registry || !Array.isArray(registry.entries)) {
    throw new Error("Interpretation registry entries are missing");
  }
  return registry.entries
    .filter((entry) => entry.assessmentSlug === assessmentSlug)
    .filter((entry) => Number(entry.interpretationVersion) === Number(interpretationVersion));
}

export async function digestInterpretationEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Cannot digest an empty interpretation registry selection");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableSerialize(entries)),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function registryLogicalIdentity(entry) {
  const identity = [
    entry.questionCode,
    Number(entry.optionIndex),
    Number(entry.sourceOptionValue),
  ];
  if (
    typeof identity[0] !== "string" || !identity[0] ||
    typeof entry.optionId !== "string" || !entry.optionId ||
    !Number.isInteger(identity[1]) || !Number.isFinite(identity[2])
  ) {
    throw new Error("Interpretation registry contains an invalid logical option identity");
  }
  return JSON.stringify(identity);
}

function manifestLogicalIdentity(entry) {
  const identity = [
    entry.question_code,
    Number(entry.option_index),
    Number(entry.source_option_value),
  ];
  if (
    typeof identity[0] !== "string" || !identity[0] ||
    !Number.isInteger(identity[1]) || !Number.isFinite(identity[2])
  ) {
    throw new Error("Registered option manifest contains an invalid logical option identity");
  }
  return JSON.stringify(identity);
}

function manifestIdentity(entry) {
  const identity = [
    entry.question_code,
    entry.option_id,
    Number(entry.option_index),
    Number(entry.source_option_value),
  ];
  if (
    typeof identity[0] !== "string" || !identity[0] ||
    typeof identity[1] !== "string" || !identity[1] ||
    !Number.isInteger(identity[2]) || !Number.isFinite(identity[3])
  ) {
    throw new Error("Registered option manifest contains an invalid option identity");
  }
  return JSON.stringify(identity);
}

function uniqueSortedIdentities(entries, identityOf, label) {
  const identities = entries.map(identityOf);
  if (new Set(identities).size !== identities.length) {
    throw new Error(label + " contains duplicate option identities");
  }
  return identities.sort();
}

/**
 * Throws unless the registered release is the release this runtime actually uses.
 * source_commit_sha and edge_release_ref are retained as traceable metadata; the
 * cryptographic runtime attestation here is specifically the selected registry digest.
 */
export async function assertInterpretationReleaseMatches({
  release,
  assessmentTypeId,
  familyId,
  assessmentVersion,
  interpretationVersion,
  registryEntries,
  runtimeOptionManifest,
  runtimeSourceCommitSha,
}) {
  if (!release) throw new Error("Registered interpretation release is missing");
  if (release.assessment_type_id !== assessmentTypeId) {
    throw new Error("Interpretation release assessment identity mismatch");
  }
  if (release.family_id !== familyId) {
    throw new Error("Interpretation release family identity mismatch");
  }
  if (Number(release.assessment_version) !== Number(assessmentVersion)) {
    throw new Error("Interpretation release assessment version mismatch");
  }
  if (Number(release.interpretation_version) !== Number(interpretationVersion)) {
    throw new Error("Interpretation release version mismatch");
  }
  if (typeof release.source_commit_sha !== "string" || !/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(release.source_commit_sha)) {
    throw new Error("Interpretation release source commit metadata is invalid");
  }
  if (
    typeof runtimeSourceCommitSha !== "string" ||
    !/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(runtimeSourceCommitSha)
  ) {
    throw new Error("Edge runtime source commit is not configured");
  }
  if (release.source_commit_sha !== runtimeSourceCommitSha) {
    throw new Error("Registered source commit does not match this Edge runtime build");
  }
  if (typeof release.edge_release_ref !== "string" || !release.edge_release_ref.trim()) {
    throw new Error("Interpretation release Edge reference metadata is missing");
  }
  if (release.edge_release_ref !== RUNTIME_EDGE_RELEASE_REF) {
    throw new Error("Registered Edge release reference does not match this runtime build");
  }
  if (!Array.isArray(release.option_manifest)) {
    throw new Error("Interpretation release option manifest is missing");
  }

  const runtimeDigest = await digestInterpretationEntries(registryEntries);
  if (release.registry_digest !== runtimeDigest) {
    throw new Error("Deployed interpretation registry digest does not match the registered release");
  }

  // Registry option UUIDs are not portable across environments. Compare semantic identity
  // (question code + option index + source value) to the registry, then bind the full UUID-bearing
  // manifest to the actual options loaded from this database.
  const registryIdentities = uniqueSortedIdentities(
    registryEntries, registryLogicalIdentity, "Runtime interpretation registry",
  );
  const manifestLogicalIdentities = uniqueSortedIdentities(
    release.option_manifest, manifestLogicalIdentity, "Registered option manifest",
  );
  if (
    registryIdentities.length !== manifestLogicalIdentities.length ||
    registryIdentities.some((identity, index) => identity !== manifestLogicalIdentities[index])
  ) {
    throw new Error("Runtime interpretation registry does not exactly cover the registered logical option manifest");
  }

  if (!Array.isArray(runtimeOptionManifest)) {
    throw new Error("Runtime database option manifest is missing");
  }
  const registeredIdentities = uniqueSortedIdentities(
    release.option_manifest, manifestIdentity, "Registered option manifest",
  );
  const liveIdentities = uniqueSortedIdentities(
    runtimeOptionManifest, manifestIdentity, "Runtime database option manifest",
  );
  if (
    registeredIdentities.length !== liveIdentities.length ||
    registeredIdentities.some((identity, index) => identity !== liveIdentities[index])
  ) {
    throw new Error("Registered option manifest does not exactly match live database option identities");
  }

  return {
    registryDigest: runtimeDigest,
    sourceCommitSha: release.source_commit_sha,
    edgeReleaseRef: release.edge_release_ref,
  };
}

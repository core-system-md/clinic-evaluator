#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_EDGE_RELEASE_REF = "assessment-access-c03-registry-attestation-v1";
const SHA_RE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const DIGEST_RE = /^[0-9a-f]{64}$/;

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableSerialize).join(",") + "]";
  return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + stableSerialize(value[key]))
    .join(",") + "}";
}

async function sha256Hex(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value),
  ))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function identity(questionCode, optionId, optionIndex, sourceOptionValue) {
  if (typeof questionCode !== "string" || !questionCode.trim()) throw new Error("Question code is required");
  if (typeof optionId !== "string" || !optionId.trim()) throw new Error("Option ID is required");
  if (!Number.isInteger(Number(optionIndex)) || !Number.isFinite(Number(sourceOptionValue))) {
    throw new Error("Option index/value must be numeric; option index must be an integer");
  }
  return JSON.stringify([questionCode, optionId, Number(optionIndex), Number(sourceOptionValue)]);
}

function buildOptionManifest(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.questions) || snapshot.questions.length === 0) {
    throw new Error("Snapshot must contain a non-empty questions array");
  }
  const manifest = [];
  const seenCodes = new Set();
  const seenIds = new Set();
  for (const question of snapshot.questions) {
    if (!question || typeof question.code !== "string" || !question.code.trim()) {
      throw new Error("Every question requires a non-empty code");
    }
    if (seenCodes.has(question.code)) throw new Error("Duplicate question code: " + question.code);
    seenCodes.add(question.code);
    if (!Array.isArray(question.options) || question.options.length === 0) {
      throw new Error("Every question must contain at least one option: " + question.code);
    }
    for (const option of question.options) {
      const row = {
        question_code: question.code,
        option_id: option.id,
        option_index: Number(option.optionIndex),
        source_option_value: Number(option.optionValue),
      };
      identity(row.question_code, row.option_id, row.option_index, row.source_option_value);
      if (seenIds.has(row.option_id)) throw new Error("Duplicate option ID: " + row.option_id);
      seenIds.add(row.option_id);
      manifest.push(row);
    }
  }
  manifest.sort((a, b) =>
    a.question_code.localeCompare(b.question_code) ||
    a.option_index - b.option_index ||
    a.option_id.localeCompare(b.option_id)
  );
  const identities = manifest.map((row) =>
    identity(row.question_code, row.option_id, row.option_index, row.source_option_value)
  );
  if (new Set(identities).size !== identities.length) throw new Error("Duplicate option identities in snapshot");
  return manifest;
}

async function generateReleasePayload({
  snapshot, registry, sourceCommitSha, edgeReleaseRef = DEFAULT_EDGE_RELEASE_REF,
}) {
  if (!snapshot || typeof snapshot.assessmentTypeId !== "string" || !snapshot.assessmentTypeId.trim()) {
    throw new Error("Snapshot assessmentTypeId is required");
  }
  if (typeof snapshot.familyId !== "string" || !snapshot.familyId.trim()) throw new Error("Snapshot familyId is required");
  if (!Number.isInteger(Number(snapshot.assessmentVersion)) || Number(snapshot.assessmentVersion) < 1) {
    throw new Error("Snapshot assessmentVersion must be a positive integer");
  }
  if (typeof snapshot.slug !== "string" || !snapshot.slug.trim()) throw new Error("Snapshot slug is required");
  if (!SHA_RE.test(sourceCommitSha || "")) throw new Error("sourceCommitSha must be a lowercase Git commit SHA");
  if (edgeReleaseRef !== DEFAULT_EDGE_RELEASE_REF) {
    throw new Error("edgeReleaseRef must match the Edge runtime constant: " + DEFAULT_EDGE_RELEASE_REF);
  }
  if (!registry || !Array.isArray(registry.entries)) throw new Error("Registry must contain entries[]");

  const interpretationVersion = Number(snapshot.interpretationVersion);
  if (!Number.isInteger(interpretationVersion) || interpretationVersion < 1) {
    throw new Error("Snapshot interpretationVersion must be a positive integer");
  }
  const selectedEntries = registry.entries.filter((entry) =>
    entry.assessmentSlug === snapshot.slug &&
    Number(entry.interpretationVersion) === interpretationVersion
  );
  if (selectedEntries.length === 0) {
    throw new Error("No interpretation registry entries for " + snapshot.slug + " v" + interpretationVersion);
  }
  const registryDigest = await sha256Hex(stableSerialize(selectedEntries));
  if (!DIGEST_RE.test(registryDigest)) throw new Error("Internal error: invalid registry digest");

  const optionManifest = buildOptionManifest(snapshot);
  const runtimeIdentities = selectedEntries.map((entry) =>
    identity(entry.questionCode, entry.optionId, entry.optionIndex, entry.sourceOptionValue)
  );
  const manifestIdentities = optionManifest.map((entry) =>
    identity(entry.question_code, entry.option_id, entry.option_index, entry.source_option_value)
  );
  if (new Set(runtimeIdentities).size !== runtimeIdentities.length) {
    throw new Error("Selected interpretation registry contains duplicate option identities");
  }
  const sortedRuntime = [...runtimeIdentities].sort();
  const sortedManifest = [...manifestIdentities].sort();
  if (sortedRuntime.length !== sortedManifest.length ||
      sortedRuntime.some((value, index) => value !== sortedManifest[index])) {
    throw new Error("Snapshot option identities do not exactly match the selected interpretation registry");
  }

  return {
    generator: "c03-release-payload-generator-v1",
    assessment: {
      assessment_type_id: snapshot.assessmentTypeId,
      family_id: snapshot.familyId,
      assessment_version: Number(snapshot.assessmentVersion),
      interpretation_version: interpretationVersion,
      slug: snapshot.slug,
      option_count: optionManifest.length,
    },
    provenance: {
      registry_digest: registryDigest,
      source_commit_sha: sourceCommitSha,
      edge_release_ref: edgeReleaseRef,
    },
    rpc: {
      function: "register_assessment_interpretation_release_secure",
      args: {
        p_assessment_type_id: snapshot.assessmentTypeId,
        p_interpretation_version: interpretationVersion,
        p_registry_digest: registryDigest,
        p_source_commit_sha: sourceCommitSha,
        p_edge_release_ref: edgeReleaseRef,
        p_option_manifest: optionManifest,
      },
    },
  };
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error("Unexpected argument: " + arg);
    const key = arg.slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("Missing value for --" + key);
    result[key] = argv[++i];
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ["snapshot", "registry", "source-commit-sha"]) {
    if (!args[required]) throw new Error("Required argument missing: --" + required);
  }
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(args.snapshot), "utf8"));
  const registry = JSON.parse(fs.readFileSync(path.resolve(args.registry), "utf8"));
  const payload = await generateReleasePayload({
    snapshot,
    registry,
    sourceCommitSha: args["source-commit-sha"],
    edgeReleaseRef: args["edge-release-ref"] || DEFAULT_EDGE_RELEASE_REF,
  });
  process.stdout.write(JSON.stringify(payload.rpc.args) + "\n");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write("C03 release payload generation failed: " + error.message + "\n");
    process.exitCode = 1;
  });
}

module.exports = { DEFAULT_EDGE_RELEASE_REF, stableSerialize, buildOptionManifest, generateReleasePayload };

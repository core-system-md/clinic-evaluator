// This fail-closed placeholder is replaced by .github/scripts/c03-release-attestation.mjs
// immediately before an authorized Edge deployment. Never set identity via runtime env vars.
export const C03_RUNTIME_ATTESTATION = Object.freeze({
  schemaVersion: "C03_RUNTIME_ATTESTATION_V1",
  gitCommitSha: "",
  edgeReleaseRef: "",
  fixtureSetVersion: "",
  migrationContractVersion: "",
});

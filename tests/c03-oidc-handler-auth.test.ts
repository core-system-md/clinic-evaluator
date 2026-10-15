import { createAssessmentConfigReleaseHandler } from "../supabase/functions/assessment-config-release/index.ts";

const evidence = {
  familyId: "family-1", familySlug: "clinic-performance", assessmentTypeId: "type-1", assessmentVersion: 1,
  configDigest: "b".repeat(64), interpretationVersion: 2, interpretationRegistryDigest: "c".repeat(64),
  scoringEngineVersion: "engine", scoringContractVersion: "contract", reportModelVersion: "report",
  canonicalizerVersion: "canonical", canonicalConfig: {},
};
const metadata = {
  schemaVersion: "C03_RUNTIME_ATTESTATION_V1", gitCommitSha: "a".repeat(40),
  edgeReleaseRef: "sha256:" + "d".repeat(64), fixtureSetVersion: "fixtures", migrationContractVersion: "migration",
};
function setup(valid: boolean) {
  let rpcCount = 0;
  const handler = createAssessmentConfigReleaseHandler({
    serviceClient: { async rpc() { rpcCount++; return { data: { success: true }, error: null }; } },
    computeEvidenceFn: async () => evidence,
    verifyCiTokenFn: async () => {
      if (!valid) throw new Error("invalid");
      return { repository: "core-system-md/clinic-evaluator", repositoryOwner: "core-system-md", sha: metadata.gitCommitSha, runId: "123", runAttempt: "1", workflowRef: "expected", environment: "production-e2e" };
    },
    getRuntimeMetadata: () => metadata,
  });
  return { handler, count: () => rpcCount };
}
function request(body: unknown, token = "signed-token") {
  const ciAction = String((body as any)?.action || "").startsWith("ci_");
  const headers: Record<string, string> = {
    authorization: ciAction ? "Bearer anon-token" : token ? "Bearer " + token : "",
    "content-type": "application/json",
  };
  if (ciAction && token) headers["x-c03-github-oidc"] = token;
  return new Request("https://local.test", { method: "POST", headers, body: JSON.stringify(body) });
}
Deno.test("invalid GitHub workload identity is rejected before any RPC", async () => {
  const state = setup(false);
  const response = await state.handler(request({ action: "ci_register", assessment_type_id: "type-1", confirmation: "ENABLE-C03-PRODUCTION" }));
  if (response.status !== 401 || state.count() !== 0) throw new Error("Invalid OIDC must fail before RPC.");
});
Deno.test("CI release writes require explicit confirmation", async () => {
  const state = setup(true);
  const response = await state.handler(request({ action: "ci_register", assessment_type_id: "type-1" }));
  if (response.status !== 403 || state.count() !== 0) throw new Error("Missing release confirmation must fail before RPC.");
});
Deno.test("CI registration uses the narrow CI RPC after workload verification", async () => {
  let name = "";
  const state = createAssessmentConfigReleaseHandler({
    serviceClient: { async rpc(rpcName: string) { name = rpcName; return { data: { success: true }, error: null }; } },
    computeEvidenceFn: async () => evidence,
    verifyCiTokenFn: async () => ({ repository: "core-system-md/clinic-evaluator", repositoryOwner: "core-system-md", sha: metadata.gitCommitSha, runId: "123", runAttempt: "1", workflowRef: "expected", environment: "production-e2e" }),
    getRuntimeMetadata: () => metadata,
  });
  const response = await state(request({ action: "ci_register", assessment_type_id: "type-1", confirmation: "ENABLE-C03-PRODUCTION" }));
  if (response.status !== 200 || name !== "register_assessment_config_release_ci_secure") throw new Error("Expected the narrow CI registration RPC.");
});

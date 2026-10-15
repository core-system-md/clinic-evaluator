import { createAssessmentConfigReleaseHandler } from "../supabase/functions/assessment-config-release/index.ts";

const evidence = {
  familyId: "family-1",
  familySlug: "clinic-performance",
  assessmentTypeId: "type-1",
  assessmentVersion: 1,
  configDigest: "b".repeat(64),
  interpretationVersion: 2,
  interpretationRegistryDigest: "c".repeat(64),
  scoringEngineVersion: "MD_CODE_ASSESSMENT_ENGINE",
  scoringContractVersion: "FINAL_IMPLEMENTATION_CONTRACT-2026-10-07",
  reportModelVersion: "REPORT_MODEL_V1",
  canonicalConfig: { assessment: { id: "type-1" }, questions: [] },
};

const release = {
  id: "release-1",
  family_id: evidence.familyId,
  assessment_type_id: evidence.assessmentTypeId,
  assessment_version: evidence.assessmentVersion,
  state: "PREPARED",
};

const runtimeMetadata = {
  gitCommitSha: "a".repeat(40),
  edgeReleaseRef: "edge-v1",
  fixtureSetVersion: "P3_FIXTURE_SET_V1",
  migrationContractVersion: "C03_RELEASE_CONTRACT_V1",
};

function fakeDependencies(options: { owner?: boolean; metadata?: typeof runtimeMetadata } = {}) {
  const serviceCalls: Array<{ kind: string; name?: string; payload?: any }> = [];
  const serviceClient = {
    from(table: string) {
      const query: any = {
        select() { return query; },
        eq() { return query; },
        maybeSingle() {
          serviceCalls.push({ kind: "select", name: table });
          return Promise.resolve({ data: table === "assessment_config_releases" ? release : null, error: null });
        },
      };
      return query;
    },
    async rpc(name: string, payload: any) {
      serviceCalls.push({ kind: "rpc", name, payload });
      return { data: { success: true, state: "VERIFIED", release_id: "release-1" }, error: null };
    },
  };
  const createUserClient = (_token: string) => ({
    auth: {
      async getUser() { return { data: { user: { id: "owner-user-1" } }, error: null }; },
    },
    async rpc(name: string) {
      if (name !== "is_owner") throw new Error("Unexpected auth RPC: " + name);
      return { data: options.owner !== false, error: null };
    },
  });
  return {
    serviceCalls,
    handler: createAssessmentConfigReleaseHandler({
      serviceClient,
      createUserClient,
      computeEvidenceFn: async () => evidence,
      getRuntimeMetadata: () => options.metadata || runtimeMetadata,
    }),
  };
}

function request(body: unknown, authorization = "Bearer owner-token") {
  return new Request("https://local.test/assessment-config-release", {
    method: "POST",
    headers: { authorization, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("release verifier exports the canonical configuration to an authenticated owner", async () => {
  const { handler, serviceCalls } = fakeDependencies();
  const response = await handler(request({ action: "export", assessment_type_id: "type-1" }));
  const body = await response.json();
  if (response.status !== 200) throw new Error("Expected export 200, got " + response.status);
  if (body?.data?.configDigest !== evidence.configDigest) throw new Error("Export digest mismatch.");
  if (body?.data?.canonicalConfig?.assessment?.id !== "type-1") throw new Error("Canonical config missing from export.");
  if (serviceCalls.length !== 0) throw new Error("Export must not write or verify a release.");
});

Deno.test("release verifier sends live config and runtime identity to the service-role attestation RPC", async () => {
  const { handler, serviceCalls } = fakeDependencies();
  const response = await handler(request({ action: "verify", release_id: "release-1" }));
  const body = await response.json();
  if (response.status !== 200 || body?.data?.state !== "VERIFIED") {
    throw new Error("Expected verified release response, got " + response.status + ": " + JSON.stringify(body));
  }
  const call = serviceCalls.find(item => item.kind === "rpc" && item.name === "verify_assessment_config_release_secure");
  if (!call) throw new Error("Secure runtime attestation RPC was not called.");
  if (call.payload.p_actual_family_id !== evidence.familyId) throw new Error("Family identity not attested.");
  if (call.payload.p_actual_assessment_type_id !== evidence.assessmentTypeId) throw new Error("Version identity not attested.");
  if (call.payload.p_actual_config_digest !== evidence.configDigest) throw new Error("Full config digest not attested.");
  if (call.payload.p_actual_registry_digest !== evidence.interpretationRegistryDigest) throw new Error("Registry digest not attested.");
  if (call.payload.p_actual_git_commit_sha !== runtimeMetadata.gitCommitSha) throw new Error("Git release identity not attested.");
});

Deno.test("release verifier rejects non-owners before touching the release table", async () => {
  const { handler, serviceCalls } = fakeDependencies({ owner: false });
  const response = await handler(request({ action: "verify", release_id: "release-1" }));
  if (response.status !== 403) throw new Error("Expected 403 for non-owner, got " + response.status);
  if (serviceCalls.length !== 0) throw new Error("Non-owner request reached the service-role database client.");
});

Deno.test("release verifier fails closed before querying when runtime metadata is missing", async () => {
  const { handler, serviceCalls } = fakeDependencies({
    metadata: { gitCommitSha: "", edgeReleaseRef: "", fixtureSetVersion: "", migrationContractVersion: "" },
  });
  const response = await handler(request({ action: "verify", release_id: "release-1" }));
  if (response.status !== 503) throw new Error("Expected 503 for missing runtime metadata, got " + response.status);
  if (serviceCalls.length !== 0) throw new Error("Missing runtime metadata must fail before release lookup or verification.");
});

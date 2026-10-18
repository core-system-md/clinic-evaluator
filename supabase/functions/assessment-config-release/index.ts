import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { computeAssessmentConfigReleaseEvidence } from "../assessment-access/engine.ts";
import { C03_RUNTIME_ATTESTATION } from "../_shared/c03-runtime-attestation.ts";
import { verifyC03GithubReleaseToken, type C03GithubReleaseIdentity } from "../_shared/c03-github-oidc.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const RELEASE_CONFIRMATION = "ENABLE-C03-PRODUCTION";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-c03-github-oidc",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

async function requireOwner(req: Request, createUserClient: (token: string) => any) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: "Owner authentication required", status: 401 as const };
  const userClient = createUserClient(match[1]);
  const { data: userData, error: userError } = await userClient.auth.getUser(match[1]);
  if (userError || !userData?.user) return { error: "Invalid authentication token", status: 401 as const };
  const { data: isOwner, error: ownerError } = await userClient.rpc("is_owner");
  if (ownerError || isOwner !== true) return { error: "Owner authorization required", status: 403 as const };
  return { user: userData.user, userClient };
}

function requireReleaseConfirmation(body: any) {
  if (body?.confirmation !== RELEASE_CONFIRMATION) {
    throw Object.assign(new Error("C-03 CI release action requires explicit ENABLE-C03-PRODUCTION confirmation."), { status: 403 });
  }
}

export function createAssessmentConfigReleaseHandler(dependencies: {
  serviceClient?: any;
  createUserClient?: (token: string) => any;
  computeEvidenceFn?: typeof computeAssessmentConfigReleaseEvidence;
  verifyCiTokenFn?: (token: string) => Promise<C03GithubReleaseIdentity>;
  getRuntimeMetadata?: () => {
    schemaVersion: string;
    gitCommitSha: string;
    edgeReleaseRef: string;
    fixtureSetVersion: string;
    migrationContractVersion: string;
  };
} = {}) {
  const dbClient = dependencies.serviceClient || serviceClient;
  const createUserClient = dependencies.createUserClient || ((token: string) => createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: "Bearer " + token } },
  }));
  const computeEvidenceFn = dependencies.computeEvidenceFn || computeAssessmentConfigReleaseEvidence;
  const verifyCiTokenFn = dependencies.verifyCiTokenFn || verifyC03GithubReleaseToken;
  const getRuntimeMetadata = dependencies.getRuntimeMetadata || (() => ({
    schemaVersion: C03_RUNTIME_ATTESTATION.schemaVersion,
    gitCommitSha: C03_RUNTIME_ATTESTATION.gitCommitSha,
    edgeReleaseRef: C03_RUNTIME_ATTESTATION.edgeReleaseRef,
    fixtureSetVersion: C03_RUNTIME_ATTESTATION.fixtureSetVersion,
    migrationContractVersion: C03_RUNTIME_ATTESTATION.migrationContractVersion,
  }));

  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      const body = await req.json();
      const action = String(body?.action || "");
      const assessmentTypeId = String(body?.assessment_type_id || "").trim();
      const isCiAction = action.startsWith("ci_");
      let owner: { user: any; userClient: any } | null = null;
      let ciIdentity: C03GithubReleaseIdentity | null = null;

      if (isCiAction) {
        const oidcToken = req.headers.get("x-c03-github-oidc") || "";
        if (!oidcToken.trim()) return json({ error: "GitHub OIDC workload authentication required" }, 401);
        try {
          ciIdentity = await verifyCiTokenFn(oidcToken);
        } catch (_error) {
          return json({ error: "GitHub OIDC workload identity rejected" }, 401);
        }
      } else {
        const authorization = await requireOwner(req, createUserClient);
        if ("error" in authorization) return json({ error: authorization.error }, authorization.status);
        owner = authorization;
      }

      const runtimeMetadata = getRuntimeMetadata();
      if (Object.values(runtimeMetadata).some((value) => typeof value !== "string" || !value.trim())) {
        return json({ error: "C-03 runtime release metadata is not configured" }, 503);
      }
      if (ciIdentity && ciIdentity.sha !== runtimeMetadata.gitCommitSha) {
        return json({ error: "GitHub OIDC commit SHA does not match this deployed C-03 Edge bundle" }, 409);
      }

      if (action === "ci_inventory") {
        const [settingsResult, releaseCountResult, familiesResult, releasesResult] = await Promise.all([
          dbClient.from("assessment_config_release_settings")
            .select("singleton,enabled,enabled_at,enabled_by_workflow_run_id,enabled_by_workflow_sha")
            .eq("singleton", true)
            .maybeSingle(),
          dbClient.from("assessment_config_releases").select("id", { count: "exact", head: true }),
          dbClient.from("assessment_families")
            .select("id,slug,current_published_version_id,current_release_id")
            .not("current_published_version_id", "is", null)
            .order("slug", { ascending: true }),
          dbClient.from("assessment_config_releases")
            .select("id,family_id,assessment_type_id,git_commit_sha,config_digest,interpretation_registry_digest,edge_release_ref,state,verified_config_digest,verified_registry_digest,verified_git_commit_sha,verified_edge_release_ref")
            .eq("git_commit_sha", ciIdentity!.sha),
        ]);
        if (settingsResult.error) throw settingsResult.error;
        if (releaseCountResult.error) throw releaseCountResult.error;
        if (familiesResult.error) throw familiesResult.error;
        if (releasesResult.error) throw releasesResult.error;

        const rpcProbe = await dbClient.rpc("c03_require_ci_release_context", {
          p_workflow_run_id: ciIdentity!.runId,
          p_workflow_run_attempt: ciIdentity!.runAttempt,
          p_workflow_sha: ciIdentity!.sha,
          p_confirmation: "C03_READ_ONLY_PREFLIGHT_INVALID_CONFIRMATION",
        });
        const ciRpcReady = Boolean(
          rpcProbe.error &&
          /Invalid guarded GitHub release identity or confirmation/i.test(String(rpcProbe.error.message || "")),
        );
        if (!ciRpcReady) {
          return json({ error: "C-03 CI release authorization RPC is missing or did not fail closed" }, 503);
        }

        return json({
          success: true,
          data: {
            settings: settingsResult.data,
            releaseRows: Number(releaseCountResult.count ?? 0),
            families: familiesResult.data || [],
            releases: releasesResult.data || [],
            ciRpcReady,
            releaseIdentity: ciIdentity,
          },
        });
      }

      if (action === "export" || action === "ci_export") {
        if (!assessmentTypeId) return json({ error: "assessment_type_id is required" }, 400);
        const evidence = await computeEvidenceFn(dbClient, assessmentTypeId);
        return json({
          success: true,
          data: {
            familyId: evidence.familyId,
            familySlug: evidence.familySlug,
            assessmentTypeId: evidence.assessmentTypeId,
            assessmentVersion: evidence.assessmentVersion,
            configDigest: evidence.configDigest,
            interpretationVersion: evidence.interpretationVersion,
            interpretationRegistryDigest: evidence.interpretationRegistryDigest,
            scoringEngineVersion: evidence.scoringEngineVersion,
            scoringContractVersion: evidence.scoringContractVersion,
            reportModelVersion: evidence.reportModelVersion,
            canonicalizerVersion: evidence.canonicalizerVersion,
            runtimeMetadata,
            canonicalConfig: evidence.canonicalConfig,
            ...(ciIdentity ? { releaseIdentity: ciIdentity } : {}),
          },
        });
      }

      if (action === "register" || action === "ci_register") {
        if (!assessmentTypeId) return json({ error: "assessment_type_id is required" }, 400);
        if (action === "ci_register") requireReleaseConfirmation(body);
        const evidence = await computeEvidenceFn(dbClient, assessmentTypeId);
        const params = {
          p_assessment_type_id: evidence.assessmentTypeId,
          p_git_commit_sha: runtimeMetadata.gitCommitSha,
          p_config_digest: evidence.configDigest,
          p_canonicalizer_version: evidence.canonicalizerVersion,
          p_interpretation_version: evidence.interpretationVersion,
          p_interpretation_registry_digest: evidence.interpretationRegistryDigest,
          p_scoring_engine_version: evidence.scoringEngineVersion,
          p_scoring_contract_version: evidence.scoringContractVersion,
          p_report_model_version: evidence.reportModelVersion,
          p_fixture_set_version: runtimeMetadata.fixtureSetVersion,
          p_migration_contract_version: runtimeMetadata.migrationContractVersion,
          p_edge_release_ref: runtimeMetadata.edgeReleaseRef,
        };
        const registration = action === "ci_register"
          ? await dbClient.rpc("register_assessment_config_release_ci_secure", {
              ...params,
              p_workflow_run_id: ciIdentity!.runId,
              p_workflow_run_attempt: ciIdentity!.runAttempt,
              p_workflow_sha: ciIdentity!.sha,
              p_confirmation: body.confirmation,
            })
          : await owner!.userClient.rpc("register_assessment_config_release_secure", params);
        if (registration.error) throw registration.error;
        return json({ success: true, data: registration.data });
      }

      if (action === "activate_existing" || action === "ci_activate_existing") {
        const releaseId = String(body?.release_id || "").trim();
        const expectedVersionId = String(body?.expected_published_version_id || "").trim();
        if (!releaseId || !expectedVersionId) return json({ error: "release_id and expected_published_version_id are required" }, 400);
        if (action === "ci_activate_existing") requireReleaseConfirmation(body);
        const result = action === "ci_activate_existing"
          ? await dbClient.rpc("activate_existing_assessment_release_ci_secure", {
              p_release_id: releaseId,
              p_expected_published_version_id: expectedVersionId,
              p_workflow_run_id: ciIdentity!.runId,
              p_workflow_run_attempt: ciIdentity!.runAttempt,
              p_workflow_sha: ciIdentity!.sha,
              p_confirmation: body.confirmation,
            })
          : await owner!.userClient.rpc("activate_existing_assessment_release_secure", {
              p_release_id: releaseId,
              p_expected_published_version_id: expectedVersionId,
            });
        if (result.error) throw result.error;
        return json({ success: true, data: result.data });
      }

      if (action === "publish") {
        const releaseId = String(body?.release_id || "").trim();
        const expectedVersionId = String(body?.expected_published_version_id || "").trim();
        if (!releaseId || !expectedVersionId) return json({ error: "release_id and expected_published_version_id are required" }, 400);
        const { data, error } = await owner!.userClient.rpc(
          "publish_assessment_config_release_secure",
          { p_release_id: releaseId, p_expected_published_version_id: expectedVersionId },
        );
        if (error) throw error;
        return json({ success: true, data });
      }

      if (action === "enable_gate" || action === "ci_enable_gate") {
        if (action === "ci_enable_gate") requireReleaseConfirmation(body);
        const result = action === "ci_enable_gate"
          ? await dbClient.rpc("enable_assessment_config_release_gate_ci_secure", {
              p_workflow_run_id: ciIdentity!.runId,
              p_workflow_run_attempt: ciIdentity!.runAttempt,
              p_workflow_sha: ciIdentity!.sha,
              p_confirmation: body.confirmation,
            })
          : await owner!.userClient.rpc("enable_assessment_config_release_gate_secure");
        if (result.error) throw result.error;
        return json({ success: true, data: result.data });
      }

      if (action === "verify" || action === "ci_verify") {
        const releaseId = String(body?.release_id || "").trim();
        if (!releaseId) return json({ error: "release_id is required" }, 400);
        if (action === "ci_verify") requireReleaseConfirmation(body);
        const { data: release, error: releaseError } = await dbClient
          .from("assessment_config_releases")
          .select("id, family_id, assessment_type_id, assessment_version, state")
          .eq("id", releaseId)
          .maybeSingle();
        if (releaseError) throw releaseError;
        if (!release) return json({ error: "Assessment release not found" }, 404);
        if (!["PREPARED", "VERIFIED"].includes(String(release.state))) {
          return json({ error: "Only prepared releases can be verified", state: release.state }, 409);
        }
        const evidence = await computeEvidenceFn(dbClient, release.assessment_type_id);
        const { data: verification, error: verificationError } = await dbClient.rpc(
          "verify_assessment_config_release_secure",
          {
            p_release_id: releaseId,
            p_actual_family_id: evidence.familyId,
            p_actual_assessment_type_id: evidence.assessmentTypeId,
            p_actual_assessment_version: evidence.assessmentVersion,
            p_actual_config_digest: evidence.configDigest,
            p_actual_canonicalizer_version: evidence.canonicalizerVersion,
            p_actual_registry_digest: evidence.interpretationRegistryDigest,
            p_actual_git_commit_sha: runtimeMetadata.gitCommitSha,
            p_actual_edge_release_ref: runtimeMetadata.edgeReleaseRef,
            p_actual_interpretation_version: evidence.interpretationVersion,
            p_actual_scoring_engine_version: evidence.scoringEngineVersion,
            p_actual_scoring_contract_version: evidence.scoringContractVersion,
            p_actual_report_model_version: evidence.reportModelVersion,
            p_actual_fixture_set_version: runtimeMetadata.fixtureSetVersion,
            p_actual_migration_contract_version: runtimeMetadata.migrationContractVersion,
            p_validation_report: {
              verifier: "assessment-config-release",
              verifiedBy: ciIdentity ? "github-actions:" + ciIdentity.runId : owner!.user.id,
              ...(ciIdentity ? { releaseIdentity: ciIdentity } : {}),
              familySlug: evidence.familySlug,
              configDigest: evidence.configDigest,
              registryDigest: evidence.interpretationRegistryDigest,
            },
          },
        );
        if (verificationError) throw verificationError;
        return json({ success: verification?.success === true, data: verification }, verification?.success === true ? 200 : 409);
      }

      return json({ error: "Unknown action" }, 400);
    } catch (error) {
      const status = Number((error as any)?.status) || 500;
      return json({ error: error instanceof Error ? error.message : "Internal error" }, status);
    }
  };
}

if (import.meta.main) {
  Deno.serve(createAssessmentConfigReleaseHandler());
}

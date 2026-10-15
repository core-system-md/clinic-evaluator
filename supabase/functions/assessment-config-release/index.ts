import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { computeAssessmentConfigReleaseEvidence } from "../assessment-access/engine.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

async function requireOwner(
  req: Request,
  createUserClient: (token: string) => any,
) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: "Owner authentication required", status: 401 as const };

  const userClient = createUserClient(match[1]);
  const { data: userData, error: userError } = await userClient.auth.getUser(match[1]);
  if (userError || !userData?.user) {
    return { error: "Invalid authentication token", status: 401 as const };
  }

  const { data: isOwner, error: ownerError } = await userClient.rpc("is_owner");
  if (ownerError || isOwner !== true) {
    return { error: "Owner authorization required", status: 403 as const };
  }
  return { user: userData.user };
}

export function createAssessmentConfigReleaseHandler(dependencies: {
  serviceClient?: any;
  createUserClient?: (token: string) => any;
  computeEvidenceFn?: typeof computeAssessmentConfigReleaseEvidence;
  getRuntimeMetadata?: () => {
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
  const getRuntimeMetadata = dependencies.getRuntimeMetadata || (() => ({
    gitCommitSha: Deno.env.get("C03_GIT_COMMIT_SHA") || "",
    edgeReleaseRef: Deno.env.get("C03_EDGE_RELEASE_REF") || "",
    fixtureSetVersion: Deno.env.get("C03_FIXTURE_SET_VERSION") || "",
    migrationContractVersion: Deno.env.get("C03_MIGRATION_CONTRACT_VERSION") || "",
  }));

  return async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = await requireOwner(req, createUserClient);
    if ("error" in authorization) return json({ error: authorization.error }, authorization.status);

    const body = await req.json();
    const action = String(body?.action || "");
    const assessmentTypeId = String(body?.assessment_type_id || "").trim();

    if (action === "export") {
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
          canonicalConfig: evidence.canonicalConfig,
        },
      });
    }

    if (action === "verify") {
      const releaseId = String(body?.release_id || "").trim();
      if (!releaseId) return json({ error: "release_id is required" }, 400);

      const runtimeMetadata = getRuntimeMetadata();
      if (Object.values(runtimeMetadata).some((value) => !value.trim())) {
        return json({ error: "C-03 runtime release metadata is not configured" }, 503);
      }

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

      const evidence = await computeEvidenceFn(
        dbClient,
        release.assessment_type_id,
      );
      const { data: verification, error: verificationError } = await dbClient.rpc(
        "verify_assessment_config_release_secure",
        {
          p_release_id: releaseId,
          p_actual_family_id: evidence.familyId,
          p_actual_assessment_type_id: evidence.assessmentTypeId,
          p_actual_assessment_version: evidence.assessmentVersion,
          p_actual_config_digest: evidence.configDigest,
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
            verifiedBy: authorization.user.id,
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

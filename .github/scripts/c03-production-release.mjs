import { pathToFileURL } from "node:url";
import { verifyDeployedAttestation } from "./c03-release-attestation.mjs";
import { getC03GithubOidcToken } from "./c03-github-oidc-token.mjs";

const CONFIRMATION = "ENABLE-C03-PRODUCTION";

function requireValue(value, name) {
  const result = String(value || "").trim();
  if (!result) throw new Error("Missing required C-03 release setting: " + name);
  return result;
}

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error("C-03 release request failed: HTTP " + response.status + " " + JSON.stringify(payload));
  }
  return payload;
}

export async function executeC03ProductionRelease({
  baseUrl,
  anonKey,
  getOidcToken = getC03GithubOidcToken,
  confirmation,
  fetchImpl = fetch,
  verifyAttestation = verifyDeployedAttestation,
}) {
  if (confirmation !== CONFIRMATION) {
    throw new Error("Production release blocked: set the exact confirmation ENABLE-C03-PRODUCTION.");
  }
  const url = requireValue(baseUrl, "SUPABASE_URL").replace(/\/$/, "");
  const anon = requireValue(anonKey, "SUPABASE_ANON_KEY");
  const invokeCi = async (body) => requestJson(
    fetchImpl,
    url + "/functions/v1/assessment-config-release",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anon,
        "Authorization": "Bearer " + anon,
        "x-c03-github-oidc": await getOidcToken(),
      },
      body: JSON.stringify({
        ...body,
        ...(body.action === "ci_export" ? {} : { confirmation: CONFIRMATION }),
      }),
    },
  );

  // All privileged inventory reads stay behind the OIDC-verifying Edge endpoint.
  // The runner receives no service-role credential and cannot invoke release RPCs directly.
  const initialInventory = await invokeCi({ action: "ci_inventory" });
  const initial = initialInventory?.data;
  if (
    initialInventory?.success !== true ||
    initial?.ciRpcReady !== true ||
    initial?.settings?.singleton !== true
  ) {
    throw new Error("C-03 guarded read-only inventory or release-RPC preflight failed.");
  }

  const gateWasEnabled = initial.settings.enabled === true;
  const families = initial.families;
  if (!Array.isArray(families) || families.length === 0) {
    throw new Error("Production published-family inventory is empty or malformed.");
  }
  const familyIds = new Set();
  const familySlugs = new Set();
  for (const family of families) {
    const id = String(family?.id || "").trim();
    const slug = String(family?.slug || "").trim();
    const versionId = String(family?.current_published_version_id || "").trim();
    if (!id || !slug || !versionId) {
      throw new Error("A published family has no stable family/version identity: " + slug);
    }
    if (familyIds.has(id) || familySlugs.has(slug)) {
      throw new Error("Production published-family inventory contains duplicate family identity: " + slug);
    }
    familyIds.add(id);
    familySlugs.add(slug);
  }
  if (gateWasEnabled && (
    !/^\d+$/.test(String(initial.settings.enabled_by_workflow_run_id || "")) ||
    !/^[0-9a-f]{40}$/.test(String(initial.settings.enabled_by_workflow_sha || ""))
  )) {
    throw new Error("The enabled C-03 gate has no valid immutable activation audit identity.");
  }

  // Runtime attestation is independent of family slug. One current published version
  // is sufficient to verify the two deployed Edge bundles before release writes.
  await verifyAttestation({
    assessmentTypeId: families[0].current_published_version_id,
    baseUrl: url,
    anonKey: anon,
    fetchImpl,
  });

  const registered = [];
  for (const family of families) {
    const result = await invokeCi({
      action: "ci_register",
      assessment_type_id: family.current_published_version_id,
    });
    const releaseId = String(result?.data?.release_id || "").trim();
    if (
      result?.success !== true ||
      !releaseId ||
      result?.data?.assessment_type_id !== family.current_published_version_id ||
      !["PREPARED", "VERIFIED"].includes(String(result?.data?.state || ""))
    ) {
      throw new Error("Release registration returned an unexpected identity/state for " + family.slug + ": " + JSON.stringify(result));
    }
    registered.push({ ...family, releaseId });
  }

  // Verify every current published version before activating any family.
  const verified = [];
  for (const family of registered) {
    const result = await invokeCi({ action: "ci_verify", release_id: family.releaseId });
    if (result?.success !== true || result?.data?.state !== "VERIFIED") {
      throw new Error("Release verification failed for " + family.slug + ": " + JSON.stringify(result));
    }
    verified.push(family);
  }

  const activated = [];
  for (const family of verified) {
    const result = await invokeCi({
      action: "ci_activate_existing",
      release_id: family.releaseId,
      expected_published_version_id: family.current_published_version_id,
    });
    if (result?.success !== true || result?.data?.state !== "PUBLISHED") {
      throw new Error("Release activation failed for " + family.slug + ": " + JSON.stringify(result));
    }
    activated.push({ slug: family.slug, versionId: family.current_published_version_id, releaseId: family.releaseId });
  }

  // Bootstrap the gate only once. Later releases preserve its original activation
  // audit identity while still verifying and publishing the current family inventory.
  if (!gateWasEnabled) {
    const enabled = await invokeCi({ action: "ci_enable_gate" });
    if (enabled?.success !== true) {
      throw new Error("C-03 gate activation was rejected: " + JSON.stringify(enabled));
    }
  }

  const finalInventoryResponse = await invokeCi({ action: "ci_inventory" });
  const finalInventory = finalInventoryResponse?.data;
  const expectedGateRunId = gateWasEnabled
    ? String(initial.settings.enabled_by_workflow_run_id)
    : String(finalInventory?.releaseIdentity?.runId || "");
  const expectedGateSha = gateWasEnabled
    ? String(initial.settings.enabled_by_workflow_sha)
    : String(finalInventory?.releaseIdentity?.sha || "");
  const workflowRunId = String(finalInventory?.releaseIdentity?.runId || "");
  const workflowSha = String(finalInventory?.releaseIdentity?.sha || "");
  if (
    finalInventoryResponse?.success !== true ||
    finalInventory?.settings?.singleton !== true ||
    finalInventory.settings.enabled !== true ||
    finalInventory.settings.enabled_by_workflow_run_id !== expectedGateRunId ||
    finalInventory.settings.enabled_by_workflow_sha !== expectedGateSha ||
    !/^[0-9a-f]{40}$/.test(workflowSha) ||
    !/^\d+$/.test(workflowRunId) ||
    !/^[0-9a-f]{40}$/.test(expectedGateSha) ||
    !/^\d+$/.test(expectedGateRunId)
  ) {
    throw new Error("C-03 final gate, release-workload identity, or immutable gate-audit read-back did not pass.");
  }

  const finalFamilies = finalInventory.families;
  const finalReleases = finalInventory.releases;
  if (!Array.isArray(finalFamilies) || finalFamilies.length !== families.length || !Array.isArray(finalReleases)) {
    throw new Error("C-03 final release inventory is incomplete or the published-family inventory changed during release.");
  }
  const initialFamilyById = new Map(families.map((family) => [String(family.id), family]));
  const finalFamilyIds = new Set();
  for (const family of finalFamilies) {
    const initialFamily = initialFamilyById.get(String(family.id));
    if (
      !initialFamily ||
      String(family.slug) !== String(initialFamily.slug) ||
      String(family.current_published_version_id) !== String(initialFamily.current_published_version_id) ||
      finalFamilyIds.has(String(family.id))
    ) {
      throw new Error("Published-family inventory changed during release: " + String(family.slug));
    }
    finalFamilyIds.add(String(family.id));
    const release = finalReleases.find((entry) => entry.id === family.current_release_id);
    if (
      !family.current_release_id ||
      !release ||
      release.family_id !== family.id ||
      release.assessment_type_id !== family.current_published_version_id ||
      release.git_commit_sha !== workflowSha ||
      release.state !== "PUBLISHED" ||
      release.verified_config_digest !== release.config_digest ||
      release.verified_registry_digest !== release.interpretation_registry_digest ||
      release.verified_git_commit_sha !== release.git_commit_sha ||
      release.verified_edge_release_ref !== release.edge_release_ref
    ) {
      throw new Error("C-03 final read-back failed for published family " + String(family.slug) + ".");
    }
  }

  return {
    success: true,
    gateEnabled: true,
    activated,
    workflowRunId,
    workflowSha,
    verifiedFamilyCount: finalFamilies.length,
    gateWasAlreadyEnabled: gateWasEnabled,
    gateActivationRunId: expectedGateRunId,
    gateActivationSha: expectedGateSha,
    note: "Runtime attestation, every current published family, verified active pointers, immutable gate audit identity, and post-write read-back were verified.",
  };
}

async function main() {
  const result = await executeC03ProductionRelease({
    baseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    confirmation: process.env.C03_PRODUCTION_RELEASE_CONFIRMATION,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

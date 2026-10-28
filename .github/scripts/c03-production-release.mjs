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
    if (!["published"].includes(String(family.current_published_version_status || "")) ||
        typeof family.current_published_version_is_active !== "boolean") {
      throw new Error("C-03 inventory is missing published-version status/active evidence for " + slug);
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
  if (!Array.isArray(initial.releases)) {
    throw new Error("Production release inventory for the current workflow SHA is malformed.");
  }
  const workflowShaAtStart = String(initial.releaseIdentity?.sha || "");
  if (!/^[0-9a-f]{40}$/.test(workflowShaAtStart)) {
    throw new Error("The verified GitHub workload identity has no valid full commit SHA.");
  }
  const isAlreadyReleased = (family) => {
    const release = initial.releases.find((entry) => entry.id === family.current_release_id);
    return Boolean(
      release &&
      release.family_id === family.id &&
      release.assessment_type_id === family.current_published_version_id &&
      release.git_commit_sha === workflowShaAtStart &&
      release.state === "PUBLISHED" &&
      release.verified_config_digest === release.config_digest &&
      release.verified_registry_digest === release.interpretation_registry_digest &&
      release.verified_git_commit_sha === release.git_commit_sha &&
      release.verified_edge_release_ref === release.edge_release_ref
    );
  };
  const activeFamilies = families.filter((family) =>
    family.current_published_version_status === "published" &&
    family.current_published_version_is_active === true
  );
  const inactiveFamilies = families.filter((family) => !activeFamilies.includes(family));
  const familiesToRelease = activeFamilies.filter((family) => !isAlreadyReleased(family));

  // Runtime attestation is independent of family slug. One current active published
  // version is sufficient to verify the two deployed Edge bundles before release writes.
  const attestationResult = await verifyAttestation({
    assessmentTypeId: activeFamilies[0]?.current_published_version_id || families[0].current_published_version_id,
    baseUrl: url,
    anonKey: anon,
    fetchImpl,
  });
  if (activeFamilies.length === 0) {
    throw new Error("C-03 inventory contains no active published assessment versions to release.");
  }

  const registered = [];
  for (const family of familiesToRelease) {
    // Reuse an exact-SHA PREPARED/VERIFIED row left by a previous fail-closed run.
    // The following ci_verify call rechecks its live config and attestation before activation.
    const existing = initial.releases.find((entry) =>
      entry.family_id === family.id &&
      entry.assessment_type_id === family.current_published_version_id &&
      entry.git_commit_sha === workflowShaAtStart &&
      ["PREPARED", "VERIFIED"].includes(String(entry.state || ""))
    );
    if (existing) {
      registered.push({ ...family, releaseId: String(existing.id) });
      continue;
    }
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

  // Verify every family needing a new release before activating any of them.
  const verified = [];
  for (const family of registered) {
    const result = await invokeCi({ action: "ci_verify", release_id: family.releaseId });
    if (result?.success !== true || result?.data?.state !== "VERIFIED") {
      throw new Error("Release verification failed for " + family.slug + ": " + JSON.stringify(result));
    }
    verified.push(family);
  }

  // Re-read the live inventory after verification and before any pointer changes.
  // Abort without activation if a family/version/pointer or gate state changed mid-run.
  const preActivationResponse = await invokeCi({ action: "ci_inventory" });
  const preActivation = preActivationResponse?.data;
  const initialById = new Map(families.map((family) => [String(family.id), family]));
  if (
    preActivationResponse?.success !== true ||
    preActivation?.settings?.singleton !== true ||
    preActivation.settings.enabled !== gateWasEnabled ||
    !Array.isArray(preActivation.families) ||
    preActivation.families.length !== families.length ||
    preActivation?.releaseIdentity?.runId !== initial.releaseIdentity?.runId ||
    preActivation?.releaseIdentity?.sha !== initial.releaseIdentity?.sha ||
    preActivation.settings.enabled_by_workflow_run_id !== initial.settings.enabled_by_workflow_run_id ||
    preActivation.settings.enabled_by_workflow_sha !== initial.settings.enabled_by_workflow_sha
  ) {
    throw new Error("C-03 live family/gate inventory changed after verification; no release activation was attempted.");
  }
  for (const family of preActivation.families) {
    const before = initialById.get(String(family.id));
    if (
      !before ||
      String(family.slug) !== String(before.slug) ||
      String(family.current_published_version_id) !== String(before.current_published_version_id) ||
      String(family.current_published_version_status || "") !== String(before.current_published_version_status || "") ||
      family.current_published_version_is_active !== before.current_published_version_is_active ||
      String(family.current_release_id || "") !== String(before.current_release_id || "")
    ) {
      throw new Error("C-03 family version or active release pointer changed after verification: " + String(family.slug));
    }
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
    const initialFamily = initialFamilyById.get(String(family.id));
    if (
      String(family.current_published_version_status || "") !== String(initialFamily?.current_published_version_status || "") ||
      family.current_published_version_is_active !== initialFamily?.current_published_version_is_active
    ) {
      throw new Error("C-03 published-version active/status state changed during release: " + String(family.slug));
    }
    if (family.current_published_version_is_active !== true) {
      if (String(family.current_release_id || "") !== String(initialFamily?.current_release_id || "")) {
        throw new Error("C-03 attempted to change the release pointer of a stopped/inactive assessment: " + String(family.slug));
      }
      continue;
    }
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
      throw new Error("C-03 final read-back failed for active published family " + String(family.slug) + ".");
    }
  }

  return {
    success: true,
    gateEnabled: true,
    activated,
    workflowRunId,
    workflowSha,
    verifiedFamilyCount: activeFamilies.length,
    inactiveFamilyCount: inactiveFamilies.length,
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

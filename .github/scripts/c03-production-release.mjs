import { pathToFileURL } from "node:url";
import { verifyDeployedAttestation } from "./c03-release-attestation.mjs";
import { getC03GithubOidcToken } from "./c03-github-oidc-token.mjs";

export const REQUIRED_FAMILY_SLUGS = Object.freeze([
  "admin-reception-assessment",
  "clinic-performance",
  "comprehensive-clinic-assessment",
  "medical-team-assessment",
  "patient-journey",
]);

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
  serviceRoleKey,
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
  const service = requireValue(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    "apikey": service,
    "Authorization": "Bearer " + service,
  };

  const settings = await requestJson(
    fetchImpl,
    url + "/rest/v1/assessment_config_release_settings?select=singleton,enabled&singleton=eq.true",
    { headers },
  );
  if (!Array.isArray(settings) || settings.length !== 1 || settings[0].singleton !== true) {
    throw new Error("C-03 release settings table is missing or does not contain its singleton row; apply the reviewed migration first.");
  }
  if (settings[0].enabled === true) {
    throw new Error("C-03 release gate is already enabled; refusing to repeat activation.");
  }

  const families = await requestJson(
    fetchImpl,
    url + "/rest/v1/assessment_families?select=id,slug,current_published_version_id&current_published_version_id=not.is.null&order=slug.asc",
    { headers },
  );
  if (!Array.isArray(families)) throw new Error("Current published family inventory response is malformed.");
  const slugs = families.map((family) => String(family.slug)).sort();
  if (JSON.stringify(slugs) !== JSON.stringify([...REQUIRED_FAMILY_SLUGS].sort())) {
    throw new Error("Production published-family inventory drifted from the reviewed five-family contract: " + JSON.stringify(slugs));
  }
  for (const family of families) {
    if (!family.id || !family.current_published_version_id) {
      throw new Error("A published family has no stable family/version identity: " + String(family.slug));
    }
  }

  // Read-only preflight must attest both deployed Edge bundles before any release writes.
  await verifyAttestation({
    assessmentTypeId: families[0].current_published_version_id,
    baseUrl: url,
    anonKey: anon,
    fetchImpl,
  });

  const invokeCi = async (body) => requestJson(
    fetchImpl,
    url + "/functions/v1/assessment-config-release",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anon,
        "Authorization": "Bearer " + await getOidcToken(),
      },
      body: JSON.stringify({ ...body, ...(body.action === "ci_export" ? {} : { confirmation: CONFIRMATION }) }),
    },
  );

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

  // Verify all five first. Do not activate any family if any attestation is rejected.
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
    if (result?.success !== true) {
      throw new Error("Release activation failed for " + family.slug + ": " + JSON.stringify(result));
    }
    activated.push({ slug: family.slug, versionId: family.current_published_version_id, releaseId: family.releaseId });
  }

  const enabled = await invokeCi({ action: "ci_enable_gate" });
  if (enabled?.success !== true) {
    throw new Error("C-03 gate activation was rejected: " + JSON.stringify(enabled));
  }

  const finalSettings = await requestJson(
    fetchImpl,
    url + "/rest/v1/assessment_config_release_settings?select=singleton,enabled&singleton=eq.true",
    { headers },
  );
  if (!Array.isArray(finalSettings) || finalSettings.length !== 1 || finalSettings[0].enabled !== true) {
    throw new Error("C-03 gate activation did not persist as enabled.");
  }

  return {
    success: true,
    gateEnabled: true,
    activated,
    note: "Runtime attestation and all five releases were verified before gate activation.",
  };
}

async function main() {
  const result = await executeC03ProductionRelease({
    baseUrl: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

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

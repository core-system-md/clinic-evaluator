import { pathToFileURL } from "node:url";
import { verifyDeployedAttestation } from "./c03-release-attestation.mjs";

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
  ownerJwt,
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
  const owner = requireValue(ownerJwt, "C03_OWNER_JWT");
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
    ownerJwt: owner,
    fetchImpl,
  });

  const invokeOwner = async (body) => requestJson(
    fetchImpl,
    url + "/functions/v1/assessment-config-release",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anon,
        "Authorization": "Bearer " + owner,
      },
      body: JSON.stringify(body),
    },
  );

  const registered = [];
  for (const family of families) {
    const result = await invokeOwner({
      action: "register",
      assessment_type_id: family.current_published_version_id,
    });
    const releaseId = String(result?.data?.release_id || "").trim();
    if (result?.success !== true || !releaseId) {
      throw new Error("Release registration did not return a release ID for " + family.slug + ": " + JSON.stringify(result));
    }
    registered.push({ ...family, releaseId });
  }

  // Verify all five first. Do not activate any family if any attestation is rejected.
  const verified = [];
  for (const family of registered) {
    const result = await invokeOwner({ action: "verify", release_id: family.releaseId });
    if (result?.success !== true || result?.data?.state !== "VERIFIED") {
      throw new Error("Release verification failed for " + family.slug + ": " + JSON.stringify(result));
    }
    verified.push(family);
  }

  const activated = [];
  for (const family of verified) {
    const result = await invokeOwner({
      action: "activate_existing",
      release_id: family.releaseId,
      expected_published_version_id: family.current_published_version_id,
    });
    if (result?.success !== true) {
      throw new Error("Release activation failed for " + family.slug + ": " + JSON.stringify(result));
    }
    activated.push({ slug: family.slug, versionId: family.current_published_version_id, releaseId: family.releaseId });
  }

  const enabled = await invokeOwner({ action: "enable_gate" });
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
    ownerJwt: process.env.C03_OWNER_JWT,
    confirmation: process.env.C03_PRODUCTION_RELEASE_CONFIRMATION,
    verifyAttestation: async ({ assessmentTypeId, baseUrl, anonKey, ownerJwt, fetchImpl }) => {
      process.env.SUPABASE_URL = baseUrl;
      process.env.SUPABASE_ANON_KEY = anonKey;
      process.env.C03_OWNER_JWT = ownerJwt;
      process.env.C03_ASSESSMENT_TYPE_ID = assessmentTypeId;
      // Reuse the same injected fetch implementation for deterministic testing.
      const expectedVerifier = await import("./c03-release-attestation.mjs");
      if (fetchImpl !== fetch) {
        const expected = await expectedVerifier.buildRuntimeAttestation({
          commitSha: process.env.GITHUB_SHA || process.env.C03_GIT_COMMIT_SHA || undefined,
        });
        const compare = async (endpoint, body, token) => {
          const response = await fetchImpl(baseUrl + "/functions/v1/" + endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: "Bearer " + token },
            body: JSON.stringify(body),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.success !== true) throw new Error("Read-only attestation failed for " + endpoint);
          const actual = endpoint === "assessment-config-release"
            ? payload?.data?.runtimeMetadata
            : payload?.data?.runtimeMetadata;
          for (const key of ["schemaVersion", "gitCommitSha", "edgeReleaseRef", "fixtureSetVersion", "migrationContractVersion"]) {
            if (actual?.[key] !== expected[key]) throw new Error("Attestation mismatch for " + endpoint + "." + key);
          }
        };
        await compare("assessment-config-release", { action: "export", assessment_type_id: assessmentTypeId }, ownerJwt);
        await compare("assessment-access", { action: "c03_runtime_attestation" }, anonKey);
      } else {
        await verifyDeployedAttestation();
      }
    },
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

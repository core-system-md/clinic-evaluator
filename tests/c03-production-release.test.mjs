import test from "node:test";
import assert from "node:assert/strict";
import {
  executeC03ProductionRelease,
  REQUIRED_FAMILY_SLUGS,
} from "../.github/scripts/c03-production-release.mjs";

const families = REQUIRED_FAMILY_SLUGS.map((slug, index) => ({
  id: "family-" + index,
  slug,
  current_published_version_id: "version-" + index,
}));

function fakeFetch({ rejectVerifySlug = null } = {}) {
  const calls = [];
  let enabled = false;
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || "GET", body: options.body ? JSON.parse(options.body) : null });
    if (url.includes("/assessment_config_release_settings")) {
      return response([{ singleton: true, enabled }]);
    }
    if (url.includes("/rest/v1/assessment_families")) return response(families);
    const body = JSON.parse(options.body || "{}");
    if (body.action === "register") {
      return response({ success: true, data: { release_id: "release-" + body.assessment_type_id, assessment_type_id: body.assessment_type_id, state: "PREPARED" } });
    }
    if (body.action === "verify") {
      const reject = rejectVerifySlug && body.release_id === "release-version-" + families.find(f => f.slug === rejectVerifySlug)?.current_published_version_id;
      return response(reject
        ? { success: false, data: { state: "REJECTED" } }
        : { success: true, data: { state: "VERIFIED" } });
    }
    if (body.action === "activate_existing") return response({ success: true, data: { state: "PUBLISHED" } });
    if (body.action === "enable_gate") {
      enabled = true;
      return response({ success: true, data: { enabled: true } });
    }
    return response({ error: "unexpected action" }, 400);
  };
  return { fetchImpl, calls, isEnabled: () => enabled };
}

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("C-03 production release requires the explicit confirmation before network calls", async () => {
  const { fetchImpl, calls } = fakeFetch();
  await assert.rejects(
    executeC03ProductionRelease({
      baseUrl: "https://example.supabase.co",
      anonKey: "anon",
      serviceRoleKey: "service",
      ownerJwt: "owner",
      confirmation: "",
      fetchImpl,
      verifyAttestation: async () => {},
    }),
    /exact confirmation/,
  );
  assert.equal(calls.length, 0);
});


test("C-03 production release performs no writes when deployed bundle attestation fails", async () => {
  const { fetchImpl, calls, isEnabled } = fakeFetch();
  await assert.rejects(
    executeC03ProductionRelease({
      baseUrl: "https://example.supabase.co",
      anonKey: "anon",
      serviceRoleKey: "service",
      ownerJwt: "owner",
      confirmation: "ENABLE-C03-PRODUCTION",
      fetchImpl,
      verifyAttestation: async () => {
        throw new Error("deployed bundle mismatch");
      },
    }),
    /deployed bundle mismatch/,
  );
  assert.equal(calls.filter(call => call.method === "POST").length, 0);
  assert.equal(isEnabled(), false);
});

test("C-03 release verifies all five bundles and versions before enabling the gate", async () => {
  const { fetchImpl, calls, isEnabled } = fakeFetch();
  const result = await executeC03ProductionRelease({
    baseUrl: "https://example.supabase.co/",
    anonKey: "anon",
    serviceRoleKey: "service",
    ownerJwt: "owner",
    confirmation: "ENABLE-C03-PRODUCTION",
    fetchImpl,
    verifyAttestation: async ({ assessmentTypeId }) => {
      assert.equal(assessmentTypeId, families[0].current_published_version_id);
    },
  });
  assert.equal(result.success, true);
  assert.equal(result.gateEnabled, true);
  assert.equal(result.activated.length, 5);
  assert.equal(isEnabled(), true);
  const actions = calls.filter(call => call.method === "POST").map(call => call.body.action);
  assert.equal(actions.filter(action => action === "register").length, 5);
  assert.equal(actions.filter(action => action === "verify").length, 5);
  assert.equal(actions.filter(action => action === "activate_existing").length, 5);
  assert.equal(actions.at(-1), "enable_gate");
});

test("C-03 release stops before any activation if one published version fails verification", async () => {
  const rejectedSlug = "patient-journey";
  const { fetchImpl, calls, isEnabled } = fakeFetch({ rejectVerifySlug: rejectedSlug });
  await assert.rejects(
    executeC03ProductionRelease({
      baseUrl: "https://example.supabase.co",
      anonKey: "anon",
      serviceRoleKey: "service",
      ownerJwt: "owner",
      confirmation: "ENABLE-C03-PRODUCTION",
      fetchImpl,
      verifyAttestation: async () => {},
    }),
    /Release verification failed/,
  );
  const actions = calls.filter(call => call.method === "POST").map(call => call.body.action);
  assert.equal(actions.includes("activate_existing"), false);
  assert.equal(actions.includes("enable_gate"), false);
  assert.equal(isEnabled(), false);
});

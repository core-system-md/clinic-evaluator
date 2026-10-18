import test from "node:test";
import assert from "node:assert/strict";
import {
  executeC03ProductionRelease,
  REQUIRED_FAMILY_SLUGS,
} from "../.github/scripts/c03-production-release.mjs";

const workflowSha = "a".repeat(40);
const workflowRunId = "12345";
const families = REQUIRED_FAMILY_SLUGS.map((slug, index) => ({
  id: "family-" + index,
  slug,
  current_published_version_id: "version-" + index,
  current_release_id: null,
}));

function fakeFetch({ rejectVerifySlug = null } = {}) {
  const calls = [];
  const releases = [];
  let enabled = false;
  let enabledByRunId = null;
  let enabledBySha = null;

  const fetchImpl = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({
      url,
      method: options.method || "GET",
      body,
      headers: options.headers || {},
    });

    if (!url.includes("/functions/v1/assessment-config-release") || options.method !== "POST") {
      return response({ error: "unexpected request" }, 400);
    }
    if (options.headers?.["Authorization"] !== "Bearer anon" ||
        options.headers?.["apikey"] !== "anon" ||
        !options.headers?.["x-c03-github-oidc"]) {
      return response({ error: "runner must use anon plus OIDC only" }, 401);
    }

    if (body.action === "ci_inventory") {
      return response({
        success: true,
        data: {
          settings: {
            singleton: true,
            enabled,
            enabled_by_workflow_run_id: enabledByRunId,
            enabled_by_workflow_sha: enabledBySha,
          },
          releaseRows: releases.length,
          families,
          releases: releases.filter((release) => release.git_commit_sha === workflowSha),
          ciRpcReady: true,
          releaseIdentity: { runId: workflowRunId, sha: workflowSha },
        },
      });
    }

    if (body.action === "ci_register") {
      const family = families.find((item) => item.current_published_version_id === body.assessment_type_id);
      if (!family) return response({ error: "unknown assessment version" }, 404);
      let release = releases.find((item) => item.assessment_type_id === family.current_published_version_id);
      if (!release) {
        release = {
          id: "release-" + body.assessment_type_id,
          family_id: family.id,
          assessment_type_id: family.current_published_version_id,
          git_commit_sha: workflowSha,
          config_digest: "b".repeat(64),
          interpretation_registry_digest: "c".repeat(64),
          edge_release_ref: "sha256:" + "d".repeat(64),
          state: "PREPARED",
          verified_config_digest: null,
          verified_registry_digest: null,
          verified_git_commit_sha: null,
          verified_edge_release_ref: null,
        };
        releases.push(release);
      }
      return response({
        success: true,
        data: {
          release_id: release.id,
          assessment_type_id: release.assessment_type_id,
          state: release.state,
        },
      });
    }
    if (body.action === "ci_verify") {
      const release = releases.find((item) => item.id === body.release_id);
      const family = families.find((item) => item.slug === rejectVerifySlug);
      if (!release) return response({ error: "release not found" }, 404);
      if (family && release.assessment_type_id === family.current_published_version_id) {
        return response({ success: false, data: { state: "REJECTED" } });
      }
      release.state = "VERIFIED";
      release.verified_config_digest = release.config_digest;
      release.verified_registry_digest = release.interpretation_registry_digest;
      release.verified_git_commit_sha = release.git_commit_sha;
      release.verified_edge_release_ref = release.edge_release_ref;
      return response({ success: true, data: { state: "VERIFIED" } });
    }
    if (body.action === "ci_activate_existing") {
      const release = releases.find((item) => item.id === body.release_id);
      const family = families.find((item) => item.id === release?.family_id);
      if (!release || !family) return response({ error: "release not found" }, 404);
      release.state = "PUBLISHED";
      family.current_release_id = release.id;
      return response({ success: true, data: { state: "PUBLISHED" } });
    }
    if (body.action === "ci_enable_gate") {
      enabled = true;
      enabledByRunId = workflowRunId;
      enabledBySha = workflowSha;
      return response({ success: true, data: { enabled: true } });
    }
    return response({ error: "unexpected action: " + body.action }, 400);
  };
  return { fetchImpl, calls, isEnabled: () => enabled };
}

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const common = (fetchImpl, confirmation = "ENABLE-C03-PRODUCTION", options = {}) => ({
  baseUrl: "https://example.supabase.co/",
  anonKey: "anon",
  getOidcToken: async () => "signed-oidc",
  confirmation,
  fetchImpl,
  verifyAttestation: async ({ assessmentTypeId }) => {
    assert.equal(assessmentTypeId, families[0].current_published_version_id);
  },
  ...options,
});

test("C-03 production release requires explicit confirmation before network calls", async () => {
  const { fetchImpl, calls } = fakeFetch();
  await assert.rejects(
    executeC03ProductionRelease(common(fetchImpl, "")),
    /exact confirmation/,
  );
  assert.equal(calls.length, 0);
});

test("C-03 release requires no service-role key in the workflow runner", async () => {
  const { fetchImpl, isEnabled } = fakeFetch();
  const result = await executeC03ProductionRelease(common(fetchImpl));
  assert.equal(result.success, true);
  assert.equal(result.gateEnabled, true);
  assert.equal(result.verifiedFamilyCount, 5);
  assert.equal(isEnabled(), true);
});

test("C-03 production release performs no writes when deployed bundle attestation fails", async () => {
  const { fetchImpl, calls, isEnabled } = fakeFetch();
  await assert.rejects(
    executeC03ProductionRelease(common(fetchImpl, "ENABLE-C03-PRODUCTION", {
      verifyAttestation: async () => { throw new Error("deployed bundle mismatch"); },
    })),
    /deployed bundle mismatch/,
  );
  const mutatingActions = calls
    .filter((call) => call.body)
    .map((call) => call.body.action)
    .filter((action) => ["ci_register", "ci_verify", "ci_activate_existing", "ci_enable_gate"].includes(action));
  assert.deepEqual(mutatingActions, []);
  assert.equal(isEnabled(), false);
});

test("C-03 release stops before any activation if one published version fails verification", async () => {
  const rejectedSlug = "patient-journey";
  const { fetchImpl, calls, isEnabled } = fakeFetch({ rejectVerifySlug: rejectedSlug });
  await assert.rejects(
    executeC03ProductionRelease(common(fetchImpl)),
    /Release verification failed/,
  );
  const actions = calls
    .filter((call) => call.body)
    .map((call) => call.body.action);
  assert.equal(actions.includes("ci_activate_existing"), false);
  assert.equal(actions.includes("ci_enable_gate"), false);
  assert.equal(isEnabled(), false);
});

test("the release runner sends only anon API authorization and a verified OIDC header", async () => {
  const { fetchImpl, calls } = fakeFetch();
  await executeC03ProductionRelease(common(fetchImpl));
  for (const call of calls) {
    if (!call.body) continue;
    assert.equal(call.headers.Authorization, "Bearer anon");
    assert.equal(call.headers.apikey, "anon");
    assert.equal(call.headers["x-c03-github-oidc"], "signed-oidc");
    assert.equal(Object.keys(call.headers).some((key) => /service.role/i.test(key)), false);
  }
});

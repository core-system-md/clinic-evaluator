import { readFile, writeFile } from "node:fs/promises";

const PROJECT = "oaqpzaarppccbnepffxx";
const EVIDENCE_PATH = "c02-value70-live-e2e-result.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error("Missing required cleanup setting: " + name);
  return value;
}

function inFilter(values) {
  return "in.(" + values.join(",") + ")";
}

async function requestJson(baseUrl, serviceKey, path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error("C-03 E2E cleanup HTTP " + response.status + " for " + path + ": " + JSON.stringify(body));
  }
  return body;
}

async function main() {
  const baseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  assert(baseUrl === "https://oaqpzaarppccbnepffxx.supabase.co", "Refusing cleanup against an unexpected Supabase project URL.");

  const evidence = JSON.parse(await readFile(EVIDENCE_PATH, "utf8"));
  assert(evidence.project === PROJECT, "Evidence project does not match the authorized Production project.");
  assert(/^c02-value70-\d+-[0-9a-f]+$/.test(String(evidence.run_id || "")), "Evidence run ID is not a recognized C-02 synthetic run.");
  const created = evidence.created || {};
  const leadIds = [...new Set(created.leadIds || [])];
  const sessionIds = [...new Set(created.sessionIds || [])];
  const tokenHashes = [...new Set(created.tokenHashes || [])];
  const emails = [...new Set(created.emails || [])];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert(leadIds.every((id) => uuid.test(id)), "Evidence contains a malformed lead ID.");
  assert(sessionIds.every((id) => uuid.test(id)), "Evidence contains a malformed session ID.");
  assert(tokenHashes.every((hash) => /^[0-9a-f]{64}$/.test(hash)), "Evidence contains a malformed token hash.");
  assert(emails.every((email) => typeof email === "string" && email.endsWith("@example.invalid")), "Evidence contains a non-synthetic email.");
  assert(leadIds.length === 0 || emails.length >= leadIds.length, "Not enough synthetic email evidence to scope lead deletion.");

  const settings = await requestJson(baseUrl, serviceKey, "/rest/v1/assessment_config_release_settings?select=singleton,enabled&singleton=eq.true");
  assert(Array.isArray(settings) && settings.length === 1 && settings[0].enabled === true, "C-03 release gate is not enabled; refusing post-release E2E cleanup workflow.");

  const ids = [...leadIds, ...sessionIds];
  const preflightLeads = leadIds.length
    ? await requestJson(baseUrl, serviceKey, "/rest/v1/leads?select=id,source,email&id=" + encodeURIComponent(inFilter(leadIds)))
    : [];
  assert(Array.isArray(preflightLeads), "Lead preflight returned a malformed response.");
  for (const lead of preflightLeads) {
    assert(leadIds.includes(lead.id), "Lead preflight returned an unexpected ID.");
    assert(lead.source === evidence.run_id, "Refusing to delete a lead without this exact synthetic run marker: " + lead.id);
    assert(emails.includes(lead.email) && lead.email.endsWith("@example.invalid"), "Refusing to delete a lead without the exact synthetic email marker: " + lead.id);
  }

  const preflightSessions = sessionIds.length
    ? await requestJson(baseUrl, serviceKey, "/rest/v1/sessions?select=id,lead_id,assessment_type_id&id=" + encodeURIComponent(inFilter(sessionIds)))
    : [];
  assert(Array.isArray(preflightSessions), "Session preflight returned a malformed response.");
  for (const session of preflightSessions) {
    assert(sessionIds.includes(session.id), "Session preflight returned an unexpected ID.");
    assert(session.lead_id == null || leadIds.includes(session.lead_id), "Session is not linked to an exact run-owned lead: " + session.id);
  }

  const deleted = { leads: [], accessRows: [] };
  if (leadIds.length) {
    const filters = "id=" + encodeURIComponent(inFilter(leadIds)) +
      "&source=eq." + encodeURIComponent(evidence.run_id) +
      "&email=" + encodeURIComponent(inFilter(emails));
    const rows = await requestJson(baseUrl, serviceKey, "/rest/v1/leads?" + filters, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    assert(Array.isArray(rows), "Lead cleanup did not return deleted row identities.");
    assert(rows.every((row) => leadIds.includes(row.id) && row.source === evidence.run_id && emails.includes(row.email)), "Lead cleanup returned a row outside the exact run scope.");
    deleted.leads = rows.map((row) => row.id);
  }

  if (tokenHashes.length) {
    const rows = await requestJson(baseUrl, serviceKey, "/rest/v1/assessment_session_access?token_hash=" + encodeURIComponent(inFilter(tokenHashes)), {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });
    assert(Array.isArray(rows), "Access-token cleanup did not return deleted row identities.");
    assert(rows.every((row) => tokenHashes.includes(row.token_hash)), "Access-token cleanup returned an unexpected token hash.");
    deleted.accessRows = rows.map((row) => row.id);
  }

  const residue = {};
  const checks = [
    ["leads", leadIds.length ? "/rest/v1/leads?select=id&id=" + encodeURIComponent(inFilter(leadIds)) : null],
    ["sessions", sessionIds.length ? "/rest/v1/sessions?select=id&id=" + encodeURIComponent(inFilter(sessionIds)) : null],
    ["results", sessionIds.length ? "/rest/v1/assessment_results?select=id,session_id&session_id=" + encodeURIComponent(inFilter(sessionIds)) : null],
    ["answers", sessionIds.length ? "/rest/v1/answers?select=id,session_id&session_id=" + encodeURIComponent(inFilter(sessionIds)) : null],
    ["scores", sessionIds.length ? "/rest/v1/scores?select=id,session_id&session_id=" + encodeURIComponent(inFilter(sessionIds)) : null],
    ["snapshots", sessionIds.length ? "/rest/v1/historical_snapshots?select=id,session_id&session_id=" + encodeURIComponent(inFilter(sessionIds)) : null],
    ["session_access_by_token", tokenHashes.length ? "/rest/v1/assessment_session_access?select=id,token_hash&token_hash=" + encodeURIComponent(inFilter(tokenHashes)) : null],
    ["session_access_by_session", sessionIds.length ? "/rest/v1/assessment_session_access?select=id,session_id&session_id=" + encodeURIComponent(inFilter(sessionIds)) : null],
  ];
  for (const [name, path] of checks) {
    const rows = path ? await requestJson(baseUrl, serviceKey, path) : [];
    assert(Array.isArray(rows), "Residue check returned malformed rows for " + name);
    residue[name] = rows.length;
  }
  assert(Object.values(residue).every((count) => count === 0), "Run-scoped Production residue remains: " + JSON.stringify(residue));

  evidence.cleanup = {
    status: "VERIFIED",
    verified: true,
    run_id: evidence.run_id,
    deleted,
    residue,
    verified_at: new Date().toISOString(),
    note: "Only exact run-owned synthetic lead IDs (with exact source marker and example.invalid email) and exact emitted token hashes were deleted; all tracked dependent rows were checked for zero residue.",
  };
  await writeFile(EVIDENCE_PATH, JSON.stringify(evidence, null, 2), "utf8");
  console.log("C03_E2E_CLEANUP_VERIFIED=" + JSON.stringify(evidence.cleanup));
}

main().catch(async (error) => {
  try {
    const evidence = JSON.parse(await readFile(EVIDENCE_PATH, "utf8"));
    evidence.cleanup = {
      status: "FAILED",
      verified: false,
      error: error instanceof Error ? error.message : String(error),
      failed_at: new Date().toISOString(),
    };
    await writeFile(EVIDENCE_PATH, JSON.stringify(evidence, null, 2), "utf8");
  } catch {}
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

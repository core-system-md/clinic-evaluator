import { writeFileSync } from "node:fs";
import crypto from "node:crypto";

const EDGE_URL = process.env.EDGE_URL;
const LIVE_PROJECT_MARKER = "oaqpzaarppccbnepffxx";

function assertLiveE2EOptIn() {
  if (String(EDGE_URL || "").includes(LIVE_PROJECT_MARKER) && process.env.ALLOW_LIVE_E2E !== "true") {
    throw new Error("Refusing to write E2E test data to production without ALLOW_LIVE_E2E=true.");
  }
}
const ASSESSMENT_SLUG = process.env.ASSESSMENT_SLUG || "admin-reception-assessment";
const result = {
  started_at: new Date().toISOString(),
  endpoint: EDGE_URL,
  assessment_slug: ASSESSMENT_SLUG,
  checks: [],
};

function record(name, ok, details = {}) {
  result.checks.push({ name, ok, ...details });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`);
  if (details.summary) console.log(details.summary);
}

async function call(action, data = {}) {
  const response = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  assert(EDGE_URL, "EDGE_URL is missing");
  assertLiveE2EOptIn();

  // 1. Catalog: proves the runner can reach the production Edge Function externally.
  const catalog = await call("get_catalog");
  assert(catalog.status === 200 && catalog.body?.success === true, `get_catalog failed: HTTP ${catalog.status}`);
  assert(Array.isArray(catalog.body.data), "get_catalog did not return data[]");
  const family = catalog.body.data.find((x) => x.slug === ASSESSMENT_SLUG);
  assert(family, `Assessment family not found: ${ASSESSMENT_SLUG}`);
  record("external reachability + get_catalog", true, {
    http_status: catalog.status,
    published_family_count: catalog.body.data.length,
  });

  // 2. Content: verifies stable public slug and a complete published graph.
  const content = await call("get_content", { assessment_key: ASSESSMENT_SLUG });
  assert(content.status === 200 && content.body?.success === true, `get_content failed: HTTP ${content.status}`);
  const assessment = content.body.data;
  assert(assessment.slug === ASSESSMENT_SLUG, "Public slug is not the stable family slug");
  assert(Array.isArray(assessment.questions) && assessment.questions.length > 0, "No questions returned");
  assert(Array.isArray(assessment.axes) && assessment.axes.length > 0, "No axes returned");
  record("get_content published-version resolution", true, {
    http_status: content.status,
    question_count: assessment.questions.length,
    axis_count: assessment.axes.length,
    public_slug: assessment.slug,
  });

  // 3. Public access: must issue access for the current published version.
  const access = await call("issue_public_access", { assessment_key: ASSESSMENT_SLUG });
  assert(access.status === 200 && access.body?.success === true, `issue_public_access failed: HTTP ${access.status}`);
  const token = access.body?.data?.token;
  const assessmentTypeId = access.body?.data?.assessment_type_id;
  assert(typeof token === "string" && token.length >= 20, "No valid access token returned");
  assert(typeof assessmentTypeId === "string" && assessmentTypeId.length > 10, "No assessment_type_id returned");
  record("issue_public_access", true, {
    http_status: access.status,
    assessment_type_id: assessmentTypeId,
    token_issued: true,
  });

  // 4. Start a synthetic production session.
  const suffix = crypto.randomBytes(6).toString("hex");
  const attemptKey = `p2-external-e2e-${ASSESSMENT_SLUG}-${suffix}`;
  const start = await call("start_session", {
    token,
    attempt_key: attemptKey,
    lead: {
      full_name: `P2 External E2E ${suffix}`,
      email: `p2-e2e-${suffix}@example.invalid`,
    },
  });
  assert(start.status === 200 && start.body?.success === true, `start_session failed: HTTP ${start.status}`);
  const sessionId = start.body?.data?.session_id;
  assert(typeof sessionId === "string" && sessionId.length > 10, "No session_id returned");
  record("start_session", true, { http_status: start.status, session_created: true });

  // 5. Session access: verifies the issued token is bound to the created session.
  const session = await call("get_session", { token });
  assert(session.status === 200 && session.body?.success === true, `get_session failed: HTTP ${session.status}`);
  assert(session.body?.data?.session?.id === sessionId, "Returned session does not match created session");
  record("get_session token binding", true, { http_status: session.status });

  // 6. Save one valid answer and verify the runtime accepts the published question/option graph.
  const firstQuestion = assessment.questions[0];
  assert(Array.isArray(firstQuestion.options) && firstQuestion.options.length > 0, "First question has no options");
  const firstOption = firstQuestion.options[0];
  const answer = await call("save_answer", {
    token,
    question_id: firstQuestion.id,
    option_index: Number(firstOption.index),
    current_question: 1,
  });
  assert(answer.status === 200 && answer.body?.success === true, `save_answer failed: HTTP ${answer.status}`);
  record("save_answer against published graph", true, { http_status: answer.status });

  // 7. Negative auth boundary: a fake token must not access a session.
  const bad = await call("get_session", { token: "invalid-p2-e2e-token" });
  assert(bad.status === 401, `Invalid token returned HTTP ${bad.status}, expected 401`);
  record("invalid token rejected", true, { http_status: bad.status });

  result.finished_at = new Date().toISOString();
  result.success = true;
  writeFileSync("p2-external-e2e-result.json", JSON.stringify(result, null, 2));
  console.log("P2 external E2E verification completed successfully.");
} catch (error) {
  result.finished_at = new Date().toISOString();
  result.success = false;
  result.error = error instanceof Error ? error.message : String(error);
  writeFileSync("p2-external-e2e-result.json", JSON.stringify(result, null, 2));
  console.error(result.error);
  process.exit(1);
}

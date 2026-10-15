import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

async function exerciseProtectedCompletion(slug: string, registryFile: string, interpretationVersion: number, expectedPurpose: string, importSuffix: string) {
  const registry = JSON.parse(await Deno.readTextFile(
    new URL("../supabase/functions/assessment-access/" + registryFile, import.meta.url),
  ));
  const entries = registry.entries.filter((entry: any) =>
    entry.assessmentSlug === slug &&
    entry.interpretationVersion === interpretationVersion
  );
  assert(entries.length > 0, "fixture registry entries must exist");

  const byQuestion = new Map<string, any[]>();
  for (const entry of entries) {
    const list = byQuestion.get(entry.questionCode) ?? [];
    list.push(entry);
    byQuestion.set(entry.questionCode, list);
  }

  const axisCodes = [...new Set(entries.map((entry: any) => entry.axisCode))] as string[];
  const axisIds = new Map(axisCodes.map((code, index) => [
    code,
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  ]));
  const axes = axisCodes.map((code, index) => ({
    id: axisIds.get(code),
    code,
    title: code,
    title_ar: code,
    weight: 100 / axisCodes.length,
    display_order: index + 1,
  }));

  const questions = [...byQuestion.entries()].map(([code, questionEntries], index) => ({
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    code,
    axis_id: axisIds.get(questionEntries[0].axisCode),
    question_text: code,
    question_text_ar: code,
    question_type: "select",
    display_order: index + 1,
    is_required: true,
    impact: "medium",
    layer: "A",
    trap_for: null,
  }));
  const questionIdByCode = new Map(questions.map((question) => [question.code, question.id]));
  const options = entries.map((entry: any, index: number) => ({
    id: entry.optionId,
    question_id: questionIdByCode.get(entry.questionCode),
    option_index: entry.optionIndex,
    option_value: entry.sourceOptionValue,
    label: entry.semanticStateLabel,
    label_ar: entry.semanticStateLabel,
    is_trap: entry.sourceIsTrap,
    display_order: index + 1,
  }));
  const answers = [...byQuestion.entries()].map(([questionCode, questionEntries]) => {
    const option = [...questionEntries].sort((a, b) => a.optionIndex - b.optionIndex)[0];
    return {
      id: `20000000-0000-4000-8000-${String(answersIndex(questionCode, [...byQuestion.keys()])).padStart(12, "0")}`,
      question_id: questionCode,
      option_index: option.optionIndex,
      option_value: option.sourceOptionValue,
      answer_value: option.sourceOptionValue,
      chosen_option_label: option.semanticStateLabel,
      is_trap: option.sourceIsTrap,
      trap_triggered: false,
      answered_at: "2026-10-15T00:00:00.000Z",
    };
  });

  const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const assessmentTypeId = "99999999-9999-4999-8999-999999999999";
  const protectedUserId = "33333333-3333-4333-8333-333333333333";
  const token = "c03-isolated-protected-token";
  const tokenHashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const tokenHash = [...new Uint8Array(tokenHashBytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const family = {
    id: "88888888-8888-4888-8888-888888888888",
    slug,
  };
  const assessment = {
    id: assessmentTypeId,
    slug: family.slug,
    family_id: family.id,
    title_ar: "اختبار معزول",
    title_en: "Isolated test",
    description: "Isolated C-03 regression fixture",
    question_count: questions.length,
    axis_count: axes.length,
    has_traps: true,
    has_ev_simulator: false,
    version: 1,
    config_version: 1,
    axis_roles: {},
    kpi_mappings: {},
    ev_mappings: {},
  };
  const session = {
    id: sessionId,
    lead_id: null,
    assessment_type_id: assessmentTypeId,
    assessment_user_id: protectedUserId,
    assessment_version: 1,
    status: "in_progress",
  };
  const access = {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    session_id: sessionId,
    assessment_user_id: protectedUserId,
    assessment_type_id: assessmentTypeId,
    token_hash: tokenHash,
    expires_at: "2099-10-15T00:00:00.000Z",
    revoked_at: null,
  };
  const calls: Array<{ path: string; body?: any }> = [];

  const originalFetch = globalThis.fetch;
  const oldUrl = Deno.env.get("SUPABASE_URL");
  const oldKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  Deno.env.set("SUPABASE_URL", "http://127.0.0.1");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "isolated-test-service-role-key");

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const bodyText = init?.body ? String(init.body) : "";
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    calls.push({ path: url.pathname, body });

    let value: any = null;
    if (url.pathname.endsWith("/rest/v1/assessment_session_access")) value = access;
    else if (url.pathname.endsWith("/rest/v1/sessions")) value = session;
    else if (url.pathname.endsWith("/rest/v1/leads")) value = null;
    else if (url.pathname.endsWith("/rest/v1/assessment_types")) value = assessment;
    else if (url.pathname.endsWith("/rest/v1/assessment_families")) value = family;
    else if (url.pathname.endsWith("/rest/v1/axes")) value = axes;
    else if (url.pathname.endsWith("/rest/v1/questions")) value = questions;
    else if (url.pathname.endsWith("/rest/v1/options")) value = options;
    else if (url.pathname.endsWith("/rest/v1/traps")) value = [];
    else if (url.pathname.endsWith("/rest/v1/assessment_interpretation_releases")) value = null;
    else if (url.pathname.endsWith("/rest/v1/rpc/prepare_assessment_submission")) {
      value = {
        success: true,
        already_completed: false,
        submission_snapshot: answers,
        submission_fingerprint: "c03-isolated-fingerprint",
        submission_economic_input: {},
      };
    } else if (url.pathname.endsWith("/rest/v1/rpc/complete_p4_assessment_from_result")) {
      value = {
        success: true,
        already_completed: false,
        session_id: sessionId,
        result: body?.p_result,
      };
    } else {
      return new Response(JSON.stringify({
        message: `Unexpected isolated Supabase request: ${method} ${url.pathname}`,
      }), { status: 500, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify(value), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-range": Array.isArray(value) ? `0-${Math.max(value.length - 1, 0)}/${value.length}` : "0-0/1",
      },
    });
  }) as typeof fetch;

  try {
    const { handler } = await import("../supabase/functions/assessment-access/index.ts?" + importSuffix);
    const response = await handler(new Request("http://edge.test", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ action: "complete", data: { token } }),
    }));
    const responseBody = await response.json();

    assertEquals(response.status, 200, JSON.stringify(responseBody));
    assertEquals(responseBody.success, true, JSON.stringify(responseBody));
    assertEquals(responseBody.data.session_id, sessionId);
    assertEquals(responseBody.data.assessment_version, 1);

    const rpcCalls = calls.filter((call) => call.path.includes("/rest/v1/rpc/"));
    assertEquals(rpcCalls.map((call) => call.path.split("/").pop()), [
      "prepare_assessment_submission",
      "complete_p4_assessment_from_result",
    ]);
    const completionPayload = rpcCalls[1].body;
    assertEquals(completionPayload.p_session_id, sessionId);
    assertEquals(completionPayload.p_access_token_hash, tokenHash);
    assertEquals(completionPayload.p_assessment_user_id, protectedUserId);
    assertEquals(completionPayload.p_submission_fingerprint, "c03-isolated-fingerprint");
    assertEquals(completionPayload.p_result.identity.sessionId, sessionId);
    assert(responseBody.data.userReport && typeof responseBody.data.userReport === "object", "completion must return a projected user report");
    assertEquals(responseBody.data.userReport.assessment.purpose, expectedPurpose, "handler must project the report model for the selected assessment family");
    // Strict mode must reject an unregistered version before lead/session/RPC writes.
    const oldGate = Deno.env.get("C03_RELEASE_GATE_ENFORCED");
    Deno.env.set("C03_RELEASE_GATE_ENFORCED", "true");
    const originalSessionId = access.session_id;
    access.session_id = null;
    const gateCallStart = calls.length;
    const gateResponse = await handler(new Request("http://edge.test", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ action: "start_session", data: { token, attempt_key: "gate-test-attempt" } }),
    }));
    const gateBody = await gateResponse.json();
    assertEquals(gateResponse.status, 503, JSON.stringify(gateBody));
    const gateCalls = calls.slice(gateCallStart);
    assert(gateCalls.some((call) => call.path.endsWith("/rest/v1/assessment_interpretation_releases")), "strict gate must check the current release");
    assert(!gateCalls.some((call) => call.path.endsWith("/rest/v1/rpc/start_public_assessment_session") || call.path.endsWith("/rest/v1/rpc/start_assessment_session")), "strict gate must block session creation RPCs");
    assert(!gateCalls.some((call) => call.path.endsWith("/rest/v1/leads")), "strict gate must block lead writes");
    access.session_id = originalSessionId;
    if (oldGate === undefined) Deno.env.delete("C03_RELEASE_GATE_ENFORCED");
    else Deno.env.set("C03_RELEASE_GATE_ENFORCED", oldGate);

  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) Deno.env.delete("SUPABASE_URL"); else Deno.env.set("SUPABASE_URL", oldUrl);
    if (oldKey === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY"); else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", oldKey);
  }
}

Deno.test("C-03 protected completion runs through the real Edge handler for all five family contracts", async () => {
  const fixtures = [
    ["admin-reception-assessment", "response-interpretation-registry-v1.json", 1, "جاهزية الإدارة والاستقبال وتنسيق التشغيل"],
    ["clinic-performance", "response-interpretation-registry-v1.json", 1, "أداء العيادة في التحويل والتواصل والاستبقاء"],
    ["comprehensive-clinic-assessment", "response-interpretation-registry-v2.json", 2, "الصورة التشغيلية الشاملة للعيادة"],
    ["medical-team-assessment", "response-interpretation-registry-v1.json", 1, "أداء الفريق الطبي في الثقة والتواصل والتحويل والعمل الجماعي"],
    ["patient-journey", "patient-journey-interpretation-registry-v2.json", 2, "جودة رحلة المريض من الثقة إلى الولاء"],
  ] as const;
  for (const [slug, registryFile, interpretationVersion, expectedPurpose] of fixtures) {
    await exerciseProtectedCompletion(slug, registryFile, interpretationVersion, expectedPurpose, "c03-" + slug);
  }
});

function answersIndex(questionCode: string, codes: string[]) {
  return codes.indexOf(questionCode) + 1;
}

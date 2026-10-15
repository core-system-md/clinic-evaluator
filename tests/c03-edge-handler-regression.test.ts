import { createAssessmentAccessHandler } from "../supabase/functions/assessment-access/index.ts";
import patientJourneyRegistry from "../supabase/functions/assessment-access/patient-journey-interpretation-registry-v2.json" with { type: "json" };


function assertEqual(actual: unknown, expected: unknown, message = "") {
  if (actual !== expected) {
    throw new Error(`assertEqual failed: expected ${String(expected)}, received ${String(actual)}${message ? " — " + message : ""}`);
  }
}
function assertOk(value: unknown, message = "") {
  if (!value) throw new Error(`assertOk failed${message ? ": " + message : ""}`);
}

type Row = Record<string, unknown>;

class MockQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private maxRows = Number.POSITIVE_INFINITY;
  private orders: Array<{ field: string; ascending: boolean }> = [];

  constructor(private table: string, private tables: Record<string, Row[]>) {}

  select(_columns?: string) { return this; }
  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value);
    return this;
  }
  is(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value);
    return this;
  }
  gt(field: string, value: unknown) {
    this.filters.push((row) => String(row[field]) > String(value));
    return this;
  }
  neq(field: string, value: unknown) {
    this.filters.push((row) => row[field] !== value);
    return this;
  }
  in(field: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[field]));
    return this;
  }
  order(field: string, options?: { ascending?: boolean }) {
    this.orders.push({ field, ascending: options?.ascending !== false });
    return this;
  }
  limit(count: number) { this.maxRows = count; return this; }

  private rows() {
    let rows = (this.tables[this.table] || [])
      .filter((row) => this.filters.every((filter) => filter(row)));
    for (const order of [...this.orders].reverse()) {
      rows = rows.slice().sort((a, b) => {
        const left = String(a[order.field] ?? "");
        const right = String(b[order.field] ?? "");
        return (left.localeCompare(right) || 0) * (order.ascending ? 1 : -1);
      });
    }
    return rows.slice(0, this.maxRows);
  }

  async maybeSingle() {
    const rows = this.rows();
    return { data: rows[0] ?? null, error: null };
  }
  async single() {
    const rows = this.rows();
    return { data: rows[0] ?? null, error: rows.length ? null : { message: "row not found" } };
  }
  then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
    return Promise.resolve({ data: this.rows(), error: null }).then(resolve, reject);
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function runtimeFixture(assessmentTypeId: string) {
  const familyId = "33333333-3333-4333-8333-333333333333";
  const entries = patientJourneyRegistry.entries.filter(
    (entry) => entry.assessmentSlug === "patient-journey" && Number(entry.interpretationVersion) === 2,
  );
  const axisCodes = ["A1", "A2", "A3", "A4", "A5"];
  const axes = axisCodes.map((code, index) => ({
    id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    assessment_type_id: assessmentTypeId,
    code,
    title: `Axis ${code}`,
    title_ar: `محور ${code}`,
    weight: 20,
    display_order: index + 1,
  }));
  const axisIdByCode = new Map(axes.map((axis) => [axis.code, axis.id]));
  const questionCodes = [...new Set(entries.map((entry) => entry.questionCode))].sort();
  const questionIdByCode = new Map(questionCodes.map((code, index) => [
    code,
    `q0000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  ]));
  const questionEntries = new Map<string, typeof entries[number]>();
  for (const entry of entries) if (!questionEntries.has(entry.questionCode)) questionEntries.set(entry.questionCode, entry);
  const questions = questionCodes.map((code, index) => {
    const entry = questionEntries.get(code)!;
    return {
      id: questionIdByCode.get(code)!,
      assessment_type_id: assessmentTypeId,
      axis_id: axisIdByCode.get(entry.axisCode)!,
      code,
      question_text: `Synthetic ${code}`,
      question_text_ar: `سؤال ${code}`,
      question_type: "single_choice",
      display_order: index + 1,
      is_required: true,
      impact: "NORMAL",
      layer: entry.measurementLayer || "P",
    };
  });
  const options = entries.map((entry) => ({
    id: entry.optionId,
    question_id: questionIdByCode.get(entry.questionCode)!,
    option_index: Number(entry.optionIndex),
    option_value: Number(entry.sourceOptionValue),
    label: `Option ${entry.optionIndex}`,
    label_ar: `خيار ${entry.optionIndex}`,
    is_trap: Boolean(entry.sourceIsTrap),
    display_order: Number(entry.optionIndex) + 1,
  }));
  const assessment = {
    id: assessmentTypeId,
    slug: "patient-journey",
    family_id: familyId,
    title_ar: "رحلة المريض",
    title_en: "Patient Journey",
    description: "Isolated synthetic regression fixture",
    version: 1,
    config_version: 1,
    question_count: questions.length,
    axis_count: axes.length,
    has_traps: false,
    has_ev_simulator: false,
    axis_roles: {},
    kpi_mappings: {},
    ev_mappings: {},
  };
  return {
    assessment,
    family: { id: familyId, slug: "patient-journey" },
    axes,
    questions,
    options,
    traps: [],
    answers: questions.map((question) => {
      const option = options.find((item) => item.question_id === question.id && item.option_index === 0)!;
      return {
        question_id: question.code,
        option_index: option.option_index,
        option_value: option.option_value,
      };
    }),
  };
}

function setup(assessmentUserId: string | null) {
  const token = "c03-isolated-test-token";
  const session = {
    id: "session-1111",
    lead_id: "lead-1111",
    assessment_type_id: "44444444-4444-4444-8444-444444444444",
    assessment_user_id: assessmentUserId,
    assessment_version: 1,
    status: "in_progress",
  };
  const runtime = runtimeFixture(session.assessment_type_id);
  const calls: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const tables: Record<string, Row[]> = {
    assessment_session_access: [{
      id: "access-1111",
      session_id: session.id,
      assessment_user_id: assessmentUserId,
      assessment_type_id: session.assessment_type_id,
      token_hash: "",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked_at: null,
    }],
    sessions: [session],
    leads: [{
      id: session.lead_id,
      assessment_type_id: session.assessment_type_id,
      full_name: "C03 isolated fixture",
      email: "c03-isolated@example.invalid",
      phone: null,
      completed: false,
    }],
    assessment_types: [runtime.assessment],
    assessment_families: [runtime.family],
    axes: runtime.axes,
    questions: runtime.questions,
    options: runtime.options,
    traps: runtime.traps,
  };
  const client = {
    from(table: string) { return new MockQuery(table, tables); },
    async rpc(name: string, payload: Record<string, unknown>) {
      calls.push({ name, payload });
      if (name === "prepare_assessment_submission") {
        return {
          data: {
            submission_snapshot: runtime.answers,
            submission_fingerprint: "b".repeat(64),
            submission_economic_input: {},
          },
          error: null,
        };
      }
      if (name === "complete_p4_assessment_from_result" || name === "complete_p4_public_assessment_from_result") {
        return { data: { success: true, already_completed: false, result: payload.p_result }, error: null };
      }
      throw new Error("Unexpected RPC: " + name);
    },
  };

  return {
    token,
    session,
    calls,
    tables,
    client,
    async ready() { tables.assessment_session_access[0].token_hash = await sha256Hex(token); },
  };
}

async function runComplete(assessmentUserId: string | null) {
  const fixture = setup(assessmentUserId);
  await fixture.ready();
  const handler = createAssessmentAccessHandler({ supabaseClient: fixture.client });
  const response = await handler(new Request("https://local.test/functions/v1/assessment-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", data: { token: fixture.token } }),
  }));
  return { ...fixture, response, body: await response.json() };
}

Deno.test("C-03 actual Edge handler routes protected completion through protected RPC", async () => {
  const userId = "22222222-2222-4222-8222-222222222222";
  const { response, body, calls, session } = await runComplete(userId);
  assertEqual(response.status, 200);
  assertEqual(body.success, true);
  assertEqual(calls[0].name, "prepare_assessment_submission");
  const completion = calls.find((call) => call.name.startsWith("complete_p4_"));
  assertOk(completion);
  assertEqual(completion.name, "complete_p4_assessment_from_result");
  assertEqual(completion.payload.p_assessment_user_id, userId);
  assertEqual(completion.payload.p_session_id, session.id);
  assertEqual(completion.payload.p_submission_fingerprint, "b".repeat(64));
  assertEqual("resolvedSelections" in (completion.payload.p_result as Row), false);
  assertEqual("axisPersistenceRows" in (completion.payload.p_result as Row), false);
  assertEqual(body.data.session_id, session.id);
});

Deno.test("C-03 actual Edge handler routes public completion only through public RPC", async () => {
  const { response, body, calls } = await runComplete(null);
  assertEqual(response.status, 200);
  assertEqual(body.success, true);
  const completion = calls.find((call) => call.name.startsWith("complete_p4_"));
  assertOk(completion);
  assertEqual(completion.name, "complete_p4_public_assessment_from_result");
  assertEqual("p_assessment_user_id" in completion.payload, false);
});

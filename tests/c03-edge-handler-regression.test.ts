import { strict as assert } from "node:assert";
import { createAssessmentAccessHandler } from "../supabase/functions/assessment-access/index.ts";

type Row = Record<string, unknown>;

class MockQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private maxRows = Number.POSITIVE_INFINITY;

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
  order(_field: string, _options?: unknown) { return this; }
  limit(count: number) { this.maxRows = count; return this; }

  private rows() {
    return (this.tables[this.table] || [])
      .filter((row) => this.filters.every((filter) => filter(row)))
      .slice(0, this.maxRows);
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

function setup(assessmentUserId: string | null) {
  const token = "c03-isolated-test-token";
  const session = {
    id: "session-1111",
    lead_id: "lead-1111",
    assessment_type_id: "assessment-1111",
    assessment_user_id: assessmentUserId,
    assessment_version: 1,
    status: "in_progress",
  };
  const structuredResult = {
    schemaVersion: "P3_STRUCTURED_RESULT_V1",
    status: "PRODUCTION",
    identity: {
      sessionId: session.id,
      assessmentTypeId: session.assessment_type_id,
      assessmentVersion: "1",
      resultId: "11111111-1111-4111-8111-111111111111",
    },
    provenance: { assessmentSlug: "patient-journey", assessmentConfigDigest: "a".repeat(64) },
    scores: { overallScore: 70, axes: [] },
    classification: { bandCode: "Q3" },
    kpis: [],
    resolvedSelections: [{ private: true }],
    axisPersistenceRows: [{ private: true }],
  };
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
  };
  const client = {
    from(table: string) { return new MockQuery(table, tables); },
    async rpc(name: string, payload: Record<string, unknown>) {
      calls.push({ name, payload });
      if (name === "prepare_assessment_submission") {
        return {
          data: {
            submission_snapshot: [{ question_id: "Q1", option_index: 0, option_value: 70 }],
            submission_fingerprint: "b".repeat(64),
            submission_economic_input: {},
          },
          error: null,
        };
      }
      if (name === "complete_p4_assessment_from_result" || name === "complete_p4_public_assessment_from_result") {
        return { data: { success: true, already_completed: false, result: structuredResult }, error: null };
      }
      throw new Error("Unexpected RPC: " + name);
    },
  };

  return {
    token,
    session,
    structuredResult,
    calls,
    tables,
    client,
    async ready() { tables.assessment_session_access[0].token_hash = await sha256Hex(token); },
  };
}

async function runComplete(assessmentUserId: string | null) {
  const fixture = setup(assessmentUserId);
  await fixture.ready();
  const handler = createAssessmentAccessHandler({
    supabaseClient: fixture.client,
    calculateAssessmentFn: (async () => ({
      result: fixture.structuredResult,
      scoreRows: [],
      provenance: {
        assessmentSlug: "patient-journey",
        assessmentVersion: 1,
        interpretationVersion: 2,
        scoringEngineVersion: "test-engine",
        scoringContractVersion: "test-contract",
        assessmentConfigDigest: "a".repeat(64),
      },
    })) as never,
    projectCompletionResponseFn: (() => ({
      userReport: { audience: "user", fixture: true },
      report: { audience: "user" },
    })) as never,
  });
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
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(calls[0].name, "prepare_assessment_submission");
  const completion = calls.find((call) => call.name.startsWith("complete_p4_"));
  assert.ok(completion);
  assert.equal(completion.name, "complete_p4_assessment_from_result");
  assert.equal(completion.payload.p_assessment_user_id, userId);
  assert.equal(completion.payload.p_session_id, session.id);
  assert.equal(completion.payload.p_submission_fingerprint, "b".repeat(64));
  assert.equal("resolvedSelections" in (completion.payload.p_result as Row), false);
  assert.equal("axisPersistenceRows" in (completion.payload.p_result as Row), false);
  assert.equal(body.data.session_id, session.id);
});

Deno.test("C-03 actual Edge handler routes public completion only through public RPC", async () => {
  const { response, body, calls } = await runComplete(null);
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  const completion = calls.find((call) => call.name.startsWith("complete_p4_"));
  assert.ok(completion);
  assert.equal(completion.name, "complete_p4_public_assessment_from_result");
  assert.equal("p_assessment_user_id" in completion.payload, false);
});

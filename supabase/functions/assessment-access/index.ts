import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { calculateAssessment } from "./score-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } },
);

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const MAX_PUBLIC_ISSUES = 30;
const WINDOW_MS = 60_000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function allowRate(ip: string, keyPart: string, maxAttempts: number) {
  const now = Date.now();
  const key = ip + ":" + keyPart.toLowerCase();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function getAccess(token: string) {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);

  const { data, error } = await supabase
    .from("assessment_session_access")
    .select("id, session_id, assessment_user_id, assessment_type_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, tokenHash };
}

async function requireSessionAccess(token: string) {
  const access = await getAccess(token);
  if (!access?.session_id) {
    return { error: "Invalid or expired assessment session", status: 401 as const };
  }
  return { access };
}

async function loadAssessment(assessmentTypeId: string) {
  const [{ data: assessment, error: assessmentError }, { data: axes, error: axesError }, { data: questions, error: questionsError }, { data: options, error: optionsError }, { data: traps, error: trapsError }] = await Promise.all([
    supabase
      .from("assessment_types")
      .select("id, slug, title_ar, title_en, description, question_count, axis_count, has_traps, has_ev_simulator, version, config_version, axis_roles, kpi_mappings, ev_mappings")
      .eq("id", assessmentTypeId)
      .maybeSingle(),
    supabase
      .from("axes")
      .select("id, code, title, title_ar, weight, display_order")
      .eq("assessment_type_id", assessmentTypeId)
      .order("display_order", { ascending: true }),
    supabase
      .from("questions")
      .select("id, code, axis_id, question_text, question_text_ar, question_type, display_order, is_required, impact, layer, trap_for")
      .eq("assessment_type_id", assessmentTypeId)
      .order("display_order", { ascending: true }),
    supabase
      .from("options")
      .select("id, question_id, option_index, option_value, label, label_ar, is_trap, display_order")
      .order("display_order", { ascending: true }),
    supabase
      .from("traps")
      .select("name, message, message_ar, question_id, validates, target_axis, penalty_base, penalty_max")
      .eq("assessment_type_id", assessmentTypeId),
  ]);

  if (assessmentError || axesError || questionsError || optionsError || trapsError) {
    throw assessmentError || axesError || questionsError || optionsError || trapsError;
  }
  if (!assessment) throw new Error("Assessment not found");

  const axisCodeById = new Map((axes || []).map((a) => [a.id, a.code]));
  const optionsByQuestion = new Map<string, any[]>();

  for (const option of options || []) {
    const list = optionsByQuestion.get(option.question_id) || [];
    list.push(option);
    optionsByQuestion.set(option.question_id, list);
  }

  const scoringQuestions = (questions || []).map((q) => ({
    code: q.code,
    axis_id: axisCodeById.get(q.axis_id) || "",
    layer: q.layer || "A",
    impact: q.impact || "medium",
    options: (optionsByQuestion.get(q.id) || []).map((o) => ({
      value: Number(o.option_value),
      is_trap: Boolean(o.is_trap),
    })),
  }));

  return {
    assessment,
    axes: axes || [],
    questions: questions || [],
    options: options || [],
    traps: traps || [],
    scoring: {
      axes: (axes || []).map((a) => ({
        code: a.code,
        name_ar: a.title_ar || a.title,
        name_en: a.title,
        weight: Number(a.weight) || 1,
      })),
      questions: scoringQuestions,
      traps: traps || [],
      axis_roles: assessment.axis_roles || {},
      kpi_mappings: assessment.kpi_mappings || {},
      ev_mappings: assessment.ev_mappings || {},
      simulator: {
        enabled: Boolean(assessment.has_ev_simulator),
        delta_c_max: 0.35,
      },
    },
  };
}

function safeContent(runtime: Awaited<ReturnType<typeof loadAssessment>>, requiresLogin: boolean) {
  return {
    id: runtime.assessment.id,
    slug: runtime.assessment.slug,
    title_ar: runtime.assessment.title_ar,
    title_en: runtime.assessment.title_en,
    description: runtime.assessment.description,
    question_count: runtime.assessment.question_count || runtime.questions.length,
    axis_count: runtime.assessment.axis_count || runtime.axes.length,
    has_traps: Boolean(runtime.assessment.has_traps),
    has_ev_simulator: Boolean(runtime.assessment.has_ev_simulator),
    version: runtime.assessment.version ?? runtime.assessment.config_version ?? 1,
    requires_login: requiresLogin,
    axes: runtime.axes.map((a) => ({
      id: a.code,
      name_ar: a.title_ar || a.title,
      name_en: a.title,
      description: a.description || null,
    })),
    questions: runtime.questions.map((q) => ({
      id: q.code,
      text: q.question_text_ar || q.question_text,
      type: q.question_type || "select",
      display_order: q.display_order,
      is_required: q.is_required !== false,
      options: runtime.options
        .filter((o) => o.question_id === q.id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((o) => ({
          index: o.option_index,
          label: o.label_ar || o.label,
        })),
    })),
  };
}

async function getRequiresLogin(assessmentKey: string) {
  const { data, error } = await supabase
    .from("assessment_settings")
    .select("auth_enabled")
    .eq("assessment_key", assessmentKey)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.auth_enabled);
}

function sessionFilter(query: any, access: any) {
  const base = query.eq("id", access.session_id);
  return access.assessment_user_id === null
    ? base.is("assessment_user_id", null)
    : base.eq("assessment_user_id", access.assessment_user_id);
}

async function findLeadHistory(assessmentTypeId: string, lead: any) {
  const field = lead.email ? "email" : lead.phone ? "phone" : lead.full_name ? "full_name" : null;
  const value = field ? String(lead[field]).trim() : "";
  if (!field || !value) return { allowed: true, previousSessionData: null };

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, created_at, completed, score_percentage, completed_at, assessment_type_id")
    .eq("assessment_type_id", assessmentTypeId)
    .eq(field, value)
    .eq("completed", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!leads?.length) return { allowed: true, previousSessionData: null };

  const last = leads[0];
  if (leads.length < 2) return { allowed: true, previousSessionData: null };

  const createdAt = new Date(last.created_at).getTime();
  const elapsed = Date.now() - createdAt;
  const cooldown = 7 * 24 * 60 * 60 * 1000;
  if (elapsed < cooldown) {
    const remaining = Math.max(0, cooldown - elapsed);
    return {
      allowed: false,
      message: "عذراً، لقد استنفدت الحد المسموح به للمحاولات المتتالية. سيُعاد تفعيل التقييم تلقائياً بعد الموعد المحدد.",
      remaining_seconds: Math.ceil(remaining / 1000),
      previousSessionData: null
    };
  }

  const { data: previousSession, error: sessionError } = await supabase
    .from("sessions")
    .select("id, completed_at, created_at")
    .eq("lead_id", last.id)
    .eq("assessment_type_id", assessmentTypeId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!previousSession) return { allowed: true, previousSessionData: null };

  const { data: previousScores, error: scoreError } = await supabase
    .from("scores")
    .select("axis_id, percentage")
    .eq("session_id", previousSession.id);

  if (scoreError) throw scoreError;

  const axisScores: Record<string, number> = {};
  for (const row of previousScores || []) axisScores[row.axis_id] = Number(row.percentage) || 0;

  return {
    allowed: true,
    previousSessionData: {
      overallScore: Number(last.score_percentage) || 0,
      axisScores,
      completedAt: last.completed_at || previousSession.completed_at || previousSession.created_at
    }
  };
}

async function issuePublicAccess(assessmentKey: string) {
  if (!allowRate("public", assessmentKey, MAX_PUBLIC_ISSUES)) {
    throw Object.assign(new Error("Too many public access requests"), { status: 429 });
  }

  const { data: assessment, error } = await supabase
    .from("assessment_types")
    .select("id, slug, status")
    .eq("slug", assessmentKey)
    .maybeSingle();

  if (error) throw error;
  if (!assessment || assessment.status !== "published") {
    throw Object.assign(new Error("Assessment unavailable"), { status: 404 });
  }

  if (await getRequiresLogin(assessmentKey)) {
    throw Object.assign(new Error("Assessment requires login"), { status: 403 });
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from("assessment_session_access")
    .insert({
      session_id: null,
      assessment_user_id: null,
      assessment_type_id: assessment.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) throw insertError;

  return { token, expires_at: expiresAt, assessment_type_id: assessment.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const action = body?.action;
    const data = body?.data || {};
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

    if (action === "get_content") {
      const assessmentKey = String(data.assessment_key || "").trim();
      if (!assessmentKey) return json({ error: "Missing assessment key" }, 400);

      const { data: at, error: atError } = await supabase
        .from("assessment_types")
        .select("id, slug, status")
        .eq("slug", assessmentKey)
        .maybeSingle();

      if (atError) throw atError;
      if (!at || at.status !== "published") return json({ error: "Assessment unavailable" }, 404);

      const requiresLogin = await getRequiresLogin(assessmentKey);
      const runtime = await loadAssessment(at.id);
      return json({ success: true, data: safeContent(runtime, requiresLogin) });
    }

    if (action === "get_catalog") {
      const { data: assessments, error } = await supabase
        .from("assessment_types")
        .select("id, slug, title_ar, description, question_count, axis_count, status")
        .eq("status", "published")
        .order("created_at", { ascending: true });

      if (error) throw error;

      return json({
        success: true,
        data: (assessments || []).map((a) => ({
          id: a.id,
          slug: a.slug,
          title_ar: a.title_ar,
          description: a.description,
          question_count: a.question_count || 0,
          axis_count: a.axis_count || 0
        }))
      });
    }

    if (action === "issue_public_access") {
      return json({ success: true, data: await issuePublicAccess(String(data.assessment_key || "").trim()) });
    }

    if (action === "authenticate") {
      const assessmentKey = String(data.assessment_key || "").trim();
      const username = String(data.username || "").trim();
      const password = String(data.password || "");

      if (!assessmentKey || !username || !password) return json({ error: "Missing credentials" }, 400);
      if (!allowRate(ip, username, MAX_LOGIN_ATTEMPTS)) return json({ error: "Too many attempts" }, 429);

      if (!(await getRequiresLogin(assessmentKey))) {
        return json({ success: true, data: { protected: false } });
      }

      const { data: user, error: userError } = await supabase
        .from("assessment_users")
        .select("id, assessment_key, username, password_hash, active, expires_at, max_uses, used_count")
        .eq("assessment_key", assessmentKey)
        .eq("username", username)
        .maybeSingle();

      if (userError) throw userError;

      if (!user) return json({ error: "Invalid credentials" }, 401);
      const hash = await sha256Hex(password);
      if (user.password_hash !== hash) return json({ error: "Invalid credentials" }, 401);
      if (!user.active) return json({ error: "Account disabled" }, 403);
      if (user.expires_at && new Date(user.expires_at) <= new Date()) return json({ error: "Account expired" }, 403);
      if (Number(user.used_count ?? 0) >= Number(user.max_uses ?? 1)) return json({ error: "Usage limit exceeded" }, 403);

      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(
        Math.min(
          Date.now() + 10 * 60 * 1000,
          user.expires_at ? new Date(user.expires_at).getTime() : Number.MAX_SAFE_INTEGER,
        ),
      ).toISOString();

      const { error: insertError } = await supabase
        .from("assessment_session_access")
        .insert({
          session_id: null,
          assessment_user_id: user.id,
          assessment_type_id: (await supabase.from("assessment_types").select("id").eq("slug", assessmentKey).single()).data?.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      return json({
        success: true,
        data: {
          protected: true,
          token,
          user: { id: user.id, username: user.username, assessment_key: user.assessment_key },
          expires_at: expiresAt,
        },
      });
    }

    if (action === "start_session") {
      const token = String(data.token || "");
      const access = await getAccess(token);
      if (!access) return json({ error: "Invalid or expired assessment access" }, 401);
      if (access.session_id) return json({ success: true, data: { session_id: access.session_id, resumed: true, lead_id: null, expires_at: access.expires_at } });

      let leadId = data.lead_id ? String(data.lead_id) : null;
      const lead = data.lead || {};
      let history: any = { allowed: true, previousSessionData: null };

      if (!leadId) {
        if (!lead.assessment_type_id) lead.assessment_type_id = access.assessment_type_id || null;

        history = await findLeadHistory(access.assessment_type_id, lead);
        if (!history.allowed) {
          const remainingSeconds = Number(history.remaining_seconds || 0);
          const days = Math.floor(remainingSeconds / 86400);
          const hours = Math.floor((remainingSeconds % 86400) / 3600);
          return json({
            error: days > 0
              ? `عذراً، لقد استنفدت الحد المسموح به للمحاولات المتتالية. سيُعاد تفعيل التقييم تلقائياً بعد: ${days} يوم و${hours} ساعة.`
              : `عذراً، لقد استنفدت الحد المسموح به للمحاولات المتتالية. سيُعاد تفعيل التقييم تلقائياً بعد: ${hours} ساعة.`,
            remaining_seconds: remainingSeconds
          }, 403);
        }

        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            assessment_type_id: lead.assessment_type_id,
            full_name: String(lead.full_name || "طبيب غير معروف"),
            email: lead.email || null,
            phone: lead.phone || null,
            clinic_name: lead.clinic_name || null,
            country: lead.country || null,
            specialty: lead.specialty || null,
            years: lead.years || null,
            team: lead.team || null,
            source: lead.source || null,
            utm_campaign: lead.utm_campaign || null,
            completed: false,
            score_total: 0,
            score_percentage: 0,
          })
          .select("id")
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      let result: any;
      if (access.assessment_user_id) {
        const response = await supabase.rpc("start_assessment_session", {
          p_access_token_hash: access.tokenHash,
          p_assessment_user_id: access.assessment_user_id,
          p_assessment_type_id: access.assessment_type_id,
          p_lead_id: leadId,
        });
        if (response.error) throw response.error;
        result = response.data;
      } else {
        const response = await supabase.rpc("start_public_assessment_session", {
          p_access_token_hash: access.tokenHash,
          p_assessment_type_id: access.assessment_type_id,
          p_lead_id: leadId,
        });
        if (response.error) throw response.error;
        result = response.data;
      }

      const sessionResult = (await supabase
        .from("assessment_session_access")
        .select("session_id, expires_at")
        .eq("id", access.id)
        .single()).data;

      return json({
        success: true,
        data: {
          ...(result || {}),
          session_id: sessionResult?.session_id,
          expires_at: sessionResult?.expires_at,
          lead_id: leadId,
          previous_session: history.previousSessionData
        }
      });
    }

    if (action === "get_session") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;

      let query = supabase
        .from("sessions")
        .select("id, lead_id, assessment_type_id, assessment_user_id, status, current_question, started_at, completed_at, duration_seconds, usage_consumed_at");
      query = sessionFilter(query, access);
      const { data: session, error: sessionError } = await query.maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return json({ error: "Assessment session not found" }, 404);

      const { data: answers, error: answersError } = await supabase
        .from("answers")
        .select("question_id, option_index, chosen_option_label, answered_at")
        .eq("session_id", access.session_id)
        .order("answered_at", { ascending: true });
      if (answersError) throw answersError;

      await supabase.from("assessment_session_access").update({ last_seen_at: new Date().toISOString() }).eq("id", access.id);

      return json({ success: true, data: { session, answers } });
    }

    if (action === "save_answer") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;
      const questionId = String(data.question_id || "");
      const optionIndex = Number(data.option_index);
      if (!questionId || !Number.isInteger(optionIndex) || optionIndex < 0) return json({ error: "Invalid answer payload" }, 400);

      let query = supabase.from("sessions").select("id, lead_id, assessment_type_id, assessment_user_id, status");
      query = sessionFilter(query, access);
      const { data: session, error: sessionError } = await query.maybeSingle();
      if (sessionError) throw sessionError;
      if (!session || session.status !== "in_progress") return json({ error: "Assessment session is not active" }, 409);

      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("id, code, axis_id, question_text_ar, question_text, assessment_type_id")
        .eq("code", questionId)
        .eq("assessment_type_id", session.assessment_type_id)
        .maybeSingle();
      if (questionError) throw questionError;
      if (!question) return json({ error: "Question not found" }, 404);

      const { data: option, error: optionError } = await supabase
        .from("options")
        .select("option_index, option_value, label_ar, label, is_trap")
        .eq("question_id", question.id)
        .eq("option_index", optionIndex)
        .maybeSingle();
      if (optionError) throw optionError;
      if (!option) return json({ error: "Option not found" }, 400);

      const { data: saved, error: saveError } = await supabase
        .from("answers")
        .upsert({
          session_id: access.session_id,
          lead_id: session.lead_id,
          question_id: question.code,
          axis_id: String(question.axis_id),
          question_text: question.question_text_ar || question.question_text,
          chosen_option_label: option.label_ar || option.label,
          option_index: option.option_index,
          option_value: option.option_value,
          answer_value: option.option_value,
          is_trap: Boolean(option.is_trap),
          trap_triggered: false,
          answered_at: new Date().toISOString(),
        }, { onConflict: "session_id,question_id" })
        .select("id, question_id, option_index, chosen_option_label, answered_at")
        .single();

      if (saveError) throw saveError;

      await supabase.from("assessment_session_access").update({ last_seen_at: new Date().toISOString() }).eq("id", access.id);

      if (Number.isInteger(data.current_question)) {
        let updateQuery = supabase.from("sessions").update({ current_question: data.current_question });
        updateQuery = sessionFilter(updateQuery, access);
        await updateQuery;
      }

      return json({ success: true, data: saved });
    }

    if (action === "update_progress") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;
      const currentQuestion = Number(data.current_question);
      if (!Number.isInteger(currentQuestion) || currentQuestion < 0) return json({ error: "Invalid progress" }, 400);

      let query = supabase.from("sessions").update({ current_question: currentQuestion });
      query = sessionFilter(query, access).eq("status", "in_progress");
      const { data: session, error } = await query.select("id, current_question, status").single();
      if (error) throw error;

      await supabase.from("assessment_session_access").update({ last_seen_at: new Date().toISOString() }).eq("id", access.id);

      return json({ success: true, data: session });
    }

    if (action === "complete") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;

      let sessionQuery = supabase.from("sessions").select("id, lead_id, assessment_type_id, assessment_user_id, assessment_version, status");
      sessionQuery = sessionFilter(sessionQuery, access);
      const { data: session, error: sessionError } = await sessionQuery.maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return json({ error: "Assessment session not found" }, 404);

      const runtime = await loadAssessment(session.assessment_type_id);
      const runtimeVersion = Number(runtime.assessment.version ?? runtime.assessment.config_version ?? 1);
      if (Number(session.assessment_version ?? 1) !== runtimeVersion) {
        return json({ error: "Assessment version changed; this session must be completed with its pinned version" }, 409);
      }

      const { data: dbAnswers, error: answersError } = await supabase
        .from("answers")
        .select("question_id, option_index, option_value")
        .eq("session_id", session.id);
      if (answersError) throw answersError;

      const answerMap: Record<string, number> = {};
      for (const answer of dbAnswers || []) {
        const question = runtime.questions.find((q) => q.code === answer.question_id);
        const option = runtime.options.find((o) => o.question_id === question?.id && o.option_index === answer.option_index);
        if (!question || !option || Number(answer.option_value) !== Number(option.option_value)) {
          return json({ error: "Answer integrity check failed" }, 409);
        }
        if (answerMap[question.code] !== undefined) {
          return json({ error: "Duplicate answer detected" }, 409);
        }
        answerMap[question.code] = Number(option.option_value);
      }

      const required = runtime.questions.filter((q) => q.is_required !== false).map((q) => q.code);
      const missing = required.filter((code) => answerMap[code] === undefined);
      if (missing.length) return json({ error: "Assessment incomplete", missing_count: missing.length }, 409);

      const result = calculateAssessment(runtime.scoring, answerMap);

      const scoreRows = runtime.axes.map((axis) => ({
        axis_id: axis.code,
        axis_name_ar: axis.title_ar || axis.title,
        axis_name_en: axis.title,
        raw_score: Math.round(result.axisScores[axis.code] || 0),
        max_possible: 100,
        percentage: result.axisScores[axis.code] || 0,
        weight: Number(axis.weight) || 1,
        weighted_score: (result.axisScores[axis.code] || 0) * (Number(axis.weight) || 1),
        grade: result.axisScores[axis.code] >= 75 ? "Q4" : result.axisScores[axis.code] >= 50 ? "Q3" : result.axisScores[axis.code] >= 25 ? "Q2" : "Q1",
      }));

      const rpcName = access.assessment_user_id
        ? "complete_assessment_session"
        : "complete_public_assessment_session";

      const rpcPayload = access.assessment_user_id
        ? {
          p_session_id: session.id,
          p_assessment_user_id: access.assessment_user_id,
          p_overall_score: result.overallScore,
          p_classification: result.classification,
          p_score_rows: scoreRows,
        }
        : {
          p_session_id: session.id,
          p_score_rows: scoreRows,
          p_overall_score: result.overallScore,
          p_classification: result.classification,
        };

      const { data: completed, error: completionError } = await supabase.rpc(rpcName, rpcPayload);
      if (completionError) throw completionError;

      if (completed?.already_completed) {
        const { data: storedScores } = await supabase
          .from("scores")
          .select("axis_id, percentage")
          .eq("session_id", session.id);

        const axisScores: Record<string, number> = {};
        for (const row of storedScores || []) axisScores[row.axis_id] = Number(row.percentage) || 0;
        const overallScore = Number(completed.overall_score) || 0;
        return json({
          success: true,
          data: {
            ...result,
            overallScore,
            classification: result.classification,
            axisScores,
            already_completed: true,
          },
        });
      }

      return json({
        success: true,
        data: {
          ...result,
          already_completed: false,
          session_id: session.id,
          assessment_version: runtime.assessment.version ?? runtime.assessment.config_version ?? 1,
        },
      });
    }

    if (action === "calculate_ev") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;

      const avg = Number(data.avg);
      const visits = Number(data.visits);
      const years = Number(data.years);
      if (!(avg > 0) || !(visits > 0) || !(years > 0)) return json({ error: "Invalid EV inputs" }, 400);

      let sessionQuery = supabase.from("sessions").select("id, assessment_type_id, assessment_version, status");
      sessionQuery = sessionFilter(sessionQuery, access);
      const { data: session, error } = await sessionQuery.maybeSingle();
      if (error) throw error;
      if (!session) return json({ error: "Assessment session not found" }, 404);

      const runtime = await loadAssessment(session.assessment_type_id);
      const runtimeVersion = Number(runtime.assessment.version ?? runtime.assessment.config_version ?? 1);
      if (Number(session.assessment_version ?? 1) !== runtimeVersion) {
        return json({ error: "Assessment version changed; this session must use its pinned version" }, 409);
      }
      const { data: storedScores, error: scoreError } = await supabase
        .from("scores")
        .select("axis_id, percentage")
        .eq("session_id", session.id);
      if (scoreError) throw scoreError;

      const axisScores: Record<string, number> = {};
      for (const row of storedScores || []) axisScores[row.axis_id] = Number(row.percentage) || 0;

      const result = calculateAssessment(runtime.scoring, Object.fromEntries(runtime.questions.map((q) => [q.code, 0])), {
        flow: visits,
        ltv: avg * visits * years,
      });

      const ev = calculateAssessment(
        { ...runtime.scoring, simulator: { ...runtime.scoring.simulator, enabled: true } },
        Object.fromEntries(runtime.questions.map((q) => [q.code, 0])),
        { flow: visits, ltv: avg * visits * years },
      ).evSimulator;

      // Recalculate EV using the stored authoritative axis scores, without exposing mappings.
      if (!ev) return json({ success: true, data: { current: 0, opt20: 0, opt50: 0 } });

      // calculateAssessment's EV is based on its own axisScores, so derive the same value with a tiny private adapter.
      const roleScores: Record<string, number> = {};
      const available = Object.values(axisScores);
      const average = available.length ? available.reduce((a, b) => a + b, 0) / available.length : 50;
      for (const [axisId, score] of Object.entries(axisScores)) {
        const role = runtime.assessment.axis_roles?.[axisId];
        if (role) roleScores[role] = roleScores[role] === undefined ? score : (roleScores[role] + score) / 2;
      }
      for (const role of ["TRUST","COMMUNICATION","CONVERSION","RETENTION","LOYALTY","SCHEDULING","RECEPTION","ADMIN","COORDINATION","JOURNEY","OPERATIONS","TEAM","GROWTH","PROFESSIONALISM","TEAMWORK"]) {
        if (roleScores[role] === undefined) roleScores[role] = average;
      }

      let weighted = 0, totalWeight = 0;
      for (const [role, weight] of Object.entries(runtime.assessment.ev_mappings || {})) {
        weighted += (roleScores[role] || 0) * Number(weight);
        totalWeight += Number(weight);
      }
      const normalized = totalWeight > 0 ? weighted / totalWeight : 0;
      const deltaMax = 0.35;
      const base = (normalized / 100) * deltaMax * visits * (avg * visits * years);
      const current = Math.round(base * 0.7);
      return json({ success: true, data: { current, opt20: Math.round(current * 1.2), opt50: Math.round(current * 1.5) } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const status = Number((error as any)?.status) || 500;
    return json({ error: error instanceof Error ? error.message : "Internal error" }, status);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { calculateP3Production } from "./p3-production-adapter.mts";

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

function pgErrorStatus(error: any) {
  const code = String(error?.code || "");
  if (code === "28000") return 401;
  if (code === "42501") return 403;
  if (code === "40901" || code === "40902" || code === "40903" || code === "40904") return 409;
  if (code.startsWith("22")) return 400;
  return 500;
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

async function loadAssessment(assessmentTypeId: string, familyOverride: any = null) {
  const [{ data: assessment, error: assessmentError }, { data: axes, error: axesError }, { data: questions, error: questionsError }, { data: options, error: optionsError }, { data: traps, error: trapsError }] = await Promise.all([
    supabase
      .from("assessment_types")
      .select("id, slug, family_id, title_ar, title_en, description, question_count, axis_count, has_traps, has_ev_simulator, version, config_version, axis_roles, kpi_mappings, ev_mappings")
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
    family: familyOverride,
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
    slug: runtime.family?.slug || runtime.assessment.slug,
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

  const { data: family, error } = await supabase
    .from("assessment_families")
    .select("id, slug, current_published_version_id")
    .eq("slug", assessmentKey)
    .maybeSingle();

  if (error) throw error;
  if (!family?.current_published_version_id) {
    throw Object.assign(new Error("Assessment unavailable"), { status: 404 });
  }

  const { data: publicVersion, error: publicVersionError } = await supabase
    .from("assessment_types")
    .select("id, status, is_active")
    .eq("id", family.current_published_version_id)
    .maybeSingle();

  if (publicVersionError) throw publicVersionError;
  if (!publicVersion || publicVersion.status !== "published" || publicVersion.is_active !== true) {
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
      assessment_type_id: family.current_published_version_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) throw insertError;

  return { token, expires_at: expiresAt, assessment_type_id: family.current_published_version_id };
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

      const { data: family, error: familyError } = await supabase
        .from("assessment_families")
        .select("id, slug, current_published_version_id")
        .eq("slug", assessmentKey)
        .maybeSingle();

      if (familyError) throw familyError;
      if (!family?.current_published_version_id) return json({ error: "Assessment unavailable" }, 404);

      const { data: publicVersion, error: publicVersionError } = await supabase
        .from("assessment_types")
        .select("id, status, is_active")
        .eq("id", family.current_published_version_id)
        .maybeSingle();

      if (publicVersionError) throw publicVersionError;
      if (!publicVersion || publicVersion.status !== "published" || publicVersion.is_active !== true) {
        return json({ error: "Assessment unavailable" }, 404);
      }

      const requiresLogin = await getRequiresLogin(assessmentKey);
      const runtime = await loadAssessment(family.current_published_version_id, family);
      return json({ success: true, data: safeContent(runtime, requiresLogin) });
    }

    if (action === "get_catalog") {
      const { data: families, error: familyError } = await supabase
        .from("assessment_families")
        .select("id, slug, current_published_version_id")
        .not("current_published_version_id", "is", null)
        .order("created_at", { ascending: true });

      if (familyError) throw familyError;

      const versionIds = (families || []).map((f) => f.current_published_version_id).filter(Boolean);
      const { data: versions, error: versionError } = versionIds.length
        ? await supabase
            .from("assessment_types")
            .select("id, title_ar, description, question_count, axis_count, status, is_active")
            .in("id", versionIds)
            .eq("status", "published")
            .eq("is_active", true)
        : { data: [], error: null };

      if (versionError) throw versionError;
      const byId = new Map((versions || []).map((v) => [v.id, v]));

      return json({
        success: true,
        data: (families || []).map((f) => {
          const v = byId.get(f.current_published_version_id);
          return {
            id: v?.id || f.current_published_version_id,
            slug: f.slug,
            title_ar: v?.title_ar || null,
            description: v?.description || null,
            question_count: v?.question_count || 0,
            axis_count: v?.axis_count || 0
          };
        })
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

      const { data: family, error: familyError } = await supabase
        .from("assessment_families")
        .select("id, slug, current_published_version_id")
        .eq("slug", assessmentKey)
        .maybeSingle();

      if (familyError) throw familyError;
      if (!family?.current_published_version_id) return json({ error: "Assessment unavailable" }, 404);

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
          assessment_type_id: family.current_published_version_id,
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

      if (!access.assessment_user_id) {
        const { data: publicVersion, error: publicVersionError } = await supabase
          .from("assessment_types")
          .select("id, status, is_active")
          .eq("id", access.assessment_type_id)
          .maybeSingle();

        if (publicVersionError) throw publicVersionError;
        if (!publicVersion || publicVersion.status !== "published" || publicVersion.is_active !== true) {
          return json({ error: "Assessment unavailable" }, 404);
        }
      }

      const attemptKey = String(data.attempt_key || "").trim();
      if (!attemptKey) return json({ error: "Missing attempt key" }, 400);
      const attemptKeyHash = await sha256Hex(attemptKey);

      let leadId = data.lead_id ? String(data.lead_id) : null;
      const lead = data.lead || {};
      let history: any = { allowed: true, previousSessionData: null };

      if (!leadId && !access.assessment_user_id) {
        const { data: activeAttempt, error: activeAttemptError } = await supabase
          .from("sessions")
          .select("id, lead_id, status, submission_state, last_activity_at")
          .eq("assessment_type_id", access.assessment_type_id)
          .eq("attempt_key_hash", attemptKeyHash)
          .eq("status", "in_progress")
          .eq("submission_state", "draft")
          .gte("last_activity_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("last_activity_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeAttemptError) throw activeAttemptError;
        if (activeAttempt) {
          leadId = activeAttempt.lead_id;
        }
      }

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
          p_attempt_key_hash: attemptKeyHash,
        });
        if (response.error) throw response.error;
        result = response.data;
      }

      if (result?.resumed && leadId && result.lead_id && result.lead_id !== leadId) {
        await supabase.from("leads").delete().eq("id", leadId);
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
          lead_id: result?.lead_id || leadId,
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
        .select("id, lead_id, assessment_type_id, assessment_user_id, status, submission_state, current_question, started_at, completed_at, duration_seconds, usage_consumed_at, last_activity_at, submission_started_at, submission_fingerprint");
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

      let storedResult: any = null;
      if (session.status === "completed") {
        const { data: resultRow, error: resultError } = await supabase
          .from("assessment_results")
          .select("result, assessment_version, interpretation_version, scoring_engine_version, scoring_contract_version, assessment_config_digest, calculated_at, result_status")
          .eq("session_id", session.id)
          .maybeSingle();
        if (resultError) throw resultError;
        storedResult = resultRow;
      }

      return json({ success: true, data: { session, answers, result: storedResult } });
    }

    if (action === "save_answer") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;
      const questionId = String(data.question_id || "");
      const optionIndex = Number(data.option_index);

      if (!questionId || !Number.isInteger(optionIndex) || optionIndex < 0) {
        return json({ error: "Invalid answer payload" }, 400);
      }

      const response = await supabase.rpc("save_assessment_answer", {
        p_access_token_hash: access.tokenHash,
        p_question_id: questionId,
        p_option_index: optionIndex,
        p_current_question: Number.isInteger(data.current_question) ? Number(data.current_question) : null,
      });

      if (response.error) {
        throw Object.assign(
          new Error(response.error.message || "Unable to save answer"),
          { status: pgErrorStatus(response.error) },
        );
      }

      return json({ success: true, data: response.data });
    }

    if (action === "update_progress") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;
      const currentQuestion = Number(data.current_question);
      if (!Number.isInteger(currentQuestion) || currentQuestion < 0) {
        return json({ error: "Invalid progress" }, 400);
      }

      let query = supabase.from("sessions").update({
        current_question: currentQuestion,
        last_activity_at: new Date().toISOString(),
      });
      query = sessionFilter(query, access)
        .eq("status", "in_progress")
        .eq("submission_state", "draft");

      const { data: session, error } = await query
        .select("id, current_question, status, submission_state")
        .single();
      if (error) {
        throw Object.assign(
          new Error(error.message || "Progress update failed"),
          { status: pgErrorStatus(error) === 500 ? 409 : pgErrorStatus(error) },
        );
      }

      await supabase
        .from("assessment_session_access")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", access.id);

      return json({ success: true, data: session });
    }

    if (action === "complete") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const { access } = auth;

      const sessionQuery = sessionFilter(
        supabase
          .from("sessions")
          .select("id, lead_id, assessment_type_id, assessment_user_id, assessment_version, status"),
        access,
      );
      const { data: session, error: sessionError } = await sessionQuery.maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return json({ error: "Assessment session not found" }, 404);

      if (session.status === "completed") {
        const { data: storedResult, error: resultError } = await supabase
          .from("assessment_results")
          .select("id, result, assessment_version, interpretation_version, scoring_engine_version, scoring_contract_version, assessment_config_digest, calculated_at, result_status")
          .eq("session_id", session.id)
          .maybeSingle();
        if (resultError) throw resultError;

        if (storedResult?.result) {
          const structured = storedResult.result as any;
          const axisScores: Record<string, number> = {};
          for (const axis of structured?.scores?.axes || []) {
            if (Number.isFinite(axis?.score)) axisScores[String(axis.axisCode)] = Number(axis.score);
          }
          const kpis: Record<string, number> = {};
          for (const kpi of structured?.kpis || []) {
            if (kpi?.status !== "unavailable" && Number.isFinite(kpi?.value)) {
              kpis[String(kpi.kpiCode)] = Number(kpi.value);
            }
          }
          return json({
            success: true,
            data: {
              overallScore: Number.isFinite(structured?.scores?.overallScore) ? Number(structured.scores.overallScore) : null,
              classification: structured?.classification?.bandCode ?? null,
              axisScores,
              kpis,
              evSimulator: null,
              traps: [],
              structuredResult: structured,
              provenance: {
                assessmentVersion: storedResult.assessment_version,
                interpretationVersion: storedResult.interpretation_version,
                scoringEngineVersion: storedResult.scoring_engine_version,
                scoringContractVersion: storedResult.scoring_contract_version,
                assessmentConfigDigest: storedResult.assessment_config_digest,
                calculatedAt: storedResult.calculated_at,
              },
              already_completed: true,
              session_id: session.id,
              assessment_version: session.assessment_version,
            },
          });
        }

        const { data: lead } = await supabase
          .from("leads")
          .select("score_percentage")
          .eq("id", session.lead_id)
          .maybeSingle();

        return json({
          success: true,
          data: {
            overallScore: lead?.score_percentage ?? null,
            classification: null,
            axisScores: {},
            kpis: {},
            evSimulator: null,
            traps: [],
            structuredResult: null,
            provenance: null,
            already_completed: true,
            session_id: session.id,
            assessment_version: session.assessment_version,
          },
        });
      }

      const requestedEconomicInput = data.economic_input && typeof data.economic_input === "object"
        ? {
            averageVisitValue: data.economic_input.averageVisitValue ?? null,
            relationshipYears: data.economic_input.relationshipYears ?? null,
            referralPercentage: data.economic_input.referralPercentage ?? null,
          }
        : {};

      const preparation = await supabase.rpc("prepare_assessment_submission", {
        p_session_id: session.id,
        p_access_token_hash: access.tokenHash,
        p_economic_input: requestedEconomicInput,
      });
      if (preparation.error) {
        throw Object.assign(
          new Error(preparation.error.message || "Unable to prepare submission"),
          { status: pgErrorStatus(preparation.error) },
        );
      }

      if (preparation.data?.already_completed) {
        const { data: storedResult, error: storedResultError } = await supabase
          .from("assessment_results")
          .select("result, assessment_version, interpretation_version, scoring_engine_version, scoring_contract_version, assessment_config_digest, calculated_at")
          .eq("session_id", session.id)
          .maybeSingle();
        if (storedResultError) throw storedResultError;

        const structured = storedResult?.result || null;
        return json({
          success: true,
          data: {
            overallScore: Number.isFinite(structured?.scores?.overallScore)
              ? Number(structured.scores.overallScore)
              : null,
            classification: structured?.classification?.bandCode ?? null,
            axisScores: Object.fromEntries(
              (structured?.scores?.axes || [])
                .filter((axis: any) => Number.isFinite(axis?.score))
                .map((axis: any) => [String(axis.axisCode), Number(axis.score)]),
            ),
            kpis: Object.fromEntries(
              (structured?.kpis || [])
                .filter((kpi: any) => kpi?.status !== "unavailable" && Number.isFinite(kpi?.value))
                .map((kpi: any) => [String(kpi.kpiCode), Number(kpi.value)]),
            ),
            evSimulator: null,
            traps: [],
            structuredResult: structured,
            provenance: storedResult
              ? {
                  assessmentVersion: storedResult.assessment_version,
                  interpretationVersion: storedResult.interpretation_version,
                  scoringEngineVersion: storedResult.scoring_engine_version,
                  scoringContractVersion: storedResult.scoring_contract_version,
                  assessmentConfigDigest: storedResult.assessment_config_digest,
                  calculatedAt: storedResult.calculated_at,
                }
              : null,
            already_completed: true,
            session_id: session.id,
            assessment_version: session.assessment_version,
          },
        });
      }

      const answerSnapshot = Array.isArray(preparation.data?.submission_snapshot)
        ? preparation.data.submission_snapshot
        : [];
      const submissionFingerprint = String(preparation.data?.submission_fingerprint || "");
      if (!submissionFingerprint) {
        return json({ error: "Submission snapshot is unavailable" }, 409);
      }

      const frozenEconomicInput = preparation.data?.submission_economic_input
        && typeof preparation.data.submission_economic_input === "object"
        ? {
            averageVisitValue: preparation.data.submission_economic_input.averageVisitValue ?? null,
            relationshipYears: preparation.data.submission_economic_input.relationshipYears ?? null,
            referralPercentage: preparation.data.submission_economic_input.referralPercentage ?? null,
          }
        : undefined;

      const computed = await calculateP3Production(supabase, {
        sessionId: session.id,
        economicInput: frozenEconomicInput,
        answerSnapshot,
      });

      const {
        resolvedSelections: _resolvedSelections,
        axisPersistenceRows: _axisPersistenceRows,
        ...structuredResult
      } = computed.result;

      const rpcName = access.assessment_user_id
        ? "complete_p4_assessment_session"
        : "complete_p4_public_assessment_session";

      const rpcPayload = access.assessment_user_id
        ? {
            p_session_id: session.id,
            p_access_token_hash: access.tokenHash,
            p_assessment_user_id: access.assessment_user_id,
            p_submission_fingerprint: submissionFingerprint,
            p_overall_score: computed.result.scores.overallScore,
            p_classification: computed.result.classification.bandCode ?? "",
            p_score_rows: computed.scoreRows,
            p_assessment_version: computed.provenance.assessmentVersion,
            p_interpretation_version: computed.provenance.interpretationVersion,
            p_scoring_engine_version: computed.provenance.scoringEngineVersion,
            p_scoring_contract_version: computed.provenance.scoringContractVersion,
            p_assessment_config_digest: computed.provenance.assessmentConfigDigest,
            p_result: structuredResult,
          }
        : {
            p_session_id: session.id,
            p_access_token_hash: access.tokenHash,
            p_submission_fingerprint: submissionFingerprint,
            p_overall_score: computed.result.scores.overallScore,
            p_classification: computed.result.classification.bandCode ?? "",
            p_score_rows: computed.scoreRows,
            p_assessment_version: computed.provenance.assessmentVersion,
            p_interpretation_version: computed.provenance.interpretationVersion,
            p_scoring_engine_version: computed.provenance.scoringEngineVersion,
            p_scoring_contract_version: computed.provenance.scoringContractVersion,
            p_assessment_config_digest: computed.provenance.assessmentConfigDigest,
            p_result: structuredResult,
          };

      const { data: completed, error: completionError } = await supabase.rpc(rpcName, rpcPayload);
      if (completionError) {
        throw Object.assign(
          new Error(completionError.message || "Assessment completion failed"),
          { status: pgErrorStatus(completionError) },
        );
      }

      const storedStructured = (completed?.result || structuredResult) as any;

      return json({
        success: true,
        data: {
          ...computed.legacyProjection,
          structuredResult: storedStructured,
          provenance: {
            ...computed.provenance,
            calculatedAt: storedStructured?.identity?.calculatedAt ?? null,
          },
          already_completed: Boolean(completed?.already_completed),
          session_id: session.id,
          assessment_version: computed.provenance.assessmentVersion,
        },
      });
    }

    if (action === "calculate_ev") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);

      const avg = Number(data.avg);
      const years = Number(data.years);
      const visits = data.visits === undefined || data.visits === "" ? 3 : Number(data.visits);
      const referralRaw = data.referral === undefined || data.referral === "" || data.referral === null ? null : Number(data.referral);

      if (!(avg > 0) || !(years > 0) || !(visits > 0)) {
        return json({ error: "Invalid economic inputs" }, 400);
      }

      if (
        referralRaw !== null &&
        (!Number.isFinite(referralRaw) || referralRaw < 0 || referralRaw >= 100)
      ) {
        return json({ error: "Invalid referral percentage" }, 400);
      }

      const base = avg * 3 * years;
      const valueAt = (referral: number) => base / (1 - referral / 100);
      const current = referralRaw === null ? null : valueAt(referralRaw);

      return json({
        success: true,
        data: {
          status: referralRaw === null ? "NOT_COMPUTED" : "COMPUTED",
          modelCode: "P3_RECURSIVE_REFERRAL_V1",
          basePatientValue: base,
          referralPercentage: referralRaw,
          visitsPerYear: 3,
          relationshipYears: years,
          current,
          opt20: valueAt(20),
          opt50: valueAt(50),
        },
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const status = Number((error as any)?.status) || 500;
    return json({ error: error instanceof Error ? error.message : "Internal error" }, status);
  }
});

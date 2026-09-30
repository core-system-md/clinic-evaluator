import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function allowRate(ip: string, username: string) {
  const now = Date.now();
  const key = ip + ":" + username.toLowerCase();
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;
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
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function getAccess(token: string) {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);

  const { data, error } = await supabase
    .from("assessment_session_access")
    .select("id, session_id, assessment_user_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, tokenHash };
}

async function requireSessionAccess(token: string) {
  const access = await getAccess(token);
  if (!access || !access.session_id) {
    return { error: "Invalid or expired assessment session", status: 401 as const };
  }
  return { access };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const action = body?.action;
    const data = body?.data || {};
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

    if (action === "authenticate") {
      const assessmentKey = String(data.assessment_key || "").trim();
      const username = String(data.username || "").trim();
      const password = String(data.password || "");

      if (!assessmentKey || !username || !password) {
        return json({ error: "Missing credentials" }, 400);
      }

      if (!allowRate(ip, username)) {
        return json({ error: "Too many attempts" }, 429);
      }

      const { data: setting, error: settingError } = await supabase
        .from("assessment_settings")
        .select("assessment_key, auth_enabled")
        .eq("assessment_key", assessmentKey)
        .maybeSingle();

      if (settingError) throw settingError;
      if (!setting?.auth_enabled) {
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
      if (user.password_hash !== hash) {
        return json({ error: "Invalid credentials" }, 401);
      }

      if (!user.active) return json({ error: "Account disabled" }, 403);
      if (user.expires_at && new Date(user.expires_at) <= new Date()) {
        return json({ error: "Account expired" }, 403);
      }

      // Usage is intentionally NOT consumed here.
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
          token_hash: tokenHash,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      return json({
        success: true,
        data: {
          protected: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            assessment_key: user.assessment_key,
          },
          expires_at: expiresAt,
        },
      });
    }

    if (action === "start_session") {
      const token = String(data.token || "");
      const access = await getAccess(token);

      if (!access) return json({ error: "Invalid or expired assessment access" }, 401);
      if (access.session_id) {
        return json({
          success: true,
          data: { session_id: access.session_id, resumed: true },
        });
      }

      const { data: result, error } = await supabase.rpc("start_assessment_session", {
        p_access_token_hash: access.tokenHash,
        p_assessment_user_id: access.assessment_user_id,
        p_assessment_type_id: data.assessment_type_id,
        p_lead_id: data.lead_id,
      });

      if (error) {
        const message = error.message || "Could not start assessment session";
        const status = /Usage limit exceeded/i.test(message) ? 403 : 400;
        return json({ error: message }, status);
      }

      return json({ success: true, data: result });
    }

    if (action === "get_session") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);

      const { access } = auth;
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("id, lead_id, assessment_type_id, assessment_user_id, status, current_question, started_at, completed_at, duration_seconds, usage_consumed_at")
        .eq("id", access.session_id)
        .eq("assessment_user_id", access.assessment_user_id)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session) return json({ error: "Assessment session not found" }, 404);

      const { data: answers, error: answersError } = await supabase
        .from("answers")
        .select("question_id, option_index, option_value, chosen_option_label, answered_at")
        .eq("session_id", access.session_id)
        .order("answered_at", { ascending: true });

      if (answersError) throw answersError;

      await supabase
        .from("assessment_session_access")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", access.id);

      return json({ success: true, data: { session, answers } });
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

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("id, lead_id, assessment_type_id, status")
        .eq("id", access.session_id)
        .eq("assessment_user_id", access.assessment_user_id)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!session || session.status !== "in_progress") {
        return json({ error: "Assessment session is not active" }, 409);
      }

      const { data: question, error: questionError } = await supabase
        .from("questions")
        .select("id, code, axis_id, question_text_ar, question_text, question_type, display_order, is_required, trap_index")
        .eq("id", questionId)
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

      const payload = {
        session_id: access.session_id,
        lead_id: session.lead_id,
        question_id: question.code,
        axis_id: question.axis_id ? String(question.axis_id) : "",
        question_text: question.question_text_ar || question.question_text,
        chosen_option_label: option.label_ar || option.label,
        option_index: option.option_index,
        option_value: option.option_value,
        answer_value: option.option_value,
        is_trap: option.is_trap || false,
        trap_triggered: false,
        answered_at: new Date().toISOString(),
      };

      const { data: saved, error: saveError } = await supabase
        .from("answers")
        .upsert(payload, { onConflict: "session_id,question_id" })
        .select("id, session_id, question_id, option_index, option_value, chosen_option_label, answer_value, answered_at")
        .single();

      if (saveError) throw saveError;

      await supabase
        .from("assessment_session_access")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", access.id);

      if (Number.isInteger(data.current_question)) {
        await supabase
          .from("sessions")
          .update({ current_question: data.current_question })
          .eq("id", access.session_id)
          .eq("assessment_user_id", access.assessment_user_id);
      }

      return json({ success: true, data: saved });
    }

    if (action === "update_progress") {
      const auth = await requireSessionAccess(String(data.token || ""));
      if ("error" in auth) return json({ error: auth.error }, auth.status);

      const { access } = auth;
      const currentQuestion = Number(data.current_question);
      if (!Number.isInteger(currentQuestion) || currentQuestion < 0) {
        return json({ error: "Invalid progress" }, 400);
      }

      const { data: session, error } = await supabase
        .from("sessions")
        .update({ current_question: currentQuestion })
        .eq("id", access.session_id)
        .eq("assessment_user_id", access.assessment_user_id)
        .eq("status", "in_progress")
        .select("id, current_question, status")
        .single();

      if (error) throw error;

      await supabase
        .from("assessment_session_access")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", access.id);

      return json({ success: true, data: session });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

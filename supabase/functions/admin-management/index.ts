import { withSupabase } from "npm:@supabase/server@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ success: false, message: "Method not allowed" }, 405);
    }

    try {
      const { data: isOwner, error: ownerError } = await ctx.supabase.rpc("is_owner");
      if (ownerError) return json({ success: false, message: ownerError.message }, 500);
      if (!isOwner) return json({ success: false, message: "Owner authorization required" }, 403);

      const body = await req.json().catch(() => ({}));
      const email = String(body?.email || "").trim().toLowerCase();
      const password = String(body?.password || "");
      const displayName = String(body?.display_name || "").trim();
      const capabilities = Array.isArray(body?.capabilities)
        ? body.capabilities.map((v: unknown) => String(v).trim()).filter(Boolean)
        : [];

      if (!email || !email.includes("@")) {
        return json({ success: false, message: "A valid email is required" }, 400);
      }
      if (password.length < 10) {
        return json({ success: false, message: "Assistant password must be at least 10 characters" }, 400);
      }
      if (!displayName) {
        return json({ success: false, message: "Assistant display name is required" }, 400);
      }

      const { data: created, error: createError } =
        await ctx.supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError || !created?.user?.id) {
        return json({
          success: false,
          message: createError?.message || "Could not create the authentication account",
        }, 409);
      }

      const { data: registration, error: registrationError } = await ctx.supabase.rpc(
        "register_admin_assistant_secure",
        {
          p_user_id: created.user.id,
          p_display_name: displayName,
          p_capabilities: capabilities,
        },
      );

      if (registrationError || !registration?.success) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
        return json({
          success: false,
          message: registrationError?.message || "Could not register the assistant in Admin",
        }, 500);
      }

      return json({
        success: true,
        user_id: created.user.id,
        email,
        display_name: displayName,
        capabilities: registration.capabilities || capabilities,
      });
    } catch (error) {
      console.error("[admin-management] request failed", error);
      return json({
        success: false,
        message: error instanceof Error ? error.message : "Unexpected server error",
      }, 500);
    }
  }),
};

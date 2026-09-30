import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

/**
 * Server-authoritative scoring boundary.
 *
 * The browser sends raw answers only. Assessment rules remain server-side.
 * This module is intentionally isolated from the HTTP/session layer so the
 * scoring engine can evolve without coupling it to authentication.
 */
export async function completeWithServerScoring(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  assessmentUserId: string,
) {
  const { data, error } = await supabase.rpc(
    "complete_assessment_with_server_scoring",
    {
      p_session_id: sessionId,
      p_assessment_user_id: assessmentUserId,
    },
  );

  if (error) throw error;
  return data;
}

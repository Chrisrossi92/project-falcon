import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createEmailQueueProcessor } from "./workerCore.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const processEmailQueue = createEmailQueueProcessor({
  supabase,
  fetchImpl: fetch,
  config: {
    resendApiKey: Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_KEY"),
    emailFrom: Deno.env.get("EMAIL_FROM"),
    appBaseUrl: Deno.env.get("APP_BASE_URL"),
    batchLimit: Number(Deno.env.get("EMAIL_BATCH_SIZE") || "25"),
    workerName: "email-worker",
  },
});

serve(async () => {
  try {
    const result = await processEmailQueue();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email-worker] fatal:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

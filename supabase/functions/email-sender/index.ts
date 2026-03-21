import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// DEPRECATED:
// This function has been retired as an active worker to avoid dual-runtime processing.
// Canonical runtime path is: supabase/functions/email-worker/index.ts

serve(async (req) => {
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const body = {
    ok: true,
    deprecated: true,
    active_worker: "email-worker",
    message: "email-sender is retired. Use the canonical email-worker function.",
  };
  return new Response(JSON.stringify(body), {
    status: debug ? 200 : 410,
    headers: { "content-type": "application/json" },
  });
});



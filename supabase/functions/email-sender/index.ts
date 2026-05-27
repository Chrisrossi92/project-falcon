import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "email-sender is retired. Use email-worker for canonical public.email_queue delivery.",
    }),
    {
      status: 410,
      headers: { "content-type": "application/json" },
    }
  );
});

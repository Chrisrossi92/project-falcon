// Deno deploy (Supabase Edge Function)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_KEY"); // or SENDGRID_API_KEY, etc.

async function fetchQueued(limit = 25) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/email_outbox?status=eq.queued&order=created_at.asc&limit=${limit}`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  return await r.json();
}

async function mark(id: string, patch: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/email_outbox?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) throw new Error("No email provider key configured");
  // Example: Resend
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Falcon <notifications@yourdomain.com>",
      to, subject, html,
    }),
  });
  if (!r.ok) throw new Error(await r.text());
}

function renderTemplate(template: string, payload: any) {
  if (template === "order_event") {
    const ev = payload?.event;
    const orderId = payload?.order_id;
    const meta = payload?.meta;
    return `
      <div style="font-family:system-ui,Segoe UI,Arial">
        <h2>Falcon Update: ${ev}</h2>
        <p>Order: <strong>${orderId}</strong></p>
        ${meta ? `<pre>${JSON.stringify(meta, null, 2)}</pre>` : ""}
        <p><a href="${Deno.env.get("APP_URL") || ""}/orders/${orderId}">Open in Falcon</a></p>
      </div>
    `;
  }
  return "<div>Notification</div>";
}

serve(async () => {
  const items = await fetchQueued(50);
  for (const it of items) {
    try {
      await mark(it.id, { status: "sending", attempts: (it.attempts ?? 0) + 1, claimed_at: new Date().toISOString() });
      const html = renderTemplate(it.template, it.payload);
      await sendEmail(it.to_email, it.subject, html);
      await mark(it.id, { status: "sent", sent_at: new Date().toISOString(), error: null });
    } catch (e) {
      await mark(it.id, { status: "queued", error: String(e).slice(0, 1000) });
    }
  }
  return new Response("ok");
});

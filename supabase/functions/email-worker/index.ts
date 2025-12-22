// Deno deploy (Supabase Edge Function)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "Falcon <no-reply@yourdomain>";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "";
const BATCH_LIMIT = Number(Deno.env.get("EMAIL_BATCH_SIZE") || "25");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function claimBatch(limit = BATCH_LIMIT) {
  const { data, error } = await supabase.rpc("rpc_claim_email_outbox", { p_limit: limit });
  if (error) throw new Error(`claim failed: ${error.message}`);
  return data || [];
}

async function markSent(id: string) {
  const { error } = await supabase.rpc("rpc_mark_email_outbox_sent", { p_id: id });
  if (error) throw new Error(`mark sent failed: ${error.message}`);
}

async function markFailed(id: string, err: string) {
  await supabase.rpc("rpc_mark_email_outbox_failed", { p_id: id, p_error: err.slice(0, 1000) });
}

async function sendEmail(to: string, subject: string, html: string, text?: string) {
  if (!RESEND_API_KEY) throw new Error("No RESEND_API_KEY configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(body || "provider returned non-200");
  }
  return await r.json();
}

function renderTemplate(row: any) {
  const subject = row.subject || "New notification";
  const bodyText = row.body_text || row.body || row.message || "";
  const bodyHtml = row.body_html || `<p>${bodyText}</p>`;
  const link = row.payload?.link_path || (row.order_id ? `${APP_BASE_URL}/orders/${row.order_id}` : "");
  const html = link ? `${bodyHtml}<p><a href="${link}">Open in Falcon</a></p>` : bodyHtml;
  return { subject, html, text: bodyText };
}

serve(async () => {
  const items = await claimBatch();
  if (!items.length) return new Response(JSON.stringify({ ok: true, claimed: 0 }), { headers: { "content-type": "application/json" } });

  let sent = 0;
  let failed = 0;

  for (const it of items) {
    try {
      const tpl = renderTemplate(it);
      await sendEmail(it.to_email, tpl.subject, tpl.html, tpl.text);
      await markSent(it.id);
      sent++;
    } catch (err) {
      failed++;
      await markFailed(it.id, String(err));
    }
  }

  return new Response(JSON.stringify({ ok: true, claimed: items.length, sent, failed }), { headers: { "content-type": "application/json" } });
});

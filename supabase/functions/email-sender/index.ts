import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Prefer ANON; fall back to SERVICE_ROLE; accept SUPABASE_* fallbacks too.
const PROJECT_URL =
  Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const ANON_KEY =
  Deno.env.get("ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BATCH_SIZE = Number(Deno.env.get("EMAIL_BATCH_SIZE") || "25");

if (!PROJECT_URL) throw new Error("Missing PROJECT_URL (or SUPABASE_URL)");

const API_KEY = ANON_KEY ?? SERVICE_ROLE_KEY;
const KEY_KIND = ANON_KEY ? "anon" : (SERVICE_ROLE_KEY ? "service_role" : "missing");
if (!API_KEY) throw new Error("Missing ANON_KEY (or SERVICE_ROLE_KEY)");

const sb = createClient(PROJECT_URL, API_KEY, { auth: { persistSession: false } });

type QueueRow = {
  id: string;
  user_id: string | null;
  to_email: string;
  subject: string;
  template: string;
  payload: Record<string, unknown> | null;
};

function renderTemplate(row: QueueRow) {
  const p = row.payload || {};
  const link = (p["link_path"] as string) || "";
  const orderId = (p["order_id"] as string) || "";
  const when =
    (p["when"] && new Date(String(p["when"])).toLocaleString()) ||
    (p["review_due"] && new Date(String(p["review_due"])).toLocaleString()) ||
    (p["final_due"] && new Date(String(p["final_due"])).toLocaleString()) ||
    "";
  const base = {
    subject: row.subject || "Order update",
    html: `<p>${row.subject}</p><p>Order: ${orderId}</p>${when ? `<p>When: ${when}</p>` : ""}${link ? `<p><a href="${link}">Open order</a></p>` : ""}`,
    text: `${row.subject}\nOrder: ${orderId}${when ? `\nWhen: ${when}` : ""}${link ? `\nOpen: ${link}` : ""}`,
  };
  switch (row.template) {
    case "order_assigned":
      return { subject: "New assignment", html: `<p>You have a new assignment.</p><p>Order: ${orderId}</p>${link ? `<p><a href="${link}">Open order</a></p>` : ""}`, text: `You have a new assignment.\nOrder: ${orderId}${link ? `\nOpen: ${link}` : ""}` };
    case "site_visit_set":
      return { subject: "Site visit scheduled", html: `<p>Site visit scheduled.</p><p>Order: ${orderId}</p>${when ? `<p>When: ${when}</p>` : ""}${link ? `<p><a href="${link}">Open order</a></p>` : ""}`, text: `Site visit scheduled.\nOrder: ${orderId}${when ? `\nWhen: ${when}` : ""}${link ? `\nOpen: ${link}` : ""}` };
    case "review_due_updated":
      return { subject: "Review due updated", html: `<p>Review due updated.</p><p>Order: ${orderId}</p>${when ? `<p>Review due: ${when}</p>` : ""}${link ? `<p><a href="${link}">Open order</a></p>` : ""}`, text: `Review due updated.\nOrder: ${orderId}${when ? `\nReview due: ${when}` : ""}${link ? `\nOpen: ${link}` : ""}` };
    case "client_due_updated":
      return { subject: "Client due updated", html: `<p>Client due updated.</p><p>Order: ${orderId}</p>${when ? `<p>Client due: ${when}</p>` : ""}${link ? `<p><a href="${link}">Open order</a></p>` : ""}`, text: `Client due updated.\nOrder: ${orderId}${when ? `\nClient due: ${when}` : ""}${link ? `\nOpen: ${link}` : ""}` };
    case "due_dates_updated":
      return { subject: "Due dates updated", html: `<p>Due dates updated.</p><p>Order: ${orderId}</p>${link ? `<p><a href="${link}">Open order</a></p>` : ""}`, text: `Due dates updated.\nOrder: ${orderId}${link ? `\nOpen: ${link}` : ""}` };
    default:
      return base;
  }
}

// Stub out provider
async function sendEmailStub(to: string, subject: string, html: string, text: string) {
  console.log(`[email-sender] pretend send → ${to} | ${subject}`);
  await new Promise((r) => setTimeout(r, 25));
  return { ok: true };
}

async function processBatch() {
  const { data: batch, error: claimErr } = await sb.rpc("rpc_claim_email_batch_v1", {
    p_limit: BATCH_SIZE,
    p_worker: "edge",
  });
  if (claimErr) throw new Error(`claim error: ${claimErr.message || claimErr}`);

  const rows: QueueRow[] = batch ?? [];
  if (!rows.length) return { claimed: 0, sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      const tpl = renderTemplate(row);
      const res = await sendEmailStub(row.to_email, tpl.subject, tpl.html, tpl.text);
      if (!res.ok) throw new Error("provider returned not ok");
      const { error: markErr } = await sb.rpc("rpc_mark_email_sent_v1", { p_id: row.id });
      if (markErr) throw new Error(`mark_sent error: ${markErr.message || markErr}`);
      sent++;
    } catch (e) {
      failed++;
      await sb.rpc("rpc_mark_email_failed_v1", { p_id: row.id, p_error: String(e) });
      console.error("[email-sender] send failed:", e);
    }
  }
  return { claimed: rows.length, sent, failed };
}

serve(async (req) => {
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  try {
    const result = await processBatch();
    const body = { ok: true, key_kind: KEY_KIND, ...result };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  } catch (e) {
    const body = JSON.stringify({ ok: false, key_kind: KEY_KIND, error: String(e) });
    console.error("[email-sender] fatal:", e);
    return new Response(body, { status: debug ? 200 : 500, headers: { "content-type": "application/json" } });
  }
});




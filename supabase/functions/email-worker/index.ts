// Deno deploy (Supabase Edge Function)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type EmailTemplateKey,
  renderEmailTemplate,
} from "../../src/lib/notifications/emailTemplates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("RESEND_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "Falcon <no-reply@yourdomain>";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "";
const BATCH_LIMIT = Number(Deno.env.get("EMAIL_BATCH_SIZE") || "25");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type OutboxRow = {
  id: string;
  notification_id?: string | null;
  to_email: string;
  subject?: string | null;
  body_text?: string | null;
  body_html?: string | null;
};

type NotificationRow = {
  id: string;
  type: string | null;
  payload: Record<string, unknown> | null;
  order_id?: string | null;
  link_path?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  order_no?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  entry_contact_name?: string | null;
  entry_contact_phone?: string | null;
  property_contact_name?: string | null;
  property_contact_phone?: string | null;
  special_instructions?: string | null;
  access_notes?: string | null;
  review_due_at?: string | null;
  final_due_at?: string | null;
};

const NOTIFICATION_TEMPLATE_MAP: Record<string, EmailTemplateKey> = {
  "order.new_assigned": "APPRAISER_ASSIGNED",
  "order.sent_to_review": "ORDER_READY_FOR_REVIEW",
  "order.sent_back_to_appraiser": "REVISIONS_REQUIRED",
  "order.due_today": "DUE_TODAY",
  "order.overdue": "OVERDUE",
  "note.addressed": "NOTE_ADDRESSED",
};

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

function isEmailTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && (Object.values(NOTIFICATION_TEMPLATE_MAP) as string[]).includes(value);
}

async function fetchNotification(notificationId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, payload, order_id, link_path, title, body, message")
    .eq("id", notificationId)
    .maybeSingle();
  if (error) throw new Error(`notification fetch failed: ${error.message}`);
  return (data || null) as NotificationRow | null;
}

async function fetchOrder(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_no, address_line1, city, state, postal_code, entry_contact_name, entry_contact_phone, property_contact_name, property_contact_phone, special_instructions, access_notes, review_due_at, final_due_at"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`order fetch failed: ${error.message}`);
  return (data || null) as OrderRow | null;
}

function formatDate(raw: unknown) {
  if (!raw) return "";
  const date = new Date(String(raw));
  return isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString();
}

function buildPropertyAddress(payload: Record<string, unknown>, order: OrderRow | null) {
  const fromPayload =
    payload.property_address || payload.address || payload.address_line1 || payload.address1 || payload.street;
  if (fromPayload) return String(fromPayload);
  const parts = [order?.address_line1, order?.city, order?.state, order?.postal_code].filter(Boolean);
  return parts.join(", ");
}

function buildOrderUrl(
  payload: Record<string, unknown>,
  notification: NotificationRow | null,
  order: OrderRow | null
) {
  if (payload.order_url) return String(payload.order_url);

  const base = APP_BASE_URL.replace(/\/+$/, "");
  const linkPath = (payload.link_path as string) || notification?.link_path || "";
  const orderId = (payload.order_id as string) || notification?.order_id || order?.id || "";

  if (linkPath) {
    return base ? `${base}${linkPath.startsWith("/") ? "" : "/"}${linkPath}` : linkPath;
  }
  if (orderId) {
    const path = `/orders/${orderId}`;
    return base ? `${base}${path}` : path;
  }
  return "";
}

function buildPayload(notification: NotificationRow | null, order: OrderRow | null) {
  const payload: Record<string, unknown> = { ...(notification?.payload || {}) };
  payload.order_id = payload.order_id || notification?.order_id || order?.id;
  payload.order_number =
    payload.order_number || order?.order_number || order?.order_no || notification?.payload?.order_number || order?.id;
  payload.property_address = buildPropertyAddress(payload, order);

  const dueRaw =
    payload.due_date ||
    payload.review_due_at ||
    payload.final_due_at ||
    order?.review_due_at ||
    order?.final_due_at ||
    null;
  payload.due_date = dueRaw ? formatDate(dueRaw) : "";

  payload.contact_name =
    payload.contact_name || order?.entry_contact_name || order?.property_contact_name || notification?.payload?.contact_name;
  payload.contact_phone =
    payload.contact_phone || order?.entry_contact_phone || order?.property_contact_phone || notification?.payload?.contact_phone;
  payload.special_instructions =
    payload.special_instructions || order?.special_instructions || order?.access_notes || notification?.payload?.special_instructions;
  payload.author_name = payload.author_name || (payload.author as string) || notification?.payload?.author_name;
  payload.note_preview = payload.note_preview || payload.note || payload.message || notification?.payload?.message;

  payload.order_url = buildOrderUrl(payload, notification, order);

  return payload;
}

function resolveTemplateKey(notification: NotificationRow | null) {
  const explicit =
    notification?.payload?.email_template_key ||
    notification?.payload?.template_key ||
    (notification?.payload as Record<string, unknown> | null)?.templateKey;
  if (isEmailTemplateKey(explicit)) return explicit;

  if (notification?.type && NOTIFICATION_TEMPLATE_MAP[notification.type]) {
    return NOTIFICATION_TEMPLATE_MAP[notification.type];
  }
  return null;
}

function markdownToHtml(text: string) {
  const paragraphs = (text || "").split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br>"));
  let html = paragraphs.map((p) => `<p>${p}</p>`).join("");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2">$1</a>`);
  return html;
}

function renderBody(body: string) {
  const text = body || "";
  const html = markdownToHtml(text);
  return { html, text };
}

async function renderTemplate(row: OutboxRow) {
  const notification = row.notification_id ? await fetchNotification(row.notification_id) : null;
  const order = notification?.order_id ? await fetchOrder(notification.order_id) : null;

  const templateKey = resolveTemplateKey(notification);
  const payload = buildPayload(notification, order);

  if (templateKey) {
    const rendered = renderEmailTemplate(templateKey, payload);
    const body = renderBody(rendered.body);
    const subject = rendered.subject || row.subject || notification?.title || "New notification";
    return { subject, html: body.html, text: body.text };
  }

  const subject = row.subject || notification?.title || "New notification";
  const bodyText = row.body_text || notification?.body || notification?.message || "";
  const bodyHtml = row.body_html || markdownToHtml(bodyText);
  const orderUrl = buildOrderUrl(payload, notification, order);
  const html = orderUrl ? `${bodyHtml}<p><a href="${orderUrl}">Open in Falcon</a></p>` : bodyHtml;

  return { subject, html, text: bodyText };
}

serve(async () => {
  const items = await claimBatch();
  if (!items.length) {
    return new Response(JSON.stringify({ ok: true, claimed: 0 }), { headers: { "content-type": "application/json" } });
  }

  let sent = 0;
  let failed = 0;

  for (const it of items as OutboxRow[]) {
    try {
      const tpl = await renderTemplate(it);
      await sendEmail(it.to_email, tpl.subject, tpl.html, tpl.text);
      await markSent(it.id);
      sent++;
    } catch (err) {
      failed++;
      await markFailed(it.id, String(err));
    }
  }

  return new Response(JSON.stringify({ ok: true, claimed: items.length, sent, failed }), {
    headers: { "content-type": "application/json" },
  });
});

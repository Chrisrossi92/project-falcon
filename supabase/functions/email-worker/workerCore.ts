export type EmailQueueRow = {
  id: string;
  user_id?: string | null;
  to_email: string;
  subject?: string | null;
  template?: string | null;
  payload?: Record<string, unknown> | null;
};

type RpcResult<T> = { data?: T | null; error?: { message?: string } | null };

type SupabaseClientLike = {
  rpc: <T = unknown>(name: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type EmailWorkerConfig = {
  resendApiKey?: string | null;
  emailFrom?: string | null;
  appBaseUrl?: string | null;
  batchLimit?: number;
  workerName?: string;
};

const DEFAULT_BATCH_LIMIT = 25;

const TEMPLATE_LABELS: Record<string, { subject: string; body: string }> = {
  APPRAISER_ASSIGNED: {
    subject: "New Order Assigned - #{order_number}",
    body: [
      "You have been assigned a new appraisal order.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "**Due Date:** {due_date}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  ORDER_READY_FOR_REVIEW: {
    subject: "Order Ready for Review - #{order_number}",
    body: [
      "An appraisal order has been submitted for review.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  REVISIONS_REQUIRED: {
    subject: "Revisions Required - #{order_number}",
    body: [
      "Revisions are required for this appraisal order.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  DUE_TODAY: {
    subject: "Order Due Today - #{order_number}",
    body: [
      "This appraisal order is due today.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  OVERDUE: {
    subject: "Order Overdue - #{order_number}",
    body: [
      "This appraisal order is overdue.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "**Due Date:** {due_date}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
  NOTE_ADDRESSED: {
    subject: "New Note - Order #{order_number}",
    body: [
      "A new note was added to an appraisal order.",
      "",
      "**Order:** #{order_number}",
      "**Property:** {property_address}",
      "**From:** {author_name}",
      "",
      "{note_preview}",
      "",
      "[Open Order]({order_url})",
    ].join("\n"),
  },
};

const EVENT_TEMPLATE_MAP: Record<string, string> = {
  "order.new_assigned": "APPRAISER_ASSIGNED",
  "order.assigned_appraiser": "APPRAISER_ASSIGNED",
  "order.reassigned_appraiser": "APPRAISER_ASSIGNED",
  "order.sent_to_review": "ORDER_READY_FOR_REVIEW",
  "order.resubmitted_to_review": "ORDER_READY_FOR_REVIEW",
  "order.sent_back_to_appraiser": "REVISIONS_REQUIRED",
  "order.due_today": "DUE_TODAY",
  "order.overdue": "OVERDUE",
  "note.addressed": "NOTE_ADDRESSED",
  "note.appraiser_added": "NOTE_ADDRESSED",
  "note.reviewer_added": "NOTE_ADDRESSED",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePayload(row: EmailQueueRow, appBaseUrl = "") {
  const rawPayload = isObject(row.payload) ? row.payload : {};
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    payload[key] = stringValue(value);
  }

  payload.order_id = payload.order_id || "";
  payload.order_number = payload.order_number || payload.order_no || payload.order_id || "";
  payload.property_address =
    payload.property_address ||
    payload.address ||
    [payload.address_line1, payload.city, payload.state, payload.postal_code].filter(Boolean).join(", ");
  payload.due_date = payload.due_date || payload.review_due_at || payload.final_due_at || "";
  payload.author_name = payload.author_name || payload.actor_name || "";
  payload.note_preview = payload.note_preview || payload.note_text || payload.message || "";

  const base = appBaseUrl.replace(/\/+$/, "");
  const linkPath = payload.link_path || "";
  if (!payload.order_url && linkPath) {
    payload.order_url = base ? `${base}${linkPath.startsWith("/") ? "" : "/"}${linkPath}` : linkPath;
  }
  if (!payload.order_url && payload.order_id) {
    payload.order_url = base ? `${base}/orders/${payload.order_id}` : `/orders/${payload.order_id}`;
  }

  return payload;
}

function replaceTokens(template: string, payload: Record<string, string>) {
  return template.replace(/#?\{([^}]+)\}/g, (_, token) => {
    const key = String(token).trim();
    return payload[key] ?? "";
  });
}

function markdownToHtml(text: string) {
  const escaped = escapeHtml(text || "");
  const paragraphs = escaped.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n/g, "<br>"));
  let html = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function resolveTemplateName(row: EmailQueueRow) {
  const payload = isObject(row.payload) ? row.payload : {};
  const explicit =
    stringValue(payload.email_template_key) ||
    stringValue(payload.template_key) ||
    stringValue(payload.templateKey);
  if (explicit && TEMPLATE_LABELS[explicit]) return explicit;

  const template = stringValue(row.template);
  if (template && TEMPLATE_LABELS[template]) return template;
  if (template && EVENT_TEMPLATE_MAP[template]) return EVENT_TEMPLATE_MAP[template];

  return null;
}

export function renderEmailQueueRow(row: EmailQueueRow, appBaseUrl = "") {
  const payload = normalizePayload(row, appBaseUrl);
  const templateName = resolveTemplateName(row);
  if (templateName) {
    const template = TEMPLATE_LABELS[templateName];
    const subject = replaceTokens(template.subject, payload) || row.subject || "Falcon notification";
    const text = replaceTokens(template.body, payload);
    return { subject, html: markdownToHtml(text), text };
  }

  const subject = row.subject || "Falcon notification";
  const message = payload.message || payload.body || subject;
  const link = payload.order_url ? `\n\n[Open in Falcon](${payload.order_url})` : "";
  const text = `${message}${link}`;
  return { subject, html: markdownToHtml(text), text };
}

async function claimBatch(supabase: SupabaseClientLike, limit: number, workerName: string) {
  const { data, error } = await supabase.rpc<EmailQueueRow[]>("rpc_claim_email_batch_v1", {
    p_limit: limit,
    p_worker: workerName,
  });
  if (error) throw new Error(`claim failed: ${error.message || "unknown error"}`);
  return data || [];
}

async function markSent(supabase: SupabaseClientLike, id: string) {
  const { error } = await supabase.rpc("rpc_mark_email_sent_v1", { p_id: id });
  if (error) throw new Error(`mark sent failed: ${error.message || "unknown error"}`);
}

async function markFailed(supabase: SupabaseClientLike, id: string, errorMessage: string) {
  await supabase.rpc("rpc_mark_email_failed_v1", {
    p_id: id,
    p_error: errorMessage.slice(0, 1000),
  });
}

async function sendViaResend(
  fetchImpl: FetchLike,
  apiKey: string,
  from: string,
  row: EmailQueueRow,
  rendered: { subject: string; html: string; text: string }
) {
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: row.to_email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Resend returned ${response.status}`);
  }
}

export function createEmailQueueProcessor({
  supabase,
  fetchImpl,
  config,
}: {
  supabase: SupabaseClientLike;
  fetchImpl: FetchLike;
  config: EmailWorkerConfig;
}) {
  const batchLimit = Number.isFinite(config.batchLimit) && Number(config.batchLimit) > 0
    ? Number(config.batchLimit)
    : DEFAULT_BATCH_LIMIT;
  const workerName = config.workerName || "email-worker";
  const emailFrom = config.emailFrom || "";
  const appBaseUrl = config.appBaseUrl || "";
  const resendApiKey = config.resendApiKey || "";

  return async function processEmailQueue() {
    const items = await claimBatch(supabase, batchLimit, workerName);
    let sent = 0;
    let failed = 0;

    for (const row of items) {
      try {
        if (!resendApiKey) throw new Error("No RESEND_API_KEY configured");
        if (!emailFrom) throw new Error("No EMAIL_FROM configured");
        const rendered = renderEmailQueueRow(row, appBaseUrl);
        await sendViaResend(fetchImpl, resendApiKey, emailFrom, row, rendered);
        await markSent(supabase, row.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        await markFailed(supabase, row.id, error instanceof Error ? error.message : String(error));
      }
    }

    return { claimed: items.length, sent, failed };
  };
}

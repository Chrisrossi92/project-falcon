const JSON_HEADERS = { "content-type": "application/json" };

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export function isAuthorized(authHeader, cronSecret) {
  if (!cronSecret) return false;
  return firstHeaderValue(authHeader) === `Bearer ${cronSecret}`;
}

export function buildEmailWorkerUrl(supabaseUrl) {
  const baseUrl = String(supabaseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) throw new Error("Missing SUPABASE_URL");
  return `${baseUrl}/functions/v1/email-worker`;
}

export async function invokeEmailWorker({
  fetchImpl = fetch,
  supabaseUrl,
  serviceRoleKey,
} = {}) {
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetchImpl(buildEmailWorkerUrl(supabaseUrl), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      ...JSON_HEADERS,
    },
    body: JSON.stringify({ source: "vercel-cron" }),
  });
  const bodyText = await response.text();
  let body = bodyText;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    // Keep the raw response text for non-JSON upstream failures.
  }

  if (!response.ok) {
    throw new Error(
      `email-worker returned ${response.status}: ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }

  return body;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({ ok: false, error: "cron_secret_not_configured" });
  }

  if (!isAuthorized(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    const worker = await invokeEmailWorker({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    return res.status(200).json({ ok: true, worker });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron/email-worker] failed:", message);
    return res.status(500).json({ ok: false, error: message });
  }
}

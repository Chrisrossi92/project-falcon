import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("CLIENT_PORTAL_REPORT_SIGNED_URL_TTL_SECONDS") || "300");
const APP_ORIGINS = [
  Deno.env.get("APP_ORIGIN"),
  Deno.env.get("SITE_URL"),
  Deno.env.get("PUBLIC_SITE_URL"),
  Deno.env.get("APP_URL"),
  Deno.env.get("VERCEL_URL") ? `https://${Deno.env.get("VERCEL_URL")}` : null,
]
  .flatMap((value) => String(value || "").split(","))
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

type RequestBody = {
  order_key?: unknown;
};

type AuthorizedReport = {
  document_id?: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  report_ready_at?: string | null;
  report_delivered_at?: string | null;
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_order_key"
  | "report_unavailable"
  | "download_not_authorized"
  | "signed_url_failed";

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin")?.replace(/\/$/, "") ?? "";
  if (!origin) return "*";

  const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isConfigured = APP_ORIGINS.includes(origin);
  const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

  return isLocalDev || isConfigured || isVercelPreview ? origin : "null";
}

function corsHeaders(req: Request) {
  return {
    ...CORS_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin(req),
  };
}

function jsonResponse(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "content-type": "application/json",
    },
  });
}

function errorResponse(req: Request, code: ErrorCode, message: string, status: number) {
  return jsonResponse(req, { ok: false, code, message }, status);
}

function bearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function safeOrderKey(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{64}$/i.test(text) ? text.toLowerCase() : null;
}

function safeDownloadName(fileName: string | null | undefined) {
  const fallback = "final-appraisal-report.pdf";
  const cleaned = String(fileName || fallback).replace(/[\r\n"]/g, "").trim();
  return cleaned || fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return errorResponse(req, "invalid_order_key", "Use POST with a valid portal order key.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse(req, "unauthenticated", "Sign in before downloading reports.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(req, "invalid_order_key", "A valid portal order key is required.", 400);
  }

  const orderKey = safeOrderKey(body.order_key);
  if (!orderKey) {
    return errorResponse(req, "invalid_order_key", "A valid portal order key is required.", 400);
  }

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: authorizedRows, error: authorizeError } = await callerClient.rpc(
    "rpc_client_portal_report_authorize_download",
    { p_order_key: orderKey },
  );

  if (authorizeError) {
    const message = /reports_read_required|access_required|permission|not authorized/i.test(
      authorizeError.message,
    )
      ? "You cannot download this report."
      : "The final report is not available yet.";
    const code = message.includes("cannot") ? "download_not_authorized" : "report_unavailable";
    return errorResponse(req, code, message, code === "download_not_authorized" ? 403 : 404);
  }

  const authorized = (Array.isArray(authorizedRows) ? authorizedRows[0] : null) as AuthorizedReport | null;
  if (!authorized?.document_id) {
    return errorResponse(req, "report_unavailable", "The final report is not available yet.", 404);
  }

  const { data: documentRow, error: documentError } = await serviceClient
    .from("order_documents")
    .select("id, storage_bucket, storage_path, file_name, mime_type")
    .eq("id", authorized.document_id)
    .eq("category", "final_report")
    .eq("visibility_scope", "client")
    .eq("status", "active")
    .maybeSingle();

  if (documentError) {
    console.error("[client-portal-report-download-url] metadata lookup failed", documentError);
    return errorResponse(req, "signed_url_failed", "The report download could not be prepared.", 500);
  }

  if (!documentRow?.storage_bucket || !documentRow?.storage_path) {
    return errorResponse(req, "report_unavailable", "The final report is not available yet.", 404);
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(documentRow.storage_bucket)
    .createSignedUrl(documentRow.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: safeDownloadName(authorized.file_name || documentRow.file_name),
    });

  if (signedError || !signed?.signedUrl) {
    console.error("[client-portal-report-download-url] signed URL failed", signedError);
    return errorResponse(req, "signed_url_failed", "The report download could not be prepared.", 500);
  }

  return jsonResponse(req, {
    ok: true,
    report: {
      file_name: authorized.file_name || documentRow.file_name || "final-appraisal-report.pdf",
      mime_type: authorized.mime_type || documentRow.mime_type || null,
      file_size: authorized.file_size ?? null,
      report_ready_at: authorized.report_ready_at ?? null,
      report_delivered_at: authorized.report_delivered_at ?? null,
    },
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
});

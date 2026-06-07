import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("VENDOR_DOCUMENT_SIGNED_URL_TTL_SECONDS") || "300");
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
  work_key?: unknown;
  assignment_work_key?: unknown;
  document_key?: unknown;
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_document_key"
  | "document_not_found"
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

function isOpaqueKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value.trim());
}

function safeDownloadName(fileName: string | null | undefined) {
  const fallback = "vendor-document";
  const cleaned = String(fileName || fallback).replace(/[\r\n"]/g, "").trim();
  return cleaned || fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return errorResponse(req, "invalid_document_key", "Use POST with valid document keys.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse(req, "unauthenticated", "Sign in before downloading vendor documents.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(req, "invalid_document_key", "Valid work and document keys are required.", 400);
  }

  const hasWorkKey = isOpaqueKey(body.work_key);
  const hasAssignmentWorkKey = isOpaqueKey(body.assignment_work_key);

  if ((!hasWorkKey && !hasAssignmentWorkKey) || (hasWorkKey && hasAssignmentWorkKey) || !isOpaqueKey(body.document_key)) {
    return errorResponse(req, "invalid_document_key", "Valid work and document keys are required.", 400);
  }

  const workKey = hasWorkKey ? String(body.work_key).trim().toLowerCase() : null;
  const assignmentWorkKey = hasAssignmentWorkKey ? String(body.assignment_work_key).trim().toLowerCase() : null;
  const documentKey = String(body.document_key).trim().toLowerCase();
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

  const { data: authorized, error: authorizeError } = assignmentWorkKey
    ? await callerClient.rpc(
        "rpc_vendor_workspace_authorize_assignment_document_access",
        { p_assignment_work_key: assignmentWorkKey, p_document_key: documentKey },
      )
    : await callerClient.rpc(
        "rpc_vendor_workspace_authorize_document_access",
        { p_work_key: workKey, p_document_key: documentKey },
      );

  if (authorizeError) {
    return errorResponse(req, "download_not_authorized", "You cannot download this document.", 403);
  }

  if (!authorized?.ok || !authorized?.document?.document_key) {
    return errorResponse(req, "document_not_found", "Document not found.", 404);
  }

  const { data: storageRows, error: storageError } = assignmentWorkKey
    ? await serviceClient.rpc(
        "rpc_vendor_workspace_assignment_document_storage_lookup",
        { p_assignment_work_key: assignmentWorkKey, p_document_key: documentKey },
      )
    : await serviceClient.rpc(
        "rpc_vendor_workspace_document_storage_lookup",
        { p_work_key: workKey, p_document_key: documentKey },
      );

  if (storageError) {
    console.error("[vendor-workspace-document-download-url] storage lookup failed", storageError);
    return errorResponse(req, "signed_url_failed", "The download could not be prepared.", 500);
  }

  const storage = Array.isArray(storageRows) ? storageRows[0] : null;
  if (!storage?.storage_bucket || !storage?.storage_path) {
    return errorResponse(req, "document_not_found", "Document not found.", 404);
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(storage.storage_bucket)
    .createSignedUrl(storage.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: safeDownloadName(storage.file_name),
    });

  if (signedError || !signed?.signedUrl) {
    console.error("[vendor-workspace-document-download-url] signed URL failed", signedError);
    return errorResponse(req, "signed_url_failed", "The download could not be prepared.", 500);
  }

  return jsonResponse(req, {
    ok: true,
    document: authorized.document,
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
});

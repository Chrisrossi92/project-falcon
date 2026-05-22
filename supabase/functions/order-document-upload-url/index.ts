import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
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
  order_id?: unknown;
  category?: unknown;
  file_name?: unknown;
  mime_type?: unknown;
  file_size?: unknown;
  visibility_scope?: unknown;
  title?: unknown;
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_upload_request"
  | "upload_not_authorized"
  | "signed_upload_failed";

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

function prepareUploadErrorResponse(req: Request, error: { message?: string }) {
  const message = String(error?.message || "");

  if (/order not found/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "Order not found.", 400);
  }

  if (/file_name required/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "File name is required.", 400);
  }

  if (/invalid document category/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "Choose a valid document category.", 400);
  }

  if (/invalid upload visibility scope/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "Choose a valid document visibility.", 400);
  }

  if (/invalid file_size/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "File size must be 50 MB or smaller.", 400);
  }

  if (/invalid mime_type/i.test(message)) {
    return errorResponse(req, "invalid_upload_request", "File type is invalid.", 400);
  }

  if (/not authorized|current company required|current app user required/i.test(message)) {
    return errorResponse(
      req,
      "upload_not_authorized",
      "You cannot upload documents to this order.",
      403,
    );
  }

  console.error("[order-document-upload-url] prepare upload failed", error);
  return errorResponse(req, "invalid_upload_request", "The upload could not be prepared.", 400);
}

function bearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function optionalInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return errorResponse(req, "invalid_upload_request", "Use POST with valid upload metadata.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse(req, "unauthenticated", "Sign in before uploading order documents.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(req, "invalid_upload_request", "Valid upload metadata is required.", 400);
  }

  if (!isUuid(body.order_id) || typeof body.category !== "string" || typeof body.file_name !== "string") {
    return errorResponse(req, "invalid_upload_request", "Order id, category, and file name are required.", 400);
  }

  const fileSize = optionalInteger(body.file_size);
  if (body.file_size !== undefined && body.file_size !== null && fileSize === null) {
    return errorResponse(req, "invalid_upload_request", "File size must be a number.", 400);
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

  const { data: preparedRows, error: prepareError } = await callerClient.rpc(
    "rpc_order_document_prepare_upload",
    {
      p_order_id: body.order_id.trim().toLowerCase(),
      p_category: body.category,
      p_file_name: body.file_name,
      p_mime_type: optionalString(body.mime_type),
      p_file_size: fileSize,
      p_visibility_scope: optionalString(body.visibility_scope) ?? "internal",
      p_title: optionalString(body.title),
    },
  );

  if (prepareError) {
    return prepareUploadErrorResponse(req, prepareError);
  }

  const prepared = Array.isArray(preparedRows) ? preparedRows[0] : null;
  if (!prepared?.id || !prepared?.storage_bucket || !prepared?.storage_path) {
    return errorResponse(req, "invalid_upload_request", "The upload could not be prepared.", 400);
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(prepared.storage_bucket)
    .createSignedUploadUrl(prepared.storage_path);

  if (signedError || !signed?.signedUrl) {
    console.error("[order-document-upload-url] signed upload URL failed", signedError);
    return errorResponse(req, "signed_upload_failed", "The upload could not be prepared.", 500);
  }

  return jsonResponse(req, {
    ok: true,
    document: {
      id: prepared.id,
      order_id: prepared.order_id,
      company_id: prepared.company_id,
      category: prepared.category,
      title: prepared.title,
      file_name: prepared.file_name,
      mime_type: prepared.mime_type,
      file_size: prepared.file_size,
      visibility_scope: prepared.visibility_scope,
      status: prepared.status,
      created_at: prepared.created_at,
      updated_at: prepared.updated_at,
    },
    upload: {
      signed_url: signed.signedUrl,
      token: signed.token,
      path: prepared.storage_path,
      bucket: prepared.storage_bucket,
    },
  });
});

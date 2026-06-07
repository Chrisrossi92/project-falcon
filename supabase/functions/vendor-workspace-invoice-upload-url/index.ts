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
  assignment_work_key?: unknown;
  file_name?: unknown;
  mime_type?: unknown;
  file_size?: unknown;
  document_role?: unknown;
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

function bearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isOpaqueKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value.trim());
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function optionalInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function uploadErrorResponse(req: Request, prepared: Record<string, unknown>) {
  const error = String(prepared.error || "");
  const fieldErrors = prepared.field_errors && typeof prepared.field_errors === "object"
    ? prepared.field_errors as Record<string, unknown>
    : {};
  const message =
    typeof fieldErrors.file_name === "string" ? fieldErrors.file_name
      : typeof fieldErrors.mime_type === "string" ? fieldErrors.mime_type
      : typeof fieldErrors.file_size === "string" ? fieldErrors.file_size
      : typeof fieldErrors.action === "string" ? fieldErrors.action
      : error === "payment_unavailable" ? "This payment item is no longer available."
      : error === "invoice_already_submitted" ? "An invoice has already been submitted for this assignment."
      : "The invoice upload could not be prepared.";

  const status = error === "payment_unavailable" ? 404 : 400;
  return errorResponse(req, "invalid_upload_request", message, status);
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
    return errorResponse(req, "unauthenticated", "Sign in before uploading invoice files.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(req, "invalid_upload_request", "Valid upload metadata is required.", 400);
  }

  if (!isOpaqueKey(body.assignment_work_key) || typeof body.file_name !== "string") {
    return errorResponse(req, "invalid_upload_request", "Assigned order and file name are required.", 400);
  }

  const fileSize = optionalInteger(body.file_size);
  if (body.file_size !== undefined && body.file_size !== null && fileSize === null) {
    return errorResponse(req, "invalid_upload_request", "File size must be a number.", 400);
  }

  const assignmentWorkKey = String(body.assignment_work_key).trim().toLowerCase();
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

  const { data: prepared, error: prepareError } = await callerClient.rpc(
    "rpc_vendor_workspace_prepare_invoice_upload",
    {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: body.file_name,
        mime_type: optionalString(body.mime_type),
        file_size: fileSize,
        document_role: optionalString(body.document_role) ?? "vendor_invoice",
      },
    },
  );

  if (prepareError) {
    const message = String(prepareError.message || "");
    if (/permission|required|not authorized/i.test(message)) {
      return errorResponse(req, "upload_not_authorized", "You cannot upload invoices for this assignment.", 403);
    }

    console.error("[vendor-workspace-invoice-upload-url] prepare failed", prepareError);
    return errorResponse(req, "invalid_upload_request", "The invoice upload could not be prepared.", 400);
  }

  if (!prepared?.ok) {
    return uploadErrorResponse(req, prepared || {});
  }

  if (!prepared?.document?.document_key || !prepared?.upload?.storage_bucket || !prepared?.upload?.storage_path) {
    return errorResponse(req, "invalid_upload_request", "The invoice upload could not be prepared.", 400);
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(prepared.upload.storage_bucket)
    .createSignedUploadUrl(prepared.upload.storage_path);

  if (signedError || !signed?.signedUrl) {
    console.error("[vendor-workspace-invoice-upload-url] signed upload URL failed", signedError);
    return errorResponse(req, "signed_upload_failed", "The invoice upload could not be prepared.", 500);
  }

  return jsonResponse(req, {
    ok: true,
    document: prepared.document,
    upload: {
      signed_url: signed.signedUrl,
      token: signed.token,
    },
  });
});

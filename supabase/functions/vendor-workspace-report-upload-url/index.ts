import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const APP_ORIGINS = [
  "https://continentalres.com",
  "https://www.continentalres.com",
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
  const isContinentalProduction = /^https:\/\/(www\.)?continentalres\.com$/i.test(origin);
  const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

  return isLocalDev || isConfigured || isContinentalProduction || isVercelPreview ? origin : "null";
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

function errorResponse(
  req: Request,
  code: ErrorCode,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
) {
  return jsonResponse(req, { ok: false, code, message, details }, status);
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
      : error === "assigned_order_unavailable" ? "This assigned order is no longer available."
      : "The report upload could not be prepared.";

  const status = error === "assigned_order_unavailable" ? 404 : 400;
  return errorResponse(req, "invalid_upload_request", message, status, {
    reason: error || "prepare_rejected",
    field_errors: fieldErrors,
    assignment_status: typeof prepared.status === "string" ? prepared.status : null,
  });
}

function safeRpcErrorDetails(error: unknown) {
  const rpcError = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  return {
    rpc_code: typeof rpcError?.code === "string" ? rpcError.code : null,
    rpc_details: typeof rpcError?.details === "string" ? rpcError.details : null,
    rpc_hint: typeof rpcError?.hint === "string" ? rpcError.hint : null,
    rpc_message: typeof rpcError?.message === "string" ? rpcError.message : null,
  };
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
    return errorResponse(req, "unauthenticated", "Sign in before uploading report files.", 401);
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
    "rpc_vendor_workspace_prepare_report_document_upload",
    {
      p_assignment_work_key: assignmentWorkKey,
      p_payload: {
        file_name: body.file_name,
        mime_type: optionalString(body.mime_type),
        file_size: fileSize,
        document_role: optionalString(body.document_role) ?? "submitted_report",
      },
    },
  );

  if (prepareError) {
    const message = String(prepareError.message || "");
    if (/permission|required|not authorized/i.test(message)) {
      const details = safeRpcErrorDetails(prepareError);
      console.warn("[vendor-workspace-report-upload-url] prepare denied", details);
      return errorResponse(
        req,
        "upload_not_authorized",
        "You cannot upload reports for this assignment.",
        403,
        details,
      );
    }

    const details = safeRpcErrorDetails(prepareError);
    console.error("[vendor-workspace-report-upload-url] prepare failed", details);
    return errorResponse(
      req,
      "invalid_upload_request",
      "The report upload could not be prepared.",
      400,
      details,
    );
  }

  if (!prepared?.ok) {
    console.warn("[vendor-workspace-report-upload-url] prepare rejected", {
      error: prepared?.error || null,
      status: prepared?.status || null,
      field_errors: prepared?.field_errors || null,
    });
    return uploadErrorResponse(req, prepared || {});
  }

  if (!prepared?.document?.document_key || !prepared?.upload?.storage_bucket || !prepared?.upload?.storage_path) {
    console.error("[vendor-workspace-report-upload-url] prepare response missing upload target", {
      has_document_key: Boolean(prepared?.document?.document_key),
      has_storage_bucket: Boolean(prepared?.upload?.storage_bucket),
      has_storage_path: Boolean(prepared?.upload?.storage_path),
    });
    return errorResponse(req, "invalid_upload_request", "The report upload could not be prepared.", 400, {
      reason: "prepare_response_missing_upload_target",
    });
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(prepared.upload.storage_bucket)
    .createSignedUploadUrl(prepared.upload.storage_path);

  if (signedError || !signed?.signedUrl) {
    console.error("[vendor-workspace-report-upload-url] signed upload URL failed", {
      message: signedError?.message || null,
      name: signedError?.name || null,
      bucket_present: Boolean(prepared.upload.storage_bucket),
      path_present: Boolean(prepared.upload.storage_path),
    });
    return errorResponse(req, "signed_upload_failed", "The report upload could not be prepared.", 500, {
      reason: "signed_upload_url_failed",
      storage_bucket_present: Boolean(prepared.upload.storage_bucket),
      storage_path_present: Boolean(prepared.upload.storage_path),
    });
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

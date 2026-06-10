import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS") || "300");
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
  document_id?: unknown;
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_document_id"
  | "document_not_found"
  | "download_not_authorized"
  | "storage_object_missing"
  | "signed_url_failed";

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

function logSafe(event: string, details: Record<string, unknown> = {}) {
  console.info("[order-document-download-url]", event, details);
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

function safeDownloadName(fileName: string | null | undefined) {
  const fallback = "order-document";
  const cleaned = String(fileName || fallback).replace(/[\r\n"]/g, "").trim();
  return cleaned || fallback;
}

function normalizeStorageTarget(bucket: string, path: string) {
  const normalizedBucket = bucket.trim().replace(/^\/+|\/+$/g, "");
  let normalizedPath = path.trim().replace(/^\/+/g, "");
  const bucketPrefix = `${normalizedBucket}/`;

  if (normalizedPath.startsWith(bucketPrefix)) {
    normalizedPath = normalizedPath.slice(bucketPrefix.length);
  }

  return {
    bucket: normalizedBucket,
    path: normalizedPath,
    shape: {
      bucket_present: normalizedBucket.length > 0,
      path_present: normalizedPath.length > 0,
      original_path_had_leading_slash: path.trim().startsWith("/"),
      original_path_had_bucket_prefix: path.trim().replace(/^\/+/g, "").startsWith(bucketPrefix),
      path_segment_count: normalizedPath ? normalizedPath.split("/").filter(Boolean).length : 0,
      file_extension: normalizedPath.includes(".") ? normalizedPath.split(".").pop()?.toLowerCase() || null : null,
    },
  };
}

function safeStorageErrorDetails(error: unknown) {
  const storageError = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };

  return {
    name: typeof storageError?.name === "string" ? storageError.name : null,
    message: typeof storageError?.message === "string" ? storageError.message : null,
    status_code:
      typeof storageError?.statusCode === "string" || typeof storageError?.statusCode === "number"
        ? String(storageError.statusCode)
        : typeof storageError?.status === "string" || typeof storageError?.status === "number"
          ? String(storageError.status)
          : null,
  };
}

function isStorageMissingError(error: unknown) {
  const details = safeStorageErrorDetails(error);
  const message = details.message || "";
  const statusCode = details.status_code || "";

  return statusCode === "404" || /not found|does not exist|object.*missing|no such/i.test(message);
}

function signedErrorDetails(error: unknown, storageShape: Record<string, unknown>) {
  const details = safeStorageErrorDetails(error);

  return {
    storage: storageShape,
    signed_error_name: details.name,
    signed_error_status_code: details.status_code,
  };
}

function signedErrorLogDetails(
  documentId: string,
  error: unknown,
  storageShape: Record<string, unknown>,
) {
  const details = safeStorageErrorDetails(error);

  return {
    document_id: documentId,
    storage: storageShape,
    name: details.name,
    status_code: details.status_code,
    message: details.message,
  };
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
    return errorResponse(req, "invalid_document_id", "Use POST with a valid document id.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse(req, "unauthenticated", "Sign in before downloading order documents.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(req, "invalid_document_id", "A valid document id is required.", 400);
  }

  if (!isUuid(body.document_id)) {
    return errorResponse(req, "invalid_document_id", "A valid document id is required.", 400);
  }

  const documentId = body.document_id.trim().toLowerCase();
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
    "rpc_order_document_authorize_download",
    { p_document_id: documentId },
  );

  if (authorizeError) {
    logSafe("authorization_failed", {
      document_id: documentId,
      code: authorizeError.code,
      message: authorizeError.message,
    });
    const status = /not found/i.test(authorizeError.message) ? 404 : 403;
    const code = status === 404 ? "document_not_found" : "download_not_authorized";
    return errorResponse(
      req,
      code,
      status === 404 ? "Document not found." : "You cannot download this document.",
      status,
      safeRpcErrorDetails(authorizeError),
    );
  }

  const authorized = Array.isArray(authorizedRows) ? authorizedRows[0] : null;
  if (!authorized?.id) {
    logSafe("authorization_empty", { document_id: documentId });
    return errorResponse(req, "document_not_found", "Document not found.", 404);
  }

  const { data: documentRow, error: documentError } = await serviceClient
    .from("order_documents")
    .select("id, storage_bucket, storage_path, file_name, mime_type")
    .eq("id", documentId)
    .eq("status", "active")
    .maybeSingle();

  if (documentError) {
    console.error("[order-document-download-url] metadata lookup failed", {
      document_id: documentId,
      code: documentError.code,
      message: documentError.message,
    });
    return errorResponse(req, "signed_url_failed", "The download could not be prepared.", 500);
  }

  if (!documentRow?.storage_bucket || !documentRow?.storage_path) {
    logSafe("metadata_missing_storage_target", {
      document_id: documentId,
      has_storage_bucket: Boolean(documentRow?.storage_bucket),
      has_storage_path: Boolean(documentRow?.storage_path),
    });
    return errorResponse(req, "document_not_found", "Document not found.", 404);
  }

  const storageTarget = normalizeStorageTarget(documentRow.storage_bucket, documentRow.storage_path);

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(storageTarget.bucket)
    .createSignedUrl(storageTarget.path, SIGNED_URL_TTL_SECONDS, {
      download: safeDownloadName(documentRow.file_name),
    });

  if (signedError || !signed?.signedUrl) {
    if (isStorageMissingError(signedError)) {
      logSafe("storage_object_missing", signedErrorLogDetails(documentId, signedError, storageTarget.shape));
      return errorResponse(req, "storage_object_missing", "The uploaded file is missing from storage.", 404, {
        reason: "storage_object_missing",
        ...signedErrorDetails(signedError, storageTarget.shape),
      });
    }

    console.error(
      "[order-document-download-url] signed URL failed",
      signedErrorLogDetails(documentId, signedError, storageTarget.shape),
    );
    return errorResponse(req, "signed_url_failed", "The download could not be prepared.", 500, {
      reason: "signed_url_generation_failed",
      ...signedErrorDetails(signedError, storageTarget.shape),
    });
  }

  return jsonResponse(req, {
    ok: true,
    document: authorized,
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
});

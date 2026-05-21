import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("ORDER_DOCUMENT_SIGNED_URL_TTL_SECONDS") || "300");

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  document_id?: unknown;
};

type ErrorCode =
  | "unauthenticated"
  | "invalid_document_id"
  | "document_not_found"
  | "download_not_authorized"
  | "signed_url_failed";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json",
    },
  });
}

function errorResponse(code: ErrorCode, message: string, status: number) {
  return jsonResponse({ ok: false, code, message }, status);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("invalid_document_id", "Use POST with a valid document id.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse("unauthenticated", "Sign in before downloading order documents.", 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse("invalid_document_id", "A valid document id is required.", 400);
  }

  if (!isUuid(body.document_id)) {
    return errorResponse("invalid_document_id", "A valid document id is required.", 400);
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
    const status = /not found/i.test(authorizeError.message) ? 404 : 403;
    const code = status === 404 ? "document_not_found" : "download_not_authorized";
    return errorResponse(code, status === 404 ? "Document not found." : "You cannot download this document.", status);
  }

  const authorized = Array.isArray(authorizedRows) ? authorizedRows[0] : null;
  if (!authorized?.id) {
    return errorResponse("document_not_found", "Document not found.", 404);
  }

  const { data: documentRow, error: documentError } = await serviceClient
    .from("order_documents")
    .select("id, storage_bucket, storage_path, file_name, mime_type")
    .eq("id", documentId)
    .eq("status", "active")
    .maybeSingle();

  if (documentError) {
    console.error("[order-document-download-url] metadata lookup failed", documentError);
    return errorResponse("signed_url_failed", "The download could not be prepared.", 500);
  }

  if (!documentRow?.storage_bucket || !documentRow?.storage_path) {
    return errorResponse("document_not_found", "Document not found.", 404);
  }

  const { data: signed, error: signedError } = await serviceClient.storage
    .from(documentRow.storage_bucket)
    .createSignedUrl(documentRow.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: safeDownloadName(documentRow.file_name),
    });

  if (signedError || !signed?.signedUrl) {
    console.error("[order-document-download-url] signed URL failed", signedError);
    return errorResponse("signed_url_failed", "The download could not be prepared.", 500);
  }

  return jsonResponse({
    ok: true,
    document: authorized,
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
});

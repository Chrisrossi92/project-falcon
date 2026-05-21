import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const APP_ORIGIN =
  Deno.env.get("APP_ORIGIN") ??
  Deno.env.get("SITE_URL") ??
  Deno.env.get("PUBLIC_SITE_URL") ??
  Deno.env.get("APP_URL");

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

type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invitation_not_found"
  | "invitation_not_resendable"
  | "company_inactive"
  | "role_preset_invalid"
  | "auth_invite_failed"
  | "generic";

type RequestBody = {
  invitationId?: unknown;
  expiresInDays?: unknown;
  reason?: unknown;
  request_id?: unknown;
};

type PrepareRow = {
  invitation_id: string;
  prior_invitation_id: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  invite_email: string;
  invitation_status: string;
  expires_at: string;
  role_assignments: unknown;
};

type FinalizeRow = {
  invitation_id: string;
  company_id: string;
  invite_email: string;
  invitation_status: string;
  invited_user_id: string | null;
  membership_id: string | null;
  expires_at: string;
};

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
  return jsonResponse({ success: false, code, message }, status);
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

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function expiresInterval(value: unknown) {
  if (value === undefined || value === null) return "7 days";
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const days = Math.trunc(value);
  if (days < 1 || days > 30) return null;
  return `${days} days`;
}

function appAcceptUrl(invitationId: string) {
  if (!APP_ORIGIN) return undefined;
  try {
    const url = new URL(APP_ORIGIN);
    url.pathname = `/accept-invite/${invitationId}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function safeMessage(code: ErrorCode) {
  switch (code) {
    case "unauthorized":
      return "Sign in before resending company invitations.";
    case "forbidden":
      return "You do not have permission to resend this invitation.";
    case "invitation_not_found":
      return "The invitation could not be found.";
    case "invitation_not_resendable":
      return "This invitation cannot be resent.";
    case "company_inactive":
      return "The current company is not active.";
    case "role_preset_invalid":
      return "The invited role preset is no longer available.";
    case "auth_invite_failed":
      return "The authentication invite could not be sent.";
    default:
      return "The invitation could not be resent.";
  }
}

function mapPrepareError(message: string): ErrorCode {
  if (/app_user_not_found|current_company_membership_required|invite_permission_required|users_manage_company_access_required|owner_grant_permission_required/.test(message)) {
    return "forbidden";
  }
  if (/invitation_not_found/.test(message)) return "invitation_not_found";
  if (/invitation_not_resendable|member_already_active/.test(message)) return "invitation_not_resendable";
  if (/company_inactive|company_not_found/.test(message)) return "company_inactive";
  if (/role_preset_invalid/.test(message)) return "role_preset_invalid";
  return "generic";
}

async function finalizeAuthFailure(invitationId: string, requestId: string | null, authError: { message?: string }) {
  await serviceClient.rpc("rpc_company_member_invitation_resend_finalize", {
    p_invitation_id: invitationId,
    p_auth_invite_sent: false,
    p_auth_error: authError.message ?? "Auth invite failed",
    p_request_id: requestId,
    p_auth_user_id: null,
    p_auth_email: null,
    p_provider_metadata: {},
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("generic", "Use POST to resend a company invitation.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse("unauthorized", safeMessage("unauthorized"), 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse("generic", safeMessage("generic"), 400);
  }

  if (!isUuid(body.invitationId)) {
    return errorResponse("invitation_not_found", safeMessage("invitation_not_found"), 400);
  }

  const invitationId = body.invitationId.trim().toLowerCase();
  const expiresIn = expiresInterval(body.expiresInDays);
  if (!expiresIn) {
    return errorResponse("generic", safeMessage("generic"), 400);
  }

  const reason = optionalText(body.reason, 240);
  const requestId = optionalText(body.request_id, 120) ?? crypto.randomUUID();

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
  const caller = authData?.user ?? null;
  if (authError || !caller) {
    return errorResponse("unauthorized", safeMessage("unauthorized"), 401);
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

  const { data: prepareData, error: prepareError } = await callerClient.rpc(
    "rpc_company_member_invitation_resend_prepare",
    {
      p_invitation_id: invitationId,
      p_expires_in: expiresIn,
      p_reason: reason,
      p_request_id: requestId,
    },
  );

  if (prepareError) {
    console.error("[resend-company-member-invite] prepare failed", prepareError);
    const code = mapPrepareError(prepareError.message ?? "");
    return errorResponse(code, safeMessage(code), code === "generic" ? 500 : 403);
  }

  const prepared = Array.isArray(prepareData) ? prepareData[0] as PrepareRow | undefined : undefined;
  if (!prepared?.invitation_id) {
    return errorResponse("generic", safeMessage("generic"), 500);
  }

  const inviteMetadata = {
    invitation_id: prepared.invitation_id,
    company_id: prepared.company_id,
    company_slug: prepared.company_slug,
  };

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    prepared.invite_email,
    {
      redirectTo: appAcceptUrl(prepared.invitation_id),
      data: inviteMetadata,
    },
  );

  if (inviteError || !inviteData?.user?.id) {
    console.error("[resend-company-member-invite] auth invite failed", inviteError);
    try {
      await finalizeAuthFailure(prepared.invitation_id, requestId, {
        message: inviteError?.message,
      });
    } catch (finalizeError) {
      console.error("[resend-company-member-invite] auth failure finalize failed", finalizeError);
    }
    return errorResponse("auth_invite_failed", safeMessage("auth_invite_failed"), 500);
  }

  const { data: finalizeData, error: finalizeError } = await serviceClient.rpc(
    "rpc_company_member_invitation_resend_finalize",
    {
      p_invitation_id: prepared.invitation_id,
      p_auth_invite_sent: true,
      p_auth_error: null,
      p_request_id: requestId,
      p_auth_user_id: inviteData.user.id,
      p_auth_email: inviteData.user.email ?? prepared.invite_email,
      p_provider_metadata: {},
    },
  );

  if (finalizeError) {
    console.error("[resend-company-member-invite] finalize failed", finalizeError);
    return errorResponse("generic", safeMessage("generic"), 500);
  }

  const finalized = Array.isArray(finalizeData) ? finalizeData[0] as FinalizeRow | undefined : undefined;
  if (!finalized?.invitation_id) {
    return errorResponse("generic", safeMessage("generic"), 500);
  }

  return jsonResponse({
    success: true,
    invitationId: finalized.invitation_id,
    status: finalized.invitation_status,
  });
});

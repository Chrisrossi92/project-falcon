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
  | "unauthenticated"
  | "invalid_email"
  | "invalid_role_ids"
  | "app_user_not_found"
  | "current_company_membership_required"
  | "company_not_found"
  | "company_inactive"
  | "invite_permission_required"
  | "role_assign_permission_required"
  | "owner_grant_permission_required"
  | "member_already_active"
  | "member_exists_inactive"
  | "invite_already_pending"
  | "invite_prepare_failed"
  | "auth_invite_failed"
  | "invite_finalize_failed";

type RequestBody = {
  email?: unknown;
  role_ids?: unknown;
  primary_role_id?: unknown;
  reason?: unknown;
  request_id?: unknown;
  redirect_to?: unknown;
};

type PrepareRow = {
  invitation_id: string;
  company_id: string;
  company_slug: string;
  company_name: string;
  invite_email: string;
  invitation_status: string;
  expires_at: string;
  role_assignments: unknown;
  requires_auth_invite: boolean;
  existing_app_user_id: string | null;
  existing_auth_id: string | null;
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

function optionalUuid(value: unknown) {
  return isUuid(value) ? value.trim().toLowerCase() : null;
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)) return null;
  return trimmed;
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

function roleIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = value.map((item) => (isUuid(item) ? item.trim().toLowerCase() : null));
  if (ids.some((id) => !id)) return null;
  return ids as string[];
}

function mapPrepareError(message: string): ErrorCode {
  if (/app_user_not_found/.test(message)) return "app_user_not_found";
  if (/current_company_membership_required/.test(message)) {
    return "current_company_membership_required";
  }
  if (/company_not_found/.test(message)) return "company_not_found";
  if (/company_inactive/.test(message)) return "company_inactive";
  if (/invalid_email/.test(message)) return "invalid_email";
  if (/invalid_role_ids|duplicate_role_ids|unknown_role_id|role_preset_required|primary_role/.test(message)) {
    return "invalid_role_ids";
  }
  if (/invite_permission_required|users_manage_company_access_required/.test(message)) {
    return "invite_permission_required";
  }
  if (/role_assign_permission_required/.test(message)) return "role_assign_permission_required";
  if (/owner_grant_permission_required/.test(message)) return "owner_grant_permission_required";
  if (/member_already_active/.test(message)) return "member_already_active";
  if (/member_exists_inactive/.test(message)) return "member_exists_inactive";
  if (/invite_already_pending/.test(message)) return "invite_already_pending";
  return "invite_prepare_failed";
}

function safeMessage(code: ErrorCode) {
  switch (code) {
    case "unauthenticated":
      return "Sign in before inviting company members.";
    case "invalid_email":
      return "Enter a valid email address.";
    case "invalid_role_ids":
      return "Choose valid role presets for this invitation.";
    case "app_user_not_found":
      return "Your Falcon user profile could not be resolved.";
    case "current_company_membership_required":
      return "Your current company access is not active.";
    case "company_not_found":
      return "The current company could not be found.";
    case "company_inactive":
      return "The current company is not active.";
    case "invite_permission_required":
      return "You do not have permission to invite company members.";
    case "role_assign_permission_required":
      return "You do not have permission to assign roles.";
    case "owner_grant_permission_required":
      return "You do not have permission to grant Owner access.";
    case "member_already_active":
      return "That person is already an active member of this company.";
    case "member_exists_inactive":
      return "That person already has inactive company access. Reactivate them instead.";
    case "invite_already_pending":
      return "An invitation is already pending for that email address.";
    case "auth_invite_failed":
      return "The authentication invite could not be sent.";
    case "invite_finalize_failed":
      return "The invitation could not be finalized.";
    default:
      return "The invitation could not be prepared.";
  }
}

async function finalizeAuthFailure(
  invitationId: string,
  email: string,
  authError: { code?: string; message?: string },
) {
  await serviceClient.rpc("rpc_company_member_invite_finalize", {
    p_invitation_id: invitationId,
    p_auth_user_id: null,
    p_auth_email: email,
    p_auth_invite_sent: false,
    p_auth_error_code: authError.code ?? "auth_invite_failed",
    p_auth_error_message: authError.message ?? "Auth invite failed",
    p_provider_metadata: {},
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("invalid_email", "Use POST with an invite email address.", 405);
  }

  const token = bearerToken(req);
  if (!token) {
    return errorResponse("unauthenticated", safeMessage("unauthenticated"), 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse("invalid_email", safeMessage("invalid_email"), 400);
  }

  const email = normalizedEmail(body.email);
  if (!email) {
    return errorResponse("invalid_email", safeMessage("invalid_email"), 400);
  }

  const ids = roleIds(body.role_ids);
  if (!ids) {
    return errorResponse("invalid_role_ids", safeMessage("invalid_role_ids"), 400);
  }

  const primaryRoleId = optionalUuid(body.primary_role_id);
  const reason = optionalText(body.reason, 240);
  const requestId = optionalText(body.request_id, 120);
  const redirectTo = optionalText(body.redirect_to, 500);

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
  const caller = authData?.user ?? null;
  if (authError || !caller) {
    return errorResponse("unauthenticated", safeMessage("unauthenticated"), 401);
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
    "rpc_company_member_invite_prepare",
    {
      p_email: email,
      p_role_ids: ids,
      p_primary_role_id: primaryRoleId,
      p_reason: reason,
      p_request_id: requestId,
    },
  );

  if (prepareError) {
    console.error("[invite-company-member] prepare failed", prepareError);
    const code = mapPrepareError(prepareError.message ?? "");
    return errorResponse(code, safeMessage(code), code === "invite_prepare_failed" ? 500 : 403);
  }

  const prepared = Array.isArray(prepareData) ? prepareData[0] as PrepareRow | undefined : undefined;
  if (!prepared?.invitation_id) {
    return errorResponse("invite_prepare_failed", safeMessage("invite_prepare_failed"), 500);
  }

  const inviteMetadata = {
    invitation_id: prepared.invitation_id,
    company_id: prepared.company_id,
    company_slug: prepared.company_slug,
  };

  let invitedAuthId = prepared.existing_auth_id ?? null;
  let authInviteSent = false;

  const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: redirectTo ?? appAcceptUrl(prepared.invitation_id),
      data: inviteMetadata,
    },
  );

  if (inviteError || !inviteData?.user?.id) {
    console.error("[invite-company-member] auth invite failed", inviteError);
    try {
      await finalizeAuthFailure(prepared.invitation_id, email, {
        code: inviteError?.code,
        message: inviteError?.message,
      });
    } catch (finalizeError) {
      console.error("[invite-company-member] auth failure finalize failed", finalizeError);
    }
    return errorResponse("auth_invite_failed", safeMessage("auth_invite_failed"), 500);
  }

  invitedAuthId = inviteData.user.id;
  authInviteSent = true;

  const { data: finalizeData, error: finalizeError } = await serviceClient.rpc(
    "rpc_company_member_invite_finalize",
    {
      p_invitation_id: prepared.invitation_id,
      p_auth_user_id: invitedAuthId,
      p_auth_email: email,
      p_auth_invite_sent: authInviteSent,
      p_auth_error_code: null,
      p_auth_error_message: null,
      p_provider_metadata: {},
    },
  );

  if (finalizeError) {
    console.error("[invite-company-member] finalize failed", finalizeError);
    return errorResponse("invite_finalize_failed", safeMessage("invite_finalize_failed"), 500);
  }

  const finalized = Array.isArray(finalizeData) ? finalizeData[0] as FinalizeRow | undefined : undefined;
  if (!finalized?.invitation_id) {
    return errorResponse("invite_finalize_failed", safeMessage("invite_finalize_failed"), 500);
  }

  return jsonResponse({
    ok: true,
    invitation_id: prepared.invitation_id,
    company_id: prepared.company_id,
    company_slug: prepared.company_slug,
    company_name: prepared.company_name,
    invite_email: finalized.invite_email,
    invitation_status: finalized.invitation_status,
    expires_at: finalized.expires_at,
    auth_invite_sent: authInviteSent,
  });
});

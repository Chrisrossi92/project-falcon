import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";

import supabase from "@/lib/supabaseClient";
import { acceptCompanyInvite } from "./api";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `invite-accept-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error) {
  const message = String(error?.message || error?.details || error || "");

  if (/invitation_expired/.test(message)) {
    return "This invitation has expired. Ask an admin to send a new one.";
  }
  if (/invitation_identity_mismatch|invitation_user_mismatch|invitation_membership_mismatch/.test(message)) {
    return "This invitation is for a different signed-in account.";
  }
  if (/company_inactive/.test(message)) {
    return "This company is not active.";
  }
  if (/role_preset_invalid/.test(message)) {
    return "The invited role preset is no longer available. Ask an admin to resend the invite.";
  }
  if (/invitation_not_sent|invitation_not_found/.test(message)) {
    return "This invitation is no longer available.";
  }

  return "Falcon could not accept this invitation.";
}

function StateCard({ title, message, tone = "neutral", action }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tones[tone] || tones.neutral}`}>
      <div className="text-base font-semibold">{title}</div>
      {message && <p className="mt-2 text-sm leading-6">{message}</p>}
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

function Button({ children, onClick, variant = "primary" }) {
  const classes = {
    primary: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-semibold ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

export default function AcceptCompanyInvitePage() {
  const { invitationId } = useParams();
  const navigate = useNavigate();
  const { session, isLoading } = useSessionContext();
  const [state, setState] = useState({
    status: "idle",
    title: "",
    message: "",
    tone: "neutral",
    accepted: null,
  });
  const requestIdRef = useRef(null);
  const attemptedRef = useRef(false);
  const mountedRef = useRef(true);

  const normalizedInvitationId = useMemo(() => String(invitationId || "").trim(), [invitationId]);
  const validInvitationId = isValidUuid(normalizedInvitationId);
  const returnPath = `/accept-invite/${normalizedInvitationId}`;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !session?.user && validInvitationId) {
      navigate(`/login?returnTo=${encodeURIComponent(returnPath)}`, { replace: true });
    }
  }, [isLoading, navigate, returnPath, session?.user, validInvitationId]);

  const switchCompany = useCallback(async (accepted, requestId) => {
    setState({
      status: "switching",
      title: "Switching company context…",
      message: "Falcon is updating your active company.",
      tone: "neutral",
      accepted,
    });

    const { data, error } = await supabase.functions.invoke("set-active-company", {
      body: {
        company_id: accepted.company_id,
        reason: "invite_acceptance",
        request_id: requestId,
      },
    });

    if (error || data?.ok === false) {
      throw error || new Error(data?.code || "set_active_company_failed");
    }

    if (data?.session_refresh_required) {
      await supabase.auth.refreshSession();
    }
  }, []);

  const finishSuccess = useCallback((accepted) => {
    setState({
      status: "success",
      title: "Invitation accepted.",
      message: "Your company access is active.",
      tone: "success",
      accepted,
    });
    window.setTimeout(() => {
      if (mountedRef.current) navigate("/dashboard", { replace: true });
    }, 500);
  }, [navigate]);

  const runAcceptance = useCallback(async ({ freshRequestId = false } = {}) => {
    if (!validInvitationId) {
      setState({
        status: "error",
        title: "This invitation is no longer available.",
        message: "",
        tone: "error",
        accepted: null,
      });
      return;
    }

    if (!session?.user) {
      setState({
        status: "signed_out",
        title: "Sign in to accept your Falcon company invitation.",
        message: "",
        tone: "neutral",
        accepted: null,
      });
      return;
    }

    if (freshRequestId || !requestIdRef.current) {
      requestIdRef.current = newRequestId();
    }

    const requestId = requestIdRef.current;
    setState({
      status: "accepting",
      title: "Accepting invitation…",
      message: "Falcon is activating your company access.",
      tone: "neutral",
      accepted: null,
    });

    try {
      const accepted = await acceptCompanyInvite(normalizedInvitationId, requestId);
      if (!accepted?.company_id) {
        throw new Error("invite_acceptance_empty_response");
      }

      if (accepted.session_refresh_required) {
        await supabase.auth.refreshSession();
      }

      if (accepted.active_company_context_valid === false) {
        try {
          await switchCompany(accepted, requestId);
        } catch {
          setState({
            status: "switch_failed",
            title: "Invitation accepted, but Falcon could not switch to that company.",
            message: "You can continue from your dashboard or try switching again.",
            tone: "warning",
            accepted,
          });
          return;
        }
      }

      finishSuccess(accepted);
    } catch (error) {
      setState({
        status: "error",
        title: errorMessage(error),
        message: "",
        tone: "error",
        accepted: null,
      });
    }
  }, [finishSuccess, normalizedInvitationId, session?.user, switchCompany, validInvitationId]);

  useEffect(() => {
    if (isLoading || attemptedRef.current) return;

    if (!validInvitationId) {
      attemptedRef.current = true;
      setState({
        status: "error",
        title: "This invitation is no longer available.",
        message: "",
        tone: "error",
        accepted: null,
      });
      return;
    }

    if (!session?.user) {
      setState({
        status: "signed_out",
        title: "Sign in to accept your Falcon company invitation.",
        message: "",
        tone: "neutral",
        accepted: null,
      });
      return;
    }

    attemptedRef.current = true;
    runAcceptance();
  }, [isLoading, runAcceptance, session?.user, validInvitationId]);

  const retryAcceptance = () => {
    attemptedRef.current = true;
    runAcceptance({ freshRequestId: true });
  };

  const retrySwitch = async () => {
    if (!state.accepted?.company_id) return;
    try {
      const requestId = newRequestId();
      await switchCompany(state.accepted, requestId);
      finishSuccess(state.accepted);
    } catch {
      setState((current) => ({
        ...current,
        status: "switch_failed",
        title: "Invitation accepted, but Falcon could not switch to that company.",
        message: "You can continue from your dashboard or try switching again.",
        tone: "warning",
      }));
    }
  };

  const action = (() => {
    if (state.status === "error") {
      return (
        <>
          <Button onClick={retryAcceptance}>Try Again</Button>
          <Link className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard">
            Go to Dashboard
          </Link>
        </>
      );
    }
    if (state.status === "switch_failed") {
      return (
        <>
          <Button onClick={retrySwitch}>Try Switching Again</Button>
          <Link className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" to="/dashboard">
            Continue to Dashboard
          </Link>
        </>
      );
    }
    return null;
  })();

  const displayState = isLoading
    ? {
        title: "Checking your session…",
        message: "Falcon is preparing your invitation.",
        tone: "neutral",
      }
    : state.status === "idle"
      ? {
          title: "Accepting invitation…",
          message: "Falcon is preparing your invitation.",
          tone: "neutral",
        }
      : state;

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/images/falcon-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-white/65" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <img
            src="/assets/logo.png"
            alt="Continental Real Estate Solutions"
            className="h-10 w-auto"
            draggable="false"
          />
        </div>
        <StateCard
          title={displayState.title}
          message={displayState.message}
          tone={displayState.tone}
          action={action}
        />
      </div>
    </div>
  );
}

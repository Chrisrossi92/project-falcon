import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";

import {
  acceptClientPortalInvitation,
  readClientPortalInvitation,
} from "@/features/clientPortal/api";

function invitationStatusCopy(status) {
  switch (status) {
    case "expired":
      return {
        title: "This invitation has expired.",
        message: "Ask your lending team contact to send a new Client Portal invitation.",
        tone: "warning",
      };
    case "revoked":
      return {
        title: "This invitation is no longer active.",
        message: "Ask your lending team contact to confirm your Client Portal access.",
        tone: "warning",
      };
    case "accepted":
      return {
        title: "This invitation has already been accepted.",
        message: "You can continue to the Client Portal with your existing access.",
        tone: "success",
      };
    default:
      return null;
  }
}

function errorMessage(error) {
  const message = String(error?.message || error?.details || error || "");

  if (/email_mismatch/i.test(message)) {
    return "Sign in with the invited email address to accept this invitation.";
  }
  if (/authentication_required/i.test(message)) {
    return "Sign in or create an account to accept this invitation.";
  }
  if (/invalid_or_expired|not_found/i.test(message)) {
    return "This invitation is unavailable or has expired.";
  }

  return "The invitation could not be accepted.";
}

function StatePanel({ title, message, tone = "neutral", children }) {
  const tones = {
    neutral: "border-slate-200 bg-white text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <section className={`rounded-lg border p-5 shadow-sm ${tones[tone] || tones.neutral}`}>
      <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
      {message && <p className="mt-2 text-sm leading-6">{message}</p>}
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default function ClientPortalInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useSessionContext();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const safeToken = useMemo(() => String(token || "").trim(), [token]);
  const returnPath = `/client-portal/invitations/${encodeURIComponent(safeToken)}`;

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setStatus("loading");
      setError("");

      try {
        const row = await readClientPortalInvitation(safeToken);
        if (cancelled) return;
        setInvite(row);
        setStatus(row ? "ready" : "unavailable");
      } catch (loadError) {
        if (cancelled) return;
        setStatus("unavailable");
        setError(errorMessage(loadError));
      }
    }

    loadInvite();

    return () => {
      cancelled = true;
    };
  }, [safeToken]);

  const acceptInvite = useCallback(async () => {
    setStatus("accepting");
    setError("");

    try {
      await acceptClientPortalInvitation(safeToken);
      navigate("/client-portal", { replace: true });
    } catch (acceptError) {
      setStatus("ready");
      setError(errorMessage(acceptError));
    }
  }, [navigate, safeToken]);

  const signInPath = `/login?returnTo=${encodeURIComponent(returnPath)}`;
  const statusCopy = invitationStatusCopy(invite?.status);
  const canAccept = invite?.status === "pending";
  const signedIn = Boolean(session?.user);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Client Portal</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Accept your invitation</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Continue with secure access to request appraisals, track progress, and download final reports.
          </p>
        </div>

        {status === "loading" || authLoading ? (
          <StatePanel
            title="Checking invitation..."
            message="We are confirming that this invitation is still active."
          />
        ) : status === "unavailable" ? (
          <StatePanel
            title="Invitation unavailable"
            message={error || "This invitation could not be found or is no longer active."}
            tone="error"
          />
        ) : statusCopy ? (
          <StatePanel title={statusCopy.title} message={statusCopy.message} tone={statusCopy.tone}>
            {signedIn ? (
              <Link
                to="/client-portal"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to Client Portal
              </Link>
            ) : (
              <Link
                to="/login?returnTo=%2Fclient-portal"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Sign in to continue
              </Link>
            )}
          </StatePanel>
        ) : (
          <StatePanel
            title={status === "accepting" ? "Activating access..." : `You're invited by ${invite?.companyName || "your appraisal team"}`}
            message="This invitation gives you limited Client Portal access for the client relationship below."
          >
            <dl className="rounded-md border border-slate-200 bg-white px-4">
              <DetailRow label="Client" value={invite?.clientName} />
              <DetailRow label="Company" value={invite?.companyName} />
              <DetailRow label="Invited email" value={invite?.email} />
              <DetailRow label="Contact" value={invite?.contactName} />
              <DetailRow label="Expires" value={invite?.expiresAt} />
            </dl>

            {error && (
              <div role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {signedIn ? (
                <button
                  type="button"
                  onClick={acceptInvite}
                  disabled={!canAccept || status === "accepting"}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {status === "accepting" ? "Activating..." : "Accept invitation"}
                </button>
              ) : (
                <Link
                  to={signInPath}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Sign in or create account
                </Link>
              )}
            </div>
          </StatePanel>
        )}
      </div>
    </main>
  );
}

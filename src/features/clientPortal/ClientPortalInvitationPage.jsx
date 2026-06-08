import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSessionContext } from "@supabase/auth-helpers-react";

import {
  acceptClientPortalInvitation,
  readClientPortalInvitation,
} from "@/features/clientPortal/api";
import supabase from "@/lib/supabaseClient";

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
  const [authMode, setAuthMode] = useState("create");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const attemptedAcceptRef = useRef(false);

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

  const statusCopy = invitationStatusCopy(invite?.status);
  const canAccept = invite?.status === "pending";
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (!signedIn || !canAccept || status !== "ready" || attemptedAcceptRef.current) return;
    attemptedAcceptRef.current = true;
    acceptInvite();
  }, [acceptInvite, canAccept, signedIn, status]);

  const submitInviteAuth = useCallback(async (event) => {
    event.preventDefault();

    if (!invite?.email) {
      setError("This invitation is missing an email address.");
      return;
    }
    if (!password) {
      setError("Enter a password to continue.");
      return;
    }
    if (authMode === "create" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus(authMode === "create" ? "creating_account" : "signing_in");
    setError("");

    try {
      const result = authMode === "create"
        ? await supabase.auth.signUp({
            email: invite.email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}${returnPath}`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: invite.email,
            password,
          });

      if (result?.error) throw result.error;

      attemptedAcceptRef.current = true;
      await acceptClientPortalInvitation(safeToken);
      navigate("/client-portal", { replace: true });
    } catch (authError) {
      setStatus("ready");
      setError(errorMessage(authError));
    }
  }, [authMode, confirmPassword, invite?.email, navigate, password, returnPath, safeToken]);

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
                <p className="text-sm text-slate-600">
                  {status === "accepting" ? "Activating your Client Portal access..." : "You are signed in. Activating your access..."}
                </p>
              ) : (
                <form className="w-full space-y-4" onSubmit={submitInviteAuth} aria-label="client portal invite account form">
                  <div className="flex rounded-md border border-slate-200 bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("create")}
                      className={`h-9 flex-1 rounded px-3 text-sm font-semibold ${authMode === "create" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode("sign_in")}
                      className={`h-9 flex-1 rounded px-3 text-sm font-semibold ${authMode === "sign_in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                    >
                      Sign in
                    </button>
                  </div>

                  <label className="block text-sm font-medium text-slate-700">
                    Email
                    <input
                      type="email"
                      value={invite?.email || ""}
                      readOnly
                      className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={authMode === "create" ? "new-password" : "current-password"}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>

                  {authMode === "create" && (
                    <label className="block text-sm font-medium text-slate-700">
                      Confirm password
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={status === "creating_account" || status === "signing_in"}
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-slate-950 bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {status === "creating_account"
                      ? "Creating account..."
                      : status === "signing_in"
                        ? "Signing in..."
                        : authMode === "create"
                          ? "Create account and continue"
                          : "Sign in and continue"}
                  </button>
                </form>
              )}
            </div>
          </StatePanel>
        )}
      </div>
    </main>
  );
}

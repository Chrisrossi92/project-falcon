// src/pages/Login.jsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "@/lib/supabaseClient";
import { useSessionContext } from "@supabase/auth-helpers-react";
import falconWordmark from "@/assets/branding/falcon-wordmark-dark-shell.png";

function safeReturnPath(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return trimmed;
}

export default function Login() {
  const { session } = useSessionContext();
  const nav = useNavigate();
  const location = useLocation();
  const returnTo =
    safeReturnPath(location.state?.returnTo) ||
    safeReturnPath(new URLSearchParams(location.search).get("returnTo")) ||
    "/";

  // If already signed in, go to the requested internal return path.
  useEffect(() => {
    if (session?.user) nav(returnTo, { replace: true });
  }, [session, nav, returnTo]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(51,65,85,0.46),transparent_34%),radial-gradient(circle_at_85%_82%,rgba(15,23,42,0.62),transparent_38%),linear-gradient(145deg,#020617_0%,#0f172a_48%,#1e293b_100%)] px-4 py-10">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,6,23,0.16)_58%,rgba(2,6,23,0.58)_100%)]" aria-hidden="true" />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-7">
        <img
          src={falconWordmark}
          alt="Falcon"
          className="h-12 w-56 object-cover object-center opacity-95 sm:h-14 sm:w-72"
          draggable="false"
        />
      </div>

      {/* card */}
      <div className="relative z-10 w-full max-w-md pt-16 sm:pt-10">
        <div className="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-[0_28px_90px_rgba(2,6,23,0.44)] ring-1 ring-slate-950/5 backdrop-blur sm:p-8">
          {/* brand */}
          <div className="mb-5 flex items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <img
              src="/assets/logo.png"
              alt="Continental Real Estate Solutions"
              className="h-10 w-auto"
              draggable="false"
            />
          </div>

          <h1 className="text-center text-xl font-semibold text-gray-900">
            Sign in to Falcon
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Continue to your workspace
          </p>

          {/* Supabase Auth UI */}
          <Auth
            supabaseClient={supabase}
            view="sign_in"
            providers={[]}
            socialLayout="horizontal"
            onlyThirdPartyProviders={false}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: { borderRadius: "10px" },
                input: { borderRadius: "10px" },
                anchor: { color: "#111827" }, // gray-900
              },
              variables: {
                default: {
                  colors: {
                    brand: "#111827", // pill/color accents
                    brandAccent: "#111827",
                    inputText: "#111827",
                  },
                  radii: {
                    borderRadiusButton: "10px",
                    inputBorderRadius: "10px",
                  },
                },
              },
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Email",
                  password_label: "Password",
                  button_label: "Sign in",
                },
              },
            }}
            className="space-y-4"
          />

          {/* tiny footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            By continuing you agree to our acceptable use and privacy guidelines.
          </div>
        </div>

        {/* footer link (optional) */}
        <div className="mt-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Continental Real Estate Solutions
        </div>
      </div>
    </div>
  );
}


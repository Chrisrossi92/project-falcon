// src/pages/Login.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import supabase from "@/lib/supabaseClient";
import { useSessionContext } from "@supabase/auth-helpers-react";

export default function Login() {
  const { session } = useSessionContext();
  const nav = useNavigate();

  // If already signed in, go to dashboard
  useEffect(() => {
    if (session?.user) nav("/dashboard", { replace: true });
  }, [session, nav]);

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center"
      style={{
        backgroundImage: "url('/images/falcon-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* subtle white veil */}
      <div className="absolute inset-0 bg-white/55" />

      {/* card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {/* brand */}
          <div className="flex items-center justify-center mb-5">
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
          <p className="text-center text-sm text-gray-500 mb-6">
            Use your work email to continue
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
        <div className="mt-3 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Continental Real Estate Solutions
        </div>
      </div>
    </div>
  );
}






// src/pages/auth/Login.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import { useSession } from "@/lib/hooks/useSession";

export default function LoginPage() {
  const { user, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const loc = useLocation();
  const redirectTo = loc.state?.from?.pathname || "/dashboard";

  // If already logged in, bounce away from /login once session resolves
  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [loading, user, redirectTo, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) throw new Error("Login succeeded but no session found.");
      navigate(redirectTo, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white border rounded-xl p-5 space-y-3">
        <h1 className="text-lg font-semibold">Sign in</h1>

        <label className="block text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            className="mt-1 w-full border rounded px-3 py-2"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded px-3 py-2 text-white ${
            submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}





// src/lib/bootstrap/ensureUserProfile.js
import supabase from "@/lib/supabaseClient";
import { meUpsert } from "@/lib/services/usersService";

/**
 * Attach a best-effort listener that ensures the current user
 * has a row in public.users. It runs on app start and whenever
 * auth state changes. Throttled to avoid spamming the RPC.
 */
export function attachUserProfileBootstrap({ ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  // Initial run for already-signed-in sessions
  supabase.auth.getUser().then(({ data }) => {
    const u = data?.user;
    if (u) safeUpsert(u, ttlMs);
  });

  // Listen for sign-in / token refresh / profile updates
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    if (!u) return;
    if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
      safeUpsert(u, ttlMs);
    }
  });

  // detach fn
  return () => {
    try { sub?.subscription?.unsubscribe?.(); } catch {}
  };
}

async function safeUpsert(user, ttlMs) {
  try {
    const email = user?.email || "";
    const key = `meUpsert:v1:${user.id}:${email.toLowerCase()}`;
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < ttlMs) return; // throttle

    const meta = user?.user_metadata || {};
    const profile = {
      full_name: meta.full_name || email || null,
      display_name: meta.display_name || meta.full_name || email || null,
      name: meta.name || meta.full_name || null, // supported by rpc if your table has "name"
    };

    await meUpsert(profile);          // writes/merges into public.users via RPC
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // best-effort — ignore failures so app continues
  }
}

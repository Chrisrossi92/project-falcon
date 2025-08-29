// src/lib/hooks/useSession.js
import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Framework-agnostic session hook (no React helper context needed).
 * Works even if a provider is missing/mis-ordered.
 */
function useSessionHook() {
  const [user, setUser] = useState(undefined);     // undefined => loading
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Prime from current session
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const s = data?.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Realtime auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      const s = newSession ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  return {
    user: user ?? null,
    session: session ?? null,
    isAuthenticated: !!user,
    isLoading: !!loading,
  };
}

export default useSessionHook;
export const useSession = useSessionHook;










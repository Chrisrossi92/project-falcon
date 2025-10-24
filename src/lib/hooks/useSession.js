import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

function useSessionHook() {
  const [session, setSession] = useState(undefined); // undefined => still initializing
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, next) => {
      if (!mounted) return;
      setSession(next ?? null);
      setUser(next?.user ?? null);
    });

    init();
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { session, user, userId: user?.id ?? null, isLoading: session === undefined };
}

// allow both import styles
export function useSession() { return useSessionHook(); }
export default useSessionHook;








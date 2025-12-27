// src/lib/hooks/useCurrentUser.js
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Returns the current application user (row from public.users) based on auth.uid.
 */
export function useCurrentUser() {
  const [user, setUser] = useState(null);   // row from public.users
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: auth, error: authError } = await supabase.auth.getUser();

      if (authError) {
        if (!cancelled) {
          setError(authError);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const authId = auth?.user?.id;
      if (!authId) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const { data, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .or(`auth_id.eq.${authId},uid.eq.${authId}`)
        .maybeSingle();

      if (cancelled) return;

      if (userError) {
        setError(userError);
        setUser(null);
      } else {
        setError(null);
        setUser(data || null);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error };
}

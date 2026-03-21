import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Returns { usersId, displayName, loading }
 *  - usersId     = public.users.id
 *  - displayName = users.display_name -> users.full_name -> users.name -> email local-part
 */
export default function useCurrentUserIds() {
  const [state, setState] = useState({ usersId: null, displayName: "", loading: true });

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const authId = auth?.user?.id;
        if (!authId) { if (ok) setState({ usersId: null, displayName: "", loading: false }); return; }

        // map auth.uid() -> public.users row via users.auth_id
        const { data: u, error: e1 } = await supabase
          .from("users")
          .select("id, display_name, full_name, name, email, auth_id")
          .eq("auth_id", authId)
          .maybeSingle();
        if (e1) throw e1;

        const displayName =
          u?.display_name ||
          u?.full_name ||
          u?.name ||
          (u?.email ? u.email.split("@")[0] : "");

        if (ok) setState({ usersId: u?.id || null, displayName: displayName || "", loading: false });
      } catch {
        if (ok) setState({ usersId: null, displayName: "", loading: false });
      }
    })();
    return () => { ok = false; };
  }, []);

  return state;
}

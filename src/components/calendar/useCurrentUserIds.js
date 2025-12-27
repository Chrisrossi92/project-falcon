import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Returns { usersId, displayName, loading }
 *  - usersId     = public.users.id
 *  - displayName = user_profiles.display_name -> users.name -> email local-part
 */
export default function useCurrentUserIds() {
  const [state, setState] = useState({ usersId: null, displayName: "", loading: true });

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { if (ok) setState({ usersId: null, displayName: "", loading: false }); return; }

        // map auth.uid() -> public.users row
        const { data: u, error: e1 } = await supabase
          .from("profiles")
          .select("id, name, email, auth_id")
          .eq("auth_id", uid)
          .maybeSingle();
        if (e1) throw e1;

        let displayName = "";
        if (u?.auth_id) {
          const { data: p } = await supabase
            .from("user_profiles")
            .select("display_name")
            .eq("user_id", u.auth_id)
            .maybeSingle();
          displayName = p?.display_name || u?.name || (u?.email ? u.email.split("@")[0] : "");
        }

        if (ok) setState({ usersId: u?.id || null, displayName: displayName || "", loading: false });
      } catch {
        if (ok) setState({ usersId: null, displayName: "", loading: false });
      }
    })();
    return () => { ok = false; };
  }, []);

  return state;
}

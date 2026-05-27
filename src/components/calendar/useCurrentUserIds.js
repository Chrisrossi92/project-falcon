import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { getCurrentUserAppContext } from "@/features/auth/currentUserAppContextApi";

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

        const context = await getCurrentUserAppContext();
        const displayName =
          context?.display_name ||
          context?.full_name ||
          (context?.email ? context.email.split("@")[0] : "");

        if (ok) setState({ usersId: context?.user_id || null, displayName: displayName || "", loading: false });
      } catch {
        if (ok) setState({ usersId: null, displayName: "", loading: false });
      }
    })();
    return () => { ok = false; };
  }, []);

  return state;
}

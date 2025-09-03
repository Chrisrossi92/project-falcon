import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Returns the user's nice display name:
 *  user_profiles.display_name -> users.name -> email local-part
 */
export default function useCurrentUserName() {
  const [name, setName] = useState("");

  useEffect(() => {
    let ok = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { if (ok) setName(""); return; }

      const { data: u } = await supabase
        .from("users")
        .select("name, email, auth_id")
        .eq("auth_id", uid)
        .maybeSingle();

      let nice = "";
      if (u?.auth_id) {
        const { data: p } = await supabase
          .from("user_profiles")
          .select("display_name")
          .eq("user_id", u.auth_id)
          .maybeSingle();
        nice = p?.display_name || u?.name || (u?.email ? u.email.split("@")[0] : "");
      }
      if (ok) setName(nice || "");
    })();
    return () => { ok = false; };
  }, []);

  return name;
}

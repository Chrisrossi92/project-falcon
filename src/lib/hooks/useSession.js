import {
  useUser as useSupabaseUser,
  useSession as useSupabaseSession,
} from "@supabase/auth-helpers-react";

/** Normalized session hook for Falcon */
function useSessionHook() {
  // NOTE: these hooks return the value directly (User | null), not { user } / { session }
  const user = useSupabaseUser() ?? null;
  const session = useSupabaseSession() ?? null;

  // When the provider hasn't mounted yet these can be undefined; normalize:
  const isLoading = user === undefined || session === undefined;

  return {
    user: user ?? null,
    session: session ?? null,
    isAuthenticated: !!user,
    isLoading,
  };
}

export default useSessionHook;       // allow: import useSession from "@/lib/hooks/useSession"
export const useSession = useSessionHook; // allow: import { useSession } from "@/lib/hooks/useSession"




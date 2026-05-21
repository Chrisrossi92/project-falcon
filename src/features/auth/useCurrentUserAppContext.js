import { useCallback, useEffect, useState } from "react";
import useSession from "@/lib/hooks/useSession";
import { getCurrentUserAppContext } from "@/features/auth/currentUserAppContextApi";

export function useCurrentUserAppContext() {
  const { userId: authUserId, isLoading: sessionLoading } = useSession();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (sessionLoading) return null;

    if (!authUserId) {
      setContext(null);
      setError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextContext = await getCurrentUserAppContext();
      setContext(nextContext);
      setLoading(false);
      return nextContext;
    } catch (err) {
      setContext(null);
      setError(err);
      setLoading(false);
      return null;
    }
  }, [authUserId, sessionLoading]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) return;
      if (sessionLoading) return;

      if (!authUserId) {
        setContext(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextContext = await getCurrentUserAppContext();
        if (!active) return;
        setContext(nextContext);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setContext(null);
        setError(err);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [authUserId, sessionLoading]);

  return {
    context,
    data: context,
    loading: loading || sessionLoading,
    error,
    refetch,
  };
}

export default useCurrentUserAppContext;

import { useCallback, useEffect, useState } from "react";

import useSession from "@/lib/hooks/useSession";
import {
  getCompanySetupContext,
  isCompanySetupPermissionDeniedError,
} from "@/features/company-setup/companySetupContextApi";

export function useCompanySetupContext() {
  const { userId: authUserId, isLoading: sessionLoading } = useSession();
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const refetch = useCallback(async () => {
    if (sessionLoading) return null;

    if (!authUserId) {
      setContext(null);
      setError(null);
      setPermissionDenied(false);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    try {
      const nextContext = await getCompanySetupContext();
      setContext(nextContext);
      setLoading(false);
      return nextContext;
    } catch (err) {
      setContext(null);
      setError(err);
      setPermissionDenied(isCompanySetupPermissionDeniedError(err));
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
        setPermissionDenied(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      try {
        const nextContext = await getCompanySetupContext();
        if (!active) return;
        setContext(nextContext);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setContext(null);
        setError(err);
        setPermissionDenied(isCompanySetupPermissionDeniedError(err));
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
    permissionDenied,
    refetch,
  };
}

export default useCompanySetupContext;

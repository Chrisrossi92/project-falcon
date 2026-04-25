import { useCallback, useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import useSession from "@/lib/hooks/useSession";

function normalizePermissionKeys(keys) {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys.map((key) => String(key || "").trim()).filter(Boolean))];
}

export function useEffectivePermissions() {
  const { userId: authUserId, isLoading: sessionLoading } = useSession();
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (sessionLoading) return;

    if (!authUserId) {
      setPermissionKeys([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("current_app_user_permission_keys");

    if (rpcError) {
      setPermissionKeys([]);
      setError(rpcError);
      setLoading(false);
      return;
    }

    setPermissionKeys(normalizePermissionKeys(data));
    setLoading(false);
  }, [authUserId, sessionLoading]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!active) return;
      await reload();
    }

    load();

    return () => {
      active = false;
    };
  }, [reload]);

  const permissionSet = useMemo(() => new Set(permissionKeys), [permissionKeys]);

  const hasPermission = useCallback(
    (permissionKey) => permissionSet.has(String(permissionKey || "").trim()),
    [permissionSet]
  );

  const hasAnyPermission = useCallback(
    (keys) => normalizePermissionKeys(keys).some((key) => permissionSet.has(key)),
    [permissionSet]
  );

  const hasAllPermissions = useCallback(
    (keys) => normalizePermissionKeys(keys).every((key) => permissionSet.has(key)),
    [permissionSet]
  );

  return {
    permissionKeys,
    permissions: permissionKeys,
    permissionSet,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    reload,
    loading: loading || sessionLoading,
    error,
  };
}

export function useCan(permissionKey) {
  const permissions = useEffectivePermissions();

  return {
    allowed: permissions.hasPermission(permissionKey),
    loading: permissions.loading,
    error: permissions.error,
    permissionKeys: permissions.permissionKeys,
    reload: permissions.reload,
  };
}

export function useCanAny(permissionKeys) {
  const permissions = useEffectivePermissions();

  return {
    allowed: permissions.hasAnyPermission(permissionKeys),
    loading: permissions.loading,
    error: permissions.error,
    permissionKeys: permissions.permissionKeys,
    reload: permissions.reload,
  };
}

export default useEffectivePermissions;


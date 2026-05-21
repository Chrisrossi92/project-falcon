import React from "react";
import { Navigate } from "react-router-dom";
import  useSession  from "@/lib/hooks/useSession";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";

export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredAnyPermissions,
  requiredAllPermissions,
  fallbackPath,
}) {
  const { user, isLoading: sessionLoading } = useSession();
  const permissions = useEffectivePermissions();
  const permissionKeysRequested = [
    requiredPermission,
    ...(Array.isArray(requiredAnyPermissions) ? requiredAnyPermissions : []),
    ...(Array.isArray(requiredAllPermissions) ? requiredAllPermissions : []),
  ].filter(Boolean);
  const hasPermissionGate = permissionKeysRequested.length > 0;
  const loading = sessionLoading || (hasPermissionGate && permissions.loading);
  const redirectPath = fallbackPath || "/dashboard";
  const renderLoading = () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        <span className="text-sm">Checking your session…</span>
      </div>
    </div>
  );

  if (loading) {
    return renderLoading();
  }

  if (!user) return <Navigate to={fallbackPath || "/login"} replace />;

  if (hasPermissionGate && permissions.error) {
    return <Navigate to={redirectPath} replace />;
  }

  if (hasPermissionGate) {
    if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
      return <Navigate to={redirectPath} replace />;
    }
    if (Array.isArray(requiredAnyPermissions) && requiredAnyPermissions.length > 0) {
      if (!permissions.hasAnyPermission(requiredAnyPermissions)) {
        return <Navigate to={redirectPath} replace />;
      }
    }
    if (Array.isArray(requiredAllPermissions) && requiredAllPermissions.length > 0) {
      if (!permissions.hasAllPermissions(requiredAllPermissions)) {
        return <Navigate to={redirectPath} replace />;
      }
    }

    return <>{children}</>;
  }

  return <>{children}</>;
}


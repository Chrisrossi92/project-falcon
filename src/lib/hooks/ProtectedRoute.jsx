import React from "react";
import { Navigate } from "react-router-dom";
import  useSession  from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";

export default function ProtectedRoute({
  children,
  allowedRoles,
  roles, // legacy alias
  requireAdmin = false,
  requireReviewer = false,
  requiredPermission,
  requiredAnyPermissions,
  requiredAllPermissions,
  fallbackPath,
}) {
  const { user, isLoading: sessionLoading } = useSession();
  const { role, isAdmin, isReviewer, loading: roleLoading } = (useRole?.() || {});
  const permissions = useEffectivePermissions();
  const permissionKeysRequested = [
    requiredPermission,
    ...(Array.isArray(requiredAnyPermissions) ? requiredAnyPermissions : []),
    ...(Array.isArray(requiredAllPermissions) ? requiredAllPermissions : []),
  ].filter(Boolean);
  const hasPermissionGate = permissionKeysRequested.length > 0;
  const loading = sessionLoading || !!roleLoading || (hasPermissionGate && permissions.loading);
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

  const wantRoles =
    (Array.isArray(allowedRoles) && allowedRoles.length && allowedRoles) ||
    (Array.isArray(roles) && roles.length && roles) ||
    null;
  const hasRoleGate = !!requireAdmin || !!requireReviewer || !!wantRoles;
  const current = String(role || "").toLowerCase().trim();
  const unresolvedAccess = hasRoleGate && !current;

  if (unresolvedAccess) return renderLoading();

  if (requireAdmin && !isAdmin) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  if (requireReviewer && !isReviewer) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  if (wantRoles) {
    const ok = wantRoles.map((r) => String(r).toLowerCase()).includes(current);
    if (!ok) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }
  if (hasPermissionGate && permissions.error) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }
  if (requiredPermission && !permissions.hasPermission(requiredPermission)) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }
  if (Array.isArray(requiredAnyPermissions) && requiredAnyPermissions.length > 0) {
    if (!permissions.hasAnyPermission(requiredAnyPermissions)) {
      return <Navigate to={fallbackPath || "/dashboard"} replace />;
    }
  }
  if (Array.isArray(requiredAllPermissions) && requiredAllPermissions.length > 0) {
    if (!permissions.hasAllPermissions(requiredAllPermissions)) {
      return <Navigate to={fallbackPath || "/dashboard"} replace />;
    }
  }

  return <>{children}</>;
}




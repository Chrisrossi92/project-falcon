import React from "react";
import { Navigate } from "react-router-dom";
import  useSession  from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

export default function ProtectedRoute({
  children,
  allowedRoles,
  roles, // legacy alias
  requireAdmin = false,
  requireReviewer = false,
  fallbackPath,
}) {
  const { user, isLoading: sessionLoading } = useSession();
  const { role, isAdmin, isReviewer, loading: roleLoading } = (useRole?.() || {});
  const loading = sessionLoading || !!roleLoading;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to={fallbackPath || "/login"} replace />;

  const wantRoles =
    (Array.isArray(allowedRoles) && allowedRoles.length && allowedRoles) ||
    (Array.isArray(roles) && roles.length && roles) ||
    null;

  if (requireAdmin && !isAdmin) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  if (requireReviewer && !isReviewer) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  if (wantRoles) {
    const current = String(role || "").toLowerCase();
    const ok = wantRoles.map((r) => String(r).toLowerCase()).includes(current);
    if (!ok) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }

  return <>{children}</>;
}






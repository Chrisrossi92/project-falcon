// src/lib/hooks/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

/**
 * Centralized route guard.
 *
 * Props:
 *  - children
 *  - allowedRoles?: string[]        // canonical prop
 *  - roles?: string[]               // alias for allowedRoles (back-compat with existing routes)
 *  - requireAdmin?: boolean
 *  - requireReviewer?: boolean
 *  - fallbackPath?: string          // default: '/login' (unauth) or '/dashboard' (unauthorized)
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  roles, // alias: keep legacy <ProtectedRoute roles={['admin']}> working
  requireAdmin = false,
  requireReviewer = false,
  fallbackPath,
}) {
  const { user } = useSession(); // undefined during initial fetch, null when signed-out, object when signed-in
  const { role, isAdmin, isReviewer, loading: roleLoading } = (useRole?.() || {});

  const sessionLoading = typeof user === "undefined";
  const loading = sessionLoading || !!roleLoading;

  // Normalize roles (support alias)
  const wantRoles =
    Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? allowedRoles
      : Array.isArray(roles) && roles.length > 0
      ? roles
      : null;

  // Unified loading UI
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
          <span className="text-sm">Loading access…</span>
        </div>
      </div>
    );
  }

  // Not signed in → login
  if (!user) {
    return <Navigate to={fallbackPath || "/login"} replace />;
  }

  // Role gates
  if (requireAdmin && !isAdmin) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }
  if (requireReviewer && !isReviewer) {
    return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }
  if (wantRoles) {
    const current = String(role || "").toLowerCase();
    const ok = wantRoles.map((r) => String(r).toLowerCase()).includes(current);
    if (!ok) return <Navigate to={fallbackPath || "/dashboard"} replace />;
  }

  // Authorized
  return <>{children}</>;
}



import { Navigate } from "react-router-dom";

import { useShellProfile } from "@/lib/shell/useShellProfile";
import {
  V1_HIDDEN_ENTERPRISE_SURFACE_FALLBACK_PATH,
  isStaffAppraisalHiddenEnterpriseSurfaceBlocked,
} from "@/lib/routes/v1HiddenSurfacePolicy";

function RouteLoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        <span className="text-sm">Checking your workspace…</span>
      </div>
    </div>
  );
}

export default function V1HiddenSurfaceRouteGuard({
  children,
  fallbackPath = V1_HIDDEN_ENTERPRISE_SURFACE_FALLBACK_PATH,
}) {
  const shellProfilePresentation = useShellProfile();

  if (shellProfilePresentation.loading) {
    return <RouteLoadingState />;
  }

  if (isStaffAppraisalHiddenEnterpriseSurfaceBlocked(shellProfilePresentation)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}


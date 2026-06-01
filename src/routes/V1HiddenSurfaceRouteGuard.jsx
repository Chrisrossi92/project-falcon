import { Navigate, useLocation } from "react-router-dom";

import { useShellProfile } from "@/lib/shell/useShellProfile";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import {
  V1_HIDDEN_ENTERPRISE_SURFACE_FALLBACK_PATH,
  isAmcOperationsVendorSurfacePath,
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
  const { operationsMode } = useOperationsMode();
  const { pathname } = useLocation();

  if (shellProfilePresentation.loading) {
    return <RouteLoadingState />;
  }

  const allowAmcVendorSurface =
    operationsMode === OPERATIONS_MODES.AMC_OPERATIONS &&
    isAmcOperationsVendorSurfacePath(pathname);

  if (!allowAmcVendorSurface && isStaffAppraisalHiddenEnterpriseSurfaceBlocked(shellProfilePresentation)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

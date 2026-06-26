import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import AssignmentDashboardPage from "@/features/dashboard/AssignmentDashboardPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import { AssignmentState, LoadingState } from "@/features/assignments/AssignmentPrimitives";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import {
  isClientOnlyPortalAccess,
  isVendorOnlyPortalAccess,
} from "@/lib/permissions/clientPortalAccess";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import {
  CURRENT_DASHBOARD_RESOLUTION_STATES,
  CURRENT_ORDER_DASHBOARD_PERMISSIONS,
  resolveCurrentDashboard,
} from "@/lib/dashboard/currentDashboardResolution";

export const ORDER_DASHBOARD_PERMISSIONS = CURRENT_ORDER_DASHBOARD_PERMISSIONS;

function resolveDashboardOperationsModeForRoute(pathname, operationsMode) {
  if (pathname === "/dashboard") return OPERATIONS_MODES.INTERNAL_OPERATIONS;
  if (pathname === "/amc/dashboard") return OPERATIONS_MODES.AMC_OPERATIONS;
  return operationsMode;
}

export default function DashboardGate() {
  const permissions = useEffectivePermissions();
  const { operationsMode, operationsModeLabel, setOperationsMode } = useOperationsMode();
  const location = useLocation();
  const shellProfilePresentation = useShellProfile();
  const routeOperationsMode = resolveDashboardOperationsModeForRoute(location.pathname, operationsMode);

  useEffect(() => {
    if (
      ["/dashboard", "/amc/dashboard"].includes(location.pathname)
      && operationsMode !== routeOperationsMode
    ) {
      setOperationsMode(routeOperationsMode);
    }
  }, [location.pathname, operationsMode, routeOperationsMode, setOperationsMode]);

  const dashboardResolution = resolveCurrentDashboard({
    loading: permissions.loading,
    error: permissions.error,
    permissionKeys: permissions.permissionKeys,
    operationsMode: routeOperationsMode,
  });

  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.LOADING) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (isClientOnlyPortalAccess(permissions.permissionKeys)) {
    return <Navigate to="/client-portal" replace />;
  }

  if (isVendorOnlyPortalAccess(permissions.permissionKeys)) {
    return <Navigate to="/vendor-workspace/dashboard" replace />;
  }

  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.ORDER_DASHBOARD) {
    const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;

    if (shellProfileId === "my_work") {
      return <Navigate to="/my-work" replace />;
    }

    return (
      <DashboardPage
        shellProfilePresentation={shellProfilePresentation}
        operationsMode={dashboardResolution.operationsMode}
        operationsModeLabel={dashboardResolution.operationsModeLabel || operationsModeLabel}
      />
    );
  }
  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.ASSIGNMENT_DASHBOARD) {
    return (
      <AssignmentDashboardPage
        shellProfilePresentation={shellProfilePresentation}
        operationsMode={dashboardResolution.operationsMode}
        operationsModeLabel={dashboardResolution.operationsModeLabel || operationsModeLabel}
      />
    );
  }

  return (
    <AssignmentState
      title="Dashboard unavailable"
      message="Dashboard access requires order read permission or assignment packet read permission for the current company."
    />
  );
}

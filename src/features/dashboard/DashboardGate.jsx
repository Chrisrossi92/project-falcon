import { Navigate } from "react-router-dom";

import AssignmentDashboardPage from "@/features/dashboard/AssignmentDashboardPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import { AssignmentState, LoadingState } from "@/features/assignments/AssignmentPrimitives";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { isClientOnlyPortalAccess } from "@/lib/permissions/clientPortalAccess";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import {
  CURRENT_DASHBOARD_RESOLUTION_STATES,
  CURRENT_ORDER_DASHBOARD_PERMISSIONS,
  resolveCurrentDashboard,
} from "@/lib/dashboard/currentDashboardResolution";

export const ORDER_DASHBOARD_PERMISSIONS = CURRENT_ORDER_DASHBOARD_PERMISSIONS;

export default function DashboardGate() {
  const permissions = useEffectivePermissions();
  const { operationsMode, operationsModeLabel } = useOperationsMode();
  const shellProfilePresentation = useShellProfile();
  const dashboardResolution = resolveCurrentDashboard({
    loading: permissions.loading,
    error: permissions.error,
    permissionKeys: permissions.permissionKeys,
    operationsMode,
  });

  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.LOADING) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (isClientOnlyPortalAccess(permissions.permissionKeys)) {
    return <Navigate to="/client-portal" replace />;
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

import AssignmentDashboardPage from "@/features/dashboard/AssignmentDashboardPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import { AssignmentState, LoadingState } from "@/features/assignments/AssignmentPrimitives";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import {
  CURRENT_DASHBOARD_RESOLUTION_STATES,
  CURRENT_ORDER_DASHBOARD_PERMISSIONS,
  resolveCurrentDashboard,
} from "@/lib/dashboard/currentDashboardResolution";

export const ORDER_DASHBOARD_PERMISSIONS = CURRENT_ORDER_DASHBOARD_PERMISSIONS;

export default function DashboardGate() {
  const permissions = useEffectivePermissions();
  const dashboardResolution = resolveCurrentDashboard({
    loading: permissions.loading,
    error: permissions.error,
    permissionKeys: permissions.permissionKeys,
  });

  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.LOADING) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.ORDER_DASHBOARD) {
    return <DashboardPage />;
  }
  if (dashboardResolution.state === CURRENT_DASHBOARD_RESOLUTION_STATES.ASSIGNMENT_DASHBOARD) {
    return <AssignmentDashboardPage />;
  }

  return (
    <AssignmentState
      title="Dashboard unavailable"
      message="Dashboard access requires order read permission or assignment packet read permission for the current company."
    />
  );
}

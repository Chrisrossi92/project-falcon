import { Navigate } from "react-router-dom";

import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { isClientOnlyPortalAccess } from "@/lib/permissions/clientPortalAccess";
import { useShellProfile } from "@/lib/shell/useShellProfile";

export default function DefaultWorkspaceRedirect() {
  const shellProfilePresentation = useShellProfile();
  const permissions = useEffectivePermissions();
  const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;
  const canReadOrders = permissions.hasAnyPermission([
    PERMISSIONS.ORDERS_READ_ALL,
    PERMISSIONS.ORDERS_READ_ASSIGNED,
  ]);

  if (shellProfilePresentation?.loading || permissions.loading) {
    return null;
  }

  if (isClientOnlyPortalAccess(permissions.permissionKeys)) {
    return <Navigate to="/client-portal" replace />;
  }

  if (shellProfileId === "my_work" && canReadOrders) {
    return <Navigate to="/my-work" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

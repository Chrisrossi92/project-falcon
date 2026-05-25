import { Navigate } from "react-router-dom";

import { useCanAny } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";

export default function DefaultWorkspaceRedirect() {
  const shellProfilePresentation = useShellProfile();
  const canReadOrders = useCanAny([
    PERMISSIONS.ORDERS_READ_ALL,
    PERMISSIONS.ORDERS_READ_ASSIGNED,
  ]);
  const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;

  if (shellProfilePresentation?.loading || canReadOrders.loading) {
    return null;
  }

  if (shellProfileId === "my_work" && canReadOrders.allowed) {
    return <Navigate to="/my-work" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

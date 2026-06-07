import { Navigate, useLocation } from "react-router-dom";

import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import {
  getRouteWorkspaceFallbackPath,
  getRouteWorkspaceForOperationsMode,
  isRouteWorkspaceAllowed,
  ROUTE_WORKSPACES,
} from "@/routes/workspaceRouteOwnership";

export default function WorkspaceRouteGuard({
  children,
  workspace = ROUTE_WORKSPACES.INTERNAL,
  fallbackPath,
}) {
  const { operationsMode } = useOperationsMode();
  const location = useLocation();

  if (isRouteWorkspaceAllowed(workspace, operationsMode)) {
    return <>{children}</>;
  }

  const redirectPath = fallbackPath || getRouteWorkspaceFallbackPath(
    getRouteWorkspaceForOperationsMode(operationsMode),
  );

  return (
    <Navigate
      to={redirectPath}
      replace
      state={{
        workspaceRedirect: {
          from: location.pathname,
          expectedWorkspace: workspace,
          selectedWorkspace: getRouteWorkspaceForOperationsMode(operationsMode),
        },
      }}
    />
  );
}

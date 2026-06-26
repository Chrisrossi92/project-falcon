import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import {
  getExplicitRouteWorkspaceForPathname,
  getOperationsModeForRouteWorkspace,
  getRouteWorkspaceFallbackPath,
  getRouteWorkspaceForOperationsMode,
  isRouteWorkspaceAllowed,
  ROUTE_WORKSPACES,
} from "@/routes/workspaceRouteOwnership";

function formatExpectedWorkspace(workspace) {
  return Array.isArray(workspace) ? workspace.join(",") : workspace;
}

export default function WorkspaceRouteGuard({
  children,
  workspace = ROUTE_WORKSPACES.INTERNAL,
  fallbackPath,
}) {
  const { operationsMode, setOperationsMode } = useOperationsMode();
  const location = useLocation();
  const explicitRouteWorkspace = getExplicitRouteWorkspaceForPathname(location.pathname);
  const shouldAdoptExplicitWorkspace =
    !Array.isArray(workspace)
    && explicitRouteWorkspace === workspace
    && !isRouteWorkspaceAllowed(workspace, operationsMode);
  const explicitOperationsMode = shouldAdoptExplicitWorkspace
    ? getOperationsModeForRouteWorkspace(explicitRouteWorkspace)
    : null;

  useEffect(() => {
    if (explicitOperationsMode && typeof setOperationsMode === "function") {
      setOperationsMode(explicitOperationsMode);
    }
  }, [explicitOperationsMode, setOperationsMode]);

  if (explicitOperationsMode) {
    return null;
  }

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
          expectedWorkspace: formatExpectedWorkspace(workspace),
          selectedWorkspace: getRouteWorkspaceForOperationsMode(operationsMode),
        },
      }}
    />
  );
}

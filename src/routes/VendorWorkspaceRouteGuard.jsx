import { Navigate } from "react-router-dom";

import useSession from "@/lib/hooks/useSession";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

function RouteLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-950">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
        Checking your vendor workspace...
      </div>
    </div>
  );
}

function VendorWorkspaceDeniedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-950">Vendor Workspace unavailable</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This workspace requires vendor access for the current company. Contact your AMC
          coordinator if you expected access.
        </p>
      </section>
    </div>
  );
}

export default function VendorWorkspaceRouteGuard({ children }) {
  const { user, isLoading: sessionLoading } = useSession();
  const permissions = useEffectivePermissions();

  if (sessionLoading || permissions.loading) {
    return <RouteLoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permissions.error || !permissions.hasPermission(PERMISSIONS.VENDOR_WORKSPACE_VIEW)) {
    return <VendorWorkspaceDeniedState />;
  }

  return <>{children}</>;
}

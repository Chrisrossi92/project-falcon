import { Navigate } from "react-router-dom";

import useSession from "@/lib/hooks/useSession";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

const CLIENT_PORTAL_ENTRY_PERMISSIONS = Object.freeze([
  PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
  PERMISSIONS.CLIENT_PORTAL_ORDERS_READ,
]);

function RouteLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 text-slate-950">
      <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
        Checking your client portal...
      </div>
    </div>
  );
}

function ClientPortalDeniedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-950">Client Portal unavailable</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This portal requires client access for the current account. Contact your appraisal team
          if you expected access.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          If you just confirmed your account from an invitation email, return to the original
          invitation link to finish setup.
        </p>
      </section>
    </div>
  );
}

export default function ClientPortalRouteGuard({ children }) {
  const { user, isLoading: sessionLoading } = useSession();
  const permissions = useEffectivePermissions();

  if (sessionLoading || permissions.loading) {
    return <RouteLoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permissions.error || !permissions.hasAnyPermission(CLIENT_PORTAL_ENTRY_PERMISSIONS)) {
    return <ClientPortalDeniedState />;
  }

  return <>{children}</>;
}

export { CLIENT_PORTAL_ENTRY_PERMISSIONS };

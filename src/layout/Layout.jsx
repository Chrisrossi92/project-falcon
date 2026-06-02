import { Outlet } from "react-router-dom";
import TopNav from "@/components/shell/TopNav";
import { OperationsModeProvider } from "@/lib/operations/OperationsModeProvider";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";

function resolveAvailableOperationsModes(permissions, shellProfile) {
  const appContext = shellProfile?.appContext || {};
  const isOwnerOrAdmin = Boolean(appContext.is_owner || appContext.is_admin_role);
  const canAccessAmcOperations =
    !permissions.loading &&
    !permissions.error &&
    isOwnerOrAdmin &&
    permissions.hasPermission(PERMISSIONS.VENDORS_READ);

  return canAccessAmcOperations
    ? [OPERATIONS_MODES.INTERNAL_OPERATIONS, OPERATIONS_MODES.AMC_OPERATIONS]
    : [OPERATIONS_MODES.INTERNAL_OPERATIONS];
}

export default function Layout() {
  const permissions = useEffectivePermissions();
  const shellProfile = useShellProfile();
  const availableOperationsModes = resolveAvailableOperationsModes(permissions, shellProfile);

  return (
    <OperationsModeProvider availableOperationsModes={availableOperationsModes}>
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-950 text-slate-950">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-center bg-cover opacity-10"
          style={{ backgroundImage: "url('/images/falcon-bg.png')" }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-slate-950/90" />

        <TopNav />
        <main className="mx-auto w-full max-w-[1520px] grow px-2 py-4 sm:px-4 md:pl-[18rem] lg:py-5">
          <div className="rounded-[1.75rem] border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-[0_28px_90px_rgba(2,6,23,0.38)] ring-1 ring-white/10 sm:p-2">
            <div className="min-h-[calc(100vh-9.5rem)] rounded-[1.35rem] border border-slate-300/80 bg-slate-100/95 p-2 shadow-inner shadow-slate-950/[0.06] sm:p-3">
              <Outlet />
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-800 bg-slate-950/95 py-4 text-center text-sm text-slate-400 md:pl-[17rem]">
          © {new Date().getFullYear()} Continental Real Estate Solutions · Falcon MVP
        </footer>
      </div>
    </OperationsModeProvider>
  );
}

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { bootstrapVendorWorkspace } from "@/features/vendorWorkspace/api";
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

function diagnosticValue(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "[]";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DiagnosticRow({ label, value }) {
  return (
    <div className="grid gap-1 border-t border-slate-100 py-2 text-xs sm:grid-cols-[160px_minmax(0,1fr)]">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words font-mono text-slate-700">{diagnosticValue(value)}</dd>
    </div>
  );
}

function VendorWorkspaceDiagnostics({ bootstrap, permissions }) {
  const diagnostics = bootstrap?.diagnostics || bootstrap?.error?.vendorWorkspaceDiagnostics || null;
  const bootstrapResponse = diagnostics?.bootstrap || null;
  const setActiveCompany = diagnostics?.set_active_company || null;
  const sessionAfterRefresh = diagnostics?.session_after_refresh || null;
  const permissionReload = diagnostics?.permission_reload || null;

  if (!diagnostics && !permissions?.error) return null;

  return (
    <details className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-amber-950">
        Vendor Workspace diagnostics
      </summary>
      <dl className="mt-3 divide-y divide-amber-100">
        <DiagnosticRow label="Bootstrap error" value={bootstrap?.error?.message || bootstrapResponse?.error} />
        <DiagnosticRow label="Vendor company id" value={bootstrapResponse?.vendor_company_id} />
        <DiagnosticRow label="Vendor company" value={bootstrapResponse?.vendor_company_name} />
        <DiagnosticRow label="Membership id" value={bootstrapResponse?.membership_id} />
        <DiagnosticRow label="Role assignment id" value={bootstrapResponse?.role_assignment_id} />
        <DiagnosticRow label="Role id" value={bootstrapResponse?.role_id} />
        <DiagnosticRow label="Role name" value={bootstrapResponse?.role_name} />
        <DiagnosticRow label="Bootstrap has view" value={bootstrapResponse?.has_vendor_workspace_view} />
        <DiagnosticRow label="Bootstrap diagnostics" value={bootstrapResponse?.diagnostics} />
        <DiagnosticRow label="Switch status" value={setActiveCompany?.response?.ok} />
        <DiagnosticRow label="Switch error" value={setActiveCompany?.error || setActiveCompany?.response?.code} />
        <DiagnosticRow label="Switch active company id" value={setActiveCompany?.active_company_id_sent} />
        <DiagnosticRow label="Switch response" value={setActiveCompany?.response} />
        <DiagnosticRow label="Session active company id" value={sessionAfterRefresh?.active_company_id} />
        <DiagnosticRow label="Session current company id" value={sessionAfterRefresh?.current_company_id} />
        <DiagnosticRow label="Session user email" value={sessionAfterRefresh?.user_email} />
        <DiagnosticRow label="Session error" value={sessionAfterRefresh?.error} />
        <DiagnosticRow label="Permission company id" value={permissionReload?.current_company_id} />
        <DiagnosticRow label="Permission has view" value={permissionReload?.has_vendor_workspace_view} />
        <DiagnosticRow label="Permission keys" value={permissionReload?.permission_keys} />
        <DiagnosticRow label="Permission reload error" value={permissionReload?.permission_error} />
        <DiagnosticRow label="Route permission error" value={permissions?.error?.message} />
        <DiagnosticRow label="Route permission keys" value={permissions?.permissionKeys} />
      </dl>
    </details>
  );
}

function VendorWorkspaceDeniedState({ bootstrap, permissions }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold text-slate-950">Vendor Workspace unavailable</div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This workspace requires vendor access for the current company. Contact your AMC
          coordinator if you expected access.
        </p>
        <VendorWorkspaceDiagnostics bootstrap={bootstrap} permissions={permissions} />
      </section>
    </div>
  );
}

export default function VendorWorkspaceRouteGuard({ children }) {
  const { user, isLoading: sessionLoading } = useSession();
  const permissions = useEffectivePermissions();
  const reloadPermissions = permissions.reload;
  const [bootstrap, setBootstrap] = useState({
    userId: null,
    status: "idle",
  });

  useEffect(() => {
    let active = true;

    if (sessionLoading || !user?.id) {
      setBootstrap({ userId: user?.id ?? null, status: "idle" });
      return () => {
        active = false;
      };
    }

    setBootstrap({ userId: user.id, status: "loading" });

    async function loadVendorWorkspaceAccess() {
      try {
        const bootstrapResult = await bootstrapVendorWorkspace();
        if (active) {
          console.info("[VendorWorkspaceRouteGuard] bootstrap result", bootstrapResult?.debug || bootstrapResult);
        }
        if (active && typeof reloadPermissions === "function") {
          await reloadPermissions();
        }
        if (active) {
          setBootstrap({
            userId: user.id,
            status: "complete",
            result: bootstrapResult,
            diagnostics: bootstrapResult?.debug || null,
          });
        }
      } catch (error) {
        console.warn(
          "[VendorWorkspaceRouteGuard] bootstrap failed",
          error?.vendorWorkspaceDiagnostics || error,
        );
        if (active) {
          setBootstrap({
            userId: user.id,
            status: "complete",
            error,
            diagnostics: error?.vendorWorkspaceDiagnostics || null,
          });
        }
      }
    }

    loadVendorWorkspaceAccess();

    return () => {
      active = false;
    };
  }, [reloadPermissions, sessionLoading, user?.id]);

  const bootstrapping =
    Boolean(user?.id) &&
    (bootstrap.userId !== user.id || bootstrap.status === "idle" || bootstrap.status === "loading");

  if (sessionLoading || permissions.loading || bootstrapping) {
    return <RouteLoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permissions.error || !permissions.hasPermission(PERMISSIONS.VENDOR_WORKSPACE_VIEW)) {
    return <VendorWorkspaceDeniedState bootstrap={bootstrap} permissions={permissions} />;
  }

  return <>{children}</>;
}

import { useState } from "react";
import SmartActionsControl from "@/features/orders/components/SmartActionsControl";
import { getSmartOrderActions } from "@/features/orders/smartActions";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  clearReview,
  sendOrderBackToAppraiser,
  sendOrderToReview,
} from "@/lib/services/ordersService";

export default function QuickActionsDrawerPanel({
  order,
  orderId: orderIdProp,
  onAfterChange,
  onDone,
  layout = "stack",
}) {
  const { context: appContext, loading: contextLoading } = useCurrentUserAppContext();
  const workflowPermissions = useEffectivePermissions();
  const isAdmin = Boolean(appContext?.is_owner || appContext?.is_admin_role);
  const isReviewer = !isAdmin && Boolean(appContext?.is_reviewer_role);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const orderId = order?.id ?? orderIdProp;
  const afterChange = onAfterChange ?? onDone;
  if (!order || !orderId) return null;

  async function runWorkflowAction() {
    if (!pendingAction) return;

    try {
      setBusy(true);
      await pendingAction.action();
      setPendingAction(null);
      afterChange?.();
    } finally {
      setBusy(false);
    }
  }

  const role = isReviewer ? "reviewer" : "appraiser";
  const handlers = {
    onSendToReview: () => setPendingAction({ label: "Send to Review", action: () => sendOrderToReview(orderId) }),
    onClearReview: () => setPendingAction({ label: "Clear Review", action: () => clearReview(orderId) }),
    onSendBackToAppraiser: () =>
      setPendingAction({ label: "Request Revisions", action: () => sendOrderBackToAppraiser(orderId) }),
  };
  const smartActions = isAdmin
    ? []
    : getSmartOrderActions({
        order,
        role,
        permissions: {
          loading: contextLoading || workflowPermissions.loading,
          error: workflowPermissions.error,
          canSubmitToReview: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW),
          canResubmit: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_RESUBMIT),
          canRequestRevisions: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS),
          canApproveReview: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW),
          canReadyForClient: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT),
          canComplete: workflowPermissions.hasPermission(PERMISSIONS.WORKFLOW_STATUS_COMPLETE),
        },
        handlers,
      }).map((action) => ({
        ...action,
        disabled: busy || action.disabled,
      }));

  const Wrap = ({ children }) =>
    layout === "bar" ? (
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    ) : (
      <div className="space-y-2">{children}</div>
    );

  return (
    <Wrap>
      <SmartActionsControl actions={smartActions} variant="panel" />
      {pendingAction && (
        <div
          role="alertdialog"
          aria-label="Confirm workflow action"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <div className="font-semibold">Run {pendingAction.label}?</div>
          <div className="mt-1 text-xs text-amber-800">
            This updates the order workflow state.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPendingAction(null)}
              disabled={busy}
              className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runWorkflowAction}
              disabled={busy}
              className="rounded border border-amber-700 bg-amber-700 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {busy ? "Running..." : pendingAction.label}
            </button>
          </div>
        </div>
      )}
    </Wrap>
  );
}

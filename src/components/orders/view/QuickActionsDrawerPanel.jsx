import React, { useState } from "react";
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
  const orderId = order?.id ?? orderIdProp;
  const afterChange = onAfterChange ?? onDone;
  if (!order || !orderId) return null;

  async function runWorkflowAction(label, action) {
    const ok = window.confirm(`Run "${label}"?`);
    if (!ok) return;
    try {
      setBusy(true);
      await action();
      afterChange?.();
    } finally {
      setBusy(false);
    }
  }

  const role = isReviewer ? "reviewer" : "appraiser";
  const handlers = {
    onSendToReview: () => runWorkflowAction("Send to Review", () => sendOrderToReview(orderId)),
    onClearReview: () => runWorkflowAction("Clear Review", () => clearReview(orderId)),
    onSendBackToAppraiser: () => runWorkflowAction("Request Revisions", () => sendOrderBackToAppraiser(orderId)),
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
    </Wrap>
  );
}


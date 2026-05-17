import React, { useState } from "react";
import { useRole } from "@/lib/hooks/useRole";
import SmartActionsControl from "@/features/orders/components/SmartActionsControl";
import { getSmartOrderActions } from "@/features/orders/smartActions";
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
  const { isAdmin, isReviewer } = useRole() || {};
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
        permissions: { loading: true },
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



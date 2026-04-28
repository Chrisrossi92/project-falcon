import { ORDER_STATUS } from "@/lib/constants/orderStatus";

const APPRAISER_SEND_TO_REVIEW_STATUSES = new Set([
  "new",
  "in_progress",
  "needs_revisions",
]);

export function getSmartOrderActions({ order, role, permissions = {}, handlers = {} } = {}) {
  if (!order) return [];

  const normalizedRole = (role || "appraiser").toString().toLowerCase();
  const isAppraiser = normalizedRole === "appraiser";
  const isReviewer = normalizedRole === "reviewer";
  const normalizedStatus = String(order?.status || "").toLowerCase().trim();
  const canShowSendToReviewStatus = APPRAISER_SEND_TO_REVIEW_STATUSES.has(normalizedStatus);
  const canShowReviewActionStatus = normalizedStatus === ORDER_STATUS.IN_REVIEW;
  const canShowRequestFinalApprovalStatus = normalizedStatus === ORDER_STATUS.REVIEW_CLEARED;
  const canShowReadyForClientStatus = [
    ORDER_STATUS.REVIEW_CLEARED,
    ORDER_STATUS.PENDING_FINAL_APPROVAL,
  ].includes(normalizedStatus);

  const useLegacyWorkflowActions = permissions.loading || permissions.error;
  const hasWorkflowPermission = (allowed) => useLegacyWorkflowActions || Boolean(allowed);

  const canSubmitOrResubmit =
    normalizedStatus === ORDER_STATUS.NEEDS_REVISIONS
      ? hasWorkflowPermission(permissions.canResubmit)
      : hasWorkflowPermission(permissions.canSubmitToReview);
  const canSendToReview =
    isAppraiser &&
    canShowSendToReviewStatus &&
    Boolean(handlers.onSendToReview) &&
    canSubmitOrResubmit;
  const canSendBackToAppraiser =
    canShowReviewActionStatus &&
    Boolean(handlers.onSendBackToAppraiser) &&
    hasWorkflowPermission(permissions.canRequestRevisions);
  const canClearReview =
    canShowReviewActionStatus &&
    Boolean(handlers.onClearReview) &&
    hasWorkflowPermission(permissions.canApproveReview);
  const canRequestFinalApproval =
    canShowRequestFinalApprovalStatus &&
    Boolean(handlers.onRequestFinalApproval) &&
    hasWorkflowPermission(permissions.canReadyForClient);
  const canMarkReadyForClient =
    canShowReadyForClientStatus &&
    Boolean(handlers.onReadyForClient) &&
    hasWorkflowPermission(permissions.canReadyForClient);
  const canCompleteOrder =
    Boolean(handlers.onComplete) &&
    hasWorkflowPermission(permissions.canComplete);

  if (isAppraiser) {
    return [
      {
        id: "send_to_review",
        label: "Send to Review",
        visible: canSendToReview,
        disabled: false,
        isPrimary: canSendToReview,
        onClick: () => handlers.onSendToReview?.(order),
      },
    ];
  }

  if (isReviewer) {
    return [
      {
        id: "send_back_to_appraiser",
        label: "Send back to appraiser",
        visible: canShowReviewActionStatus,
        disabled: !canSendBackToAppraiser,
        isPrimary: false,
        onClick: () => handlers.onSendBackToAppraiser?.(order),
      },
      {
        id: "clear_review",
        label: "Clear Review",
        visible: canShowReviewActionStatus,
        disabled: !canClearReview,
        isPrimary: canShowReviewActionStatus && canClearReview,
        onClick: () => handlers.onClearReview?.(order),
      },
    ];
  }

  return [
    {
      id: "send_to_review",
      label: "Send to review",
      visible: canShowSendToReviewStatus && canSubmitOrResubmit,
      disabled: false,
      isPrimary: false,
      onClick: () => handlers.onSendToReview?.(order),
    },
    {
      id: "send_back_to_appraiser",
      label: "Send back to appraiser",
      visible: canSendBackToAppraiser,
      disabled: false,
      isPrimary: false,
      onClick: () => handlers.onSendBackToAppraiser?.(order),
    },
    {
      id: "request_final_approval",
      label: "Request Final Approval",
      visible: canRequestFinalApproval,
      disabled: false,
      isPrimary: false,
      onClick: () => handlers.onRequestFinalApproval?.(order),
    },
    {
      id: "ready_for_client",
      label: "Ready for Client",
      visible: canMarkReadyForClient,
      disabled: false,
      isPrimary: canMarkReadyForClient,
      onClick: () => handlers.onReadyForClient?.(order),
    },
    {
      id: "complete",
      label: "Mark complete",
      visible: canCompleteOrder,
      disabled: false,
      isPrimary: false,
      onClick: () => handlers.onComplete?.(order),
    },
  ];
}

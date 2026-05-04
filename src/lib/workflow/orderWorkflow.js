import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import { PERMISSIONS } from "@/lib/permissions/constants";

/**
 * Canonical order workflow map for Falcon.
 *
 * This file is intentionally data-only for now. The first hardening step is to
 * document the workflow spine in code without changing runtime behavior.
 * Future slices should wire Smart Actions, service helpers, backend RPCs, and
 * Supabase transition enforcement to this map.
 */
export const ORDER_WORKFLOW_TRANSITIONS = Object.freeze({
  submit_to_review: Object.freeze({
    key: "submit_to_review",
    actionId: "send_to_review",
    label: "Send to Review",
    resubmissionLabel: "Resubmit to Review",
    from: Object.freeze([
      ORDER_STATUS.NEW,
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.NEEDS_REVISIONS,
    ]),
    to: ORDER_STATUS.IN_REVIEW,
    primaryActorRole: "appraiser",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW,
    resubmissionPermission: PERMISSIONS.WORKFLOW_STATUS_RESUBMIT,
    notificationEvent: "order.sent_to_review",
    note: Object.freeze({ required: false, recommendedWhen: ORDER_STATUS.NEEDS_REVISIONS }),
  }),

  request_revisions: Object.freeze({
    key: "request_revisions",
    actionId: "send_back_to_appraiser",
    label: "Return to Appraiser",
    from: Object.freeze([ORDER_STATUS.IN_REVIEW]),
    to: ORDER_STATUS.NEEDS_REVISIONS,
    primaryActorRole: "reviewer",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
    notificationEvent: "order.sent_back_to_appraiser",
    note: Object.freeze({ required: false, recommendedWhen: ORDER_STATUS.IN_REVIEW }),
  }),

  approve_review: Object.freeze({
    key: "approve_review",
    actionId: "clear_review",
    label: "Approve Review",
    from: Object.freeze([ORDER_STATUS.IN_REVIEW]),
    to: ORDER_STATUS.REVIEW_CLEARED,
    primaryActorRole: "reviewer",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW,
    notificationEvent: "order.review_cleared",
    note: Object.freeze({ required: false }),
  }),

  request_final_approval: Object.freeze({
    key: "request_final_approval",
    actionId: "request_final_approval",
    label: "Request Final Approval",
    from: Object.freeze([ORDER_STATUS.REVIEW_CLEARED]),
    to: ORDER_STATUS.PENDING_FINAL_APPROVAL,
    primaryActorRole: "admin",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT,
    notificationEvent: null,
    note: Object.freeze({ required: false }),
  }),

  ready_for_client: Object.freeze({
    key: "ready_for_client",
    actionId: "ready_for_client",
    label: "Ready for Client",
    from: Object.freeze([
      ORDER_STATUS.REVIEW_CLEARED,
      ORDER_STATUS.PENDING_FINAL_APPROVAL,
    ]),
    to: ORDER_STATUS.READY_FOR_CLIENT,
    primaryActorRole: "admin",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_READY_FOR_CLIENT,
    notificationEvent: "order.ready_for_client",
    note: Object.freeze({ required: false }),
  }),

  complete: Object.freeze({
    key: "complete",
    actionId: "complete",
    label: "Mark Complete",
    from: Object.freeze([ORDER_STATUS.READY_FOR_CLIENT]),
    to: ORDER_STATUS.COMPLETED,
    primaryActorRole: "admin",
    requiredPermission: PERMISSIONS.WORKFLOW_STATUS_COMPLETE,
    notificationEvent: "order.completed",
    note: Object.freeze({ required: false }),
  }),
});

export const ORDER_WORKFLOW_TRANSITION_LIST = Object.freeze(
  Object.values(ORDER_WORKFLOW_TRANSITIONS)
);

export function getOrderWorkflowTransition(transitionKey) {
  return ORDER_WORKFLOW_TRANSITIONS[transitionKey] || null;
}

export function getAllowedOrderWorkflowTransitions(status) {
  const normalizedStatus = String(status || "").toLowerCase().trim();
  return ORDER_WORKFLOW_TRANSITION_LIST.filter((transition) =>
    transition.from.includes(normalizedStatus)
  );
}

export function canTransitionOrderStatus(status, transitionKey) {
  const transition = getOrderWorkflowTransition(transitionKey);
  if (!transition) return false;
  const normalizedStatus = String(status || "").toLowerCase().trim();
  return transition.from.includes(normalizedStatus);
}

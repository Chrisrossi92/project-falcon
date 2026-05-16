export const OPERATIONAL_QUEUE_IDS = Object.freeze({
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  STUCK_ORDERS: "stuck_orders",
  WAITING_ON_REVIEWER: "waiting_on_reviewer",
  WAITING_ON_APPRAISER: "waiting_on_appraiser",
  INSPECTION_COMPLETE_REPORT_NOT_STARTED: "inspection_complete_report_not_started",
  FINAL_APPROVAL_QUEUE: "final_approval_queue",
  READY_FOR_DELIVERY: "ready_for_delivery",
  REVIEWER_OVERLOAD: "reviewer_overload",
  APPRAISER_OVERLOAD: "appraiser_overload",
  UNASSIGNED_ORDERS: "unassigned_orders",
  REVISION_LOOP_RISK: "revision_loop_risk",
});

// Queues are derived operational intelligence. They must remain deterministic
// and explainable, not hidden workflow statuses or AI-generated classifications.
export const OPERATIONAL_QUEUE_DEFINITIONS = Object.freeze([
  {
    id: OPERATIONAL_QUEUE_IDS.DUE_SOON,
    label: "Due Soon",
    urgency: "high",
    description: "Orders approaching a client-facing due date.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.OVERDUE,
    label: "Overdue",
    urgency: "critical",
    description: "Orders past a client-facing due date.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.STUCK_ORDERS,
    label: "Stuck Orders",
    urgency: "medium_high",
    description: "Orders that have not moved for longer than expected.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.WAITING_ON_REVIEWER,
    label: "Waiting on Reviewer",
    urgency: "medium_high",
    description: "Orders where reviewer action is the next expected step.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.WAITING_ON_APPRAISER,
    label: "Waiting on Appraiser",
    urgency: "medium_high",
    description: "Orders where appraiser action is the next expected step.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.INSPECTION_COMPLETE_REPORT_NOT_STARTED,
    label: "Inspection Complete / Report Not Started",
    urgency: "medium",
    description: "Orders where fieldwork appears complete but report work has not progressed.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.FINAL_APPROVAL_QUEUE,
    label: "Final Approval Queue",
    urgency: "high",
    description: "Orders awaiting owner or admin final approval before delivery.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.READY_FOR_DELIVERY,
    label: "Ready For Delivery",
    urgency: "high",
    description: "Orders cleared for client delivery but not yet completed.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.REVIEWER_OVERLOAD,
    label: "Reviewer Overload",
    urgency: "medium",
    description: "Reviewers with too many active review responsibilities.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.APPRAISER_OVERLOAD,
    label: "Appraiser Overload",
    urgency: "medium",
    description: "Appraisers with too many active production responsibilities.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.UNASSIGNED_ORDERS,
    label: "Unassigned Orders",
    urgency: "high",
    description: "Orders missing required appraiser or reviewer assignment.",
  },
  {
    id: OPERATIONAL_QUEUE_IDS.REVISION_LOOP_RISK,
    label: "Revision Loop Risk",
    urgency: "medium_high",
    description: "Orders showing signs of repeated review and revision cycles.",
  },
]);

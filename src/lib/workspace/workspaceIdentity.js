import {
  OPERATIONS_MODES,
  normalizeOperationsMode,
} from "@/lib/operations/operationsMode";

const EMPTY_ACCENT_CLASSES = Object.freeze({
  eyebrow: "",
  shell: "",
  shellPanel: "",
  workspaceFrame: "",
  badge: "",
});

const WORKSPACE_IDENTITIES = Object.freeze({
  [OPERATIONS_MODES.INTERNAL_OPERATIONS]: Object.freeze({
    id: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    label: "Continental Internal Operations",
    shortLabel: "Internal",
    environmentLabel: "Continental Internal Operations",
    badgeLabel: "Internal",
    badgeDescription: "Continental Internal Operations environment",
    documentTitle: "Falcon - Continental Internal Operations",
    shellCueLabel: "Operations Command",
    shellCueDescription: "Internal appraisal operations",
    dashboardTitle: "Appraisal Production Dashboard",
    dashboardSubtitle: "Track active work, review handoffs, due pressure, and workflow coordination.",
    dashboardStatLabel: "Environment",
    dashboardStatValue: "Continental Internal Operations",
    ordersEyebrow: "Internal",
    ordersWorkMode: "Client Orders",
    ordersDescription: "Manage Continental appraisal production orders, workflow handoffs, and client delivery records.",
    navigationLabels: Object.freeze({
      dashboard: "Appraisal Production",
      orders: "Client Orders",
      calendar: "Review Workflow",
      assignments: "Staff Assignments",
      "clients.primary": "Client Relationships",
      users: "Staff Directory",
    }),
    navigationSectionLabels: Object.freeze({
      operations: "Appraisal Production",
      management: "Operations Management",
    }),
    pages: Object.freeze({
      activity: Object.freeze({
        eyebrow: "Internal Activity",
        title: "Continental Internal Activity",
        description: "Notification history, workflow updates, and communication summaries scoped to Continental Internal Operations.",
      }),
      calendar: Object.freeze({
        eyebrow: "Review Workflow",
        title: "Internal Production Calendar",
        description: "Coordinate site visits, review handoffs, and client due dates across Continental internal production orders.",
      }),
      clients: Object.freeze({
        eyebrow: "Client Orders",
        title: "Internal Client Relationships",
        description: "Find client, lender, and AMC relationships used for Continental internal order coordination.",
      }),
      assignments: Object.freeze({
        eyebrow: "Staff Assignments",
        title: "Internal Staff Assignments",
        description: "Coordinate scoped assignment packets for Continental internal production without expanding order or client visibility.",
      }),
      orderDetail: Object.freeze({
        eyebrow: "Internal Order Detail",
        title: "Continental Internal Order",
        description: "Internal appraisal production record scoped to Continental workflow, review, and client delivery.",
      }),
    }),
    accentClasses: Object.freeze({
      ...EMPTY_ACCENT_CLASSES,
      badge: "border-slate-300 bg-slate-100 text-slate-700",
      eyebrow: "border-slate-200 bg-slate-50 text-slate-600",
    }),
  }),
  [OPERATIONS_MODES.AMC_OPERATIONS]: Object.freeze({
    id: OPERATIONS_MODES.AMC_OPERATIONS,
    label: "Falcon AMC",
    shortLabel: "AMC",
    environmentLabel: "Falcon AMC Environment",
    badgeLabel: "AMC",
    badgeDescription: "Falcon AMC environment",
    documentTitle: "Falcon - Falcon AMC",
    shellCueLabel: "Procurement Command",
    shellCueDescription: "Vendor procurement and AMC operations",
    dashboardTitle: "Falcon AMC Dashboard",
    dashboardSubtitle: "Track procurement queues, vendor response, client orders, and SLA pressure.",
    dashboardStatLabel: "Environment",
    dashboardStatValue: "Falcon AMC",
    ordersEyebrow: "Procurement",
    ordersWorkMode: "Falcon AMC",
    ordersDescription: "Manage Falcon AMC orders, vendor procurement context, and client-services coordination.",
    navigationLabels: Object.freeze({
      dashboard: "Management Operations",
      orders: "Procurement",
      calendar: "Assignment Oversight",
      vendors: "Vendor Network",
      "clients.primary": "Client Services",
      client_requests: "Client Requests",
    }),
    navigationSectionLabels: Object.freeze({
      procurement: "Management Operations",
      vendors: "Vendor Network",
      clients: "Client Services",
    }),
    pages: Object.freeze({
      activity: Object.freeze({
        eyebrow: "AMC Activity",
        title: "Falcon AMC Activity",
        description: "Notification history, procurement updates, and communication summaries scoped to Falcon AMC.",
      }),
      calendar: Object.freeze({
        eyebrow: "Assignment Oversight",
        title: "Falcon AMC Calendar",
        description: "Coordinate vendor assignment oversight, due pressure, and client-services milestones across AMC orders.",
      }),
      clients: Object.freeze({
        eyebrow: "Client Services",
        title: "AMC Client Services",
        description: "Find client and lender relationships used for Falcon AMC coordination.",
      }),
      vendors: Object.freeze({
        eyebrow: "Vendor Network",
        title: "Falcon AMC Vendor Network",
        description: "Manage the Falcon AMC vendor network, profile requests, invoice review, and payment oversight.",
      }),
      assignments: Object.freeze({
        eyebrow: "Assignment Oversight",
        title: "AMC Assignment Oversight",
        description: "Coordinate AMC assignment packets without exposing internal staff-production tools.",
      }),
      orderDetail: Object.freeze({
        eyebrow: "AMC Order Detail",
        title: "Falcon AMC Order",
        description: "Falcon AMC procurement record scoped to vendor assignment, client services, and payment oversight.",
      }),
      vendorPayments: Object.freeze({
        eyebrow: "Vendor Workspace",
        title: "Falcon AMC Payments",
        description: "Review Vendor Invoices and AMC payment status for assigned Falcon AMC work. Payments are visible once assignments reach payment-eligible states.",
      }),
      vendorAvailableWorkDetail: Object.freeze({
        eyebrow: "Procurement Opportunity",
        title: "Falcon AMC Work Detail",
        description: "Vendor Network bid opportunity scoped to Falcon AMC procurement.",
      }),
      vendorAssignedOrderDetail: Object.freeze({
        eyebrow: "Assignment Oversight",
        title: "Falcon AMC Assigned Order",
        description: "Vendor Workspace assignment detail scoped to Falcon AMC coordinator review and report submission.",
      }),
    }),
    accentClasses: Object.freeze({
      eyebrow: "border-cyan-200 bg-cyan-50 text-cyan-800",
      shell: "ring-1 ring-cyan-400/15 shadow-cyan-950/20",
      shellPanel: "border-cyan-700/40 bg-cyan-950/15",
      workspaceFrame: "ring-cyan-400/15",
      badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
    }),
  }),
});

export function getWorkspaceIdentity(operationsMode) {
  return WORKSPACE_IDENTITIES[normalizeOperationsMode(operationsMode)];
}

export function getWorkspaceDocumentTitle(operationsMode) {
  return getWorkspaceIdentity(operationsMode).documentTitle;
}

export function getWorkspaceNavigationLabel(operationsMode, entryId, fallback = "") {
  const identity = getWorkspaceIdentity(operationsMode);
  return identity.navigationLabels?.[entryId] || fallback;
}

export function getWorkspaceNavigationSectionLabel(operationsMode, sectionId, fallback = "") {
  const identity = getWorkspaceIdentity(operationsMode);
  return identity.navigationSectionLabels?.[sectionId] || fallback;
}

export function getWorkspacePageChrome(operationsMode, pageId) {
  return getWorkspaceIdentity(operationsMode).pages?.[pageId] || Object.freeze({});
}

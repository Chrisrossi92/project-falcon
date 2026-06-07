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
    label: "Internal Operations",
    shortLabel: "Internal",
    environmentLabel: "Internal Environment",
    badgeLabel: "Internal",
    badgeDescription: "Internal Operations environment",
    documentTitle: "Falcon - Internal Operations",
    shellCueLabel: "Operations Command",
    shellCueDescription: "Internal appraisal operations",
    dashboardTitle: "Operations Dashboard",
    dashboardSubtitle: "Track active work, review handoffs, due pressure, and workflow coordination.",
    dashboardStatLabel: "Environment",
    dashboardStatValue: "Internal Operations",
    ordersEyebrow: "Internal",
    ordersWorkMode: "Internal Operations",
    ordersDescription: "Manage internal appraisal orders, workflow handoffs, and order records.",
    accentClasses: Object.freeze({
      ...EMPTY_ACCENT_CLASSES,
      badge: "border-slate-300 bg-slate-100 text-slate-700",
      eyebrow: "border-slate-200 bg-slate-50 text-slate-600",
    }),
  }),
  [OPERATIONS_MODES.AMC_OPERATIONS]: Object.freeze({
    id: OPERATIONS_MODES.AMC_OPERATIONS,
    label: "AMC Operations",
    shortLabel: "AMC",
    environmentLabel: "AMC Environment",
    badgeLabel: "AMC",
    badgeDescription: "AMC Operations environment",
    documentTitle: "Falcon - AMC Operations",
    shellCueLabel: "Procurement Command",
    shellCueDescription: "Vendor procurement and AMC operations",
    dashboardTitle: "AMC Operations Dashboard",
    dashboardSubtitle: "Track procurement queues, vendor response, client orders, and SLA pressure.",
    dashboardStatLabel: "Environment",
    dashboardStatValue: "AMC Operations",
    ordersEyebrow: "Procurement",
    ordersWorkMode: "AMC Operations",
    ordersDescription: "Manage AMC orders, vendor procurement context, and client coordination.",
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

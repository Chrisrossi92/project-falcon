import {
  OPERATIONS_MODES,
  normalizeOperationsMode,
} from "@/lib/operations/operationsMode";

const EMPTY_ACCENT_CLASSES = Object.freeze({
  eyebrow: "",
  shell: "",
  shellPanel: "",
  workspaceFrame: "",
});

const WORKSPACE_IDENTITIES = Object.freeze({
  [OPERATIONS_MODES.INTERNAL_OPERATIONS]: Object.freeze({
    id: OPERATIONS_MODES.INTERNAL_OPERATIONS,
    shellCueLabel: null,
    shellCueDescription: null,
    dashboardSubtitle: null,
    dashboardStatLabel: null,
    dashboardStatValue: null,
    ordersEyebrow: null,
    ordersWorkMode: null,
    ordersDescription: null,
    accentClasses: EMPTY_ACCENT_CLASSES,
  }),
  [OPERATIONS_MODES.AMC_OPERATIONS]: Object.freeze({
    id: OPERATIONS_MODES.AMC_OPERATIONS,
    shellCueLabel: "Procurement Command",
    shellCueDescription: "Vendor procurement and AMC operations",
    dashboardSubtitle: "Track procurement queues, vendor response, client orders, and SLA pressure.",
    dashboardStatLabel: "Workspace",
    dashboardStatValue: "AMC Operations",
    ordersEyebrow: "Procurement",
    ordersWorkMode: "AMC Operations",
    ordersDescription: "Manage AMC orders, vendor procurement context, and client coordination.",
    accentClasses: Object.freeze({
      eyebrow: "border-cyan-200 bg-cyan-50 text-cyan-800",
      shell: "ring-1 ring-cyan-400/15 shadow-cyan-950/20",
      shellPanel: "border-cyan-700/40 bg-cyan-950/15",
      workspaceFrame: "ring-cyan-400/15",
    }),
  }),
});

export function getWorkspaceIdentity(operationsMode) {
  return WORKSPACE_IDENTITIES[normalizeOperationsMode(operationsMode)];
}

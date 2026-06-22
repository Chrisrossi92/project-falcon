import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";

export const AMC_PIPELINE_STAGES = Object.freeze([
  {
    id: "needs_bids",
    label: "Needs Bids",
    actionLabel: "Request bids",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    actionRequired: true,
  },
  {
    id: "awaiting_responses",
    label: "Awaiting Responses",
    actionLabel: "Monitor responses",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    actionRequired: false,
  },
  {
    id: "select_bid",
    label: "Select Bid",
    actionLabel: "Select bid",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
    actionRequired: true,
  },
  {
    id: "send_offer",
    label: "Send Offer",
    actionLabel: "Send offer",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    actionRequired: true,
  },
  {
    id: "in_progress",
    label: "In Progress",
    actionLabel: "Track work",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    actionRequired: false,
  },
  {
    id: "review",
    label: "Review",
    actionLabel: "Review report",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    actionRequired: true,
  },
]);

const ACTION_REQUIRED_STAGE_IDS = new Set(
  AMC_PIPELINE_STAGES.filter((stage) => stage.actionRequired).map((stage) => stage.id),
);

const STAGE_BY_ID = Object.freeze(
  Object.fromEntries(AMC_PIPELINE_STAGES.map((stage) => [stage.id, stage])),
);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function orderIdOf(order = {}) {
  return order?.id || order?.order_id || null;
}

function stageIndex(stageId) {
  const index = AMC_PIPELINE_STAGES.findIndex((stage) => stage.id === stageId);
  return index === -1 ? AMC_PIPELINE_STAGES.length : index;
}

function buildAmcPipelineItems(orders = [], summariesByOrderId = {}) {
  return (Array.isArray(orders) ? orders : [])
    .filter(isAmcOperationsOrder)
    .map((order) => {
      const summary = summariesByOrderId[orderIdOf(order)] || null;
      const stage = getAmcPipelineStage(summary);
      return {
        order,
        summary,
        stage,
      };
    })
    .sort((a, b) => {
      const stageDelta = stageIndex(a.stage.id) - stageIndex(b.stage.id);
      if (stageDelta !== 0) return stageDelta;
      return String(a.order?.final_due_at || a.order?.due_date || "").localeCompare(
        String(b.order?.final_due_at || b.order?.due_date || ""),
      );
    });
}

export function isAmcOperationsOrder(order = {}) {
  return normalize(order?.operations_scope) === OPERATIONS_MODES.AMC_OPERATIONS;
}

export function getAmcPipelineStage(summary = null) {
  const status = normalize(summary?.status);
  const assignmentStatus = normalize(summary?.assignment_status);

  if (status === "assigned" && assignmentStatus === "submitted") return STAGE_BY_ID.review;
  if (status === "assigned") return STAGE_BY_ID.in_progress;
  if (status === "assignment_offered") return STAGE_BY_ID.in_progress;
  if (status === "bid_selected") return STAGE_BY_ID.send_offer;
  if (status === "responses_received" || status === "bids_received") return STAGE_BY_ID.select_bid;
  if (status === "bids_requested" || status === "out_for_bid") return STAGE_BY_ID.awaiting_responses;

  return STAGE_BY_ID.needs_bids;
}

export function buildAmcPipelineStageCounts(orders = [], summariesByOrderId = {}) {
  const counts = Object.fromEntries(AMC_PIPELINE_STAGES.map((stage) => [stage.id, 0]));

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!isAmcOperationsOrder(order)) continue;
    const stage = getAmcPipelineStage(summariesByOrderId[orderIdOf(order)]);
    counts[stage.id] += 1;
  }

  return AMC_PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: counts[stage.id] || 0,
  }));
}

export function getAmcPipelineAttentionRows(orders = [], summariesByOrderId = {}, limit = 8) {
  return buildAmcPipelineItems(orders, summariesByOrderId)
    .filter((item) => ACTION_REQUIRED_STAGE_IDS.has(item.stage.id))
    .slice(0, limit)
    .map((item) => item.order);
}

export function getAmcPipelineRowsForStage(
  orders = [],
  summariesByOrderId = {},
  stageId = "",
  limit = 8,
) {
  const normalizedStageId = normalize(stageId);
  if (!normalizedStageId || !STAGE_BY_ID[normalizedStageId]) return [];

  return buildAmcPipelineItems(orders, summariesByOrderId)
    .filter((item) => item.stage.id === normalizedStageId)
    .slice(0, limit)
    .map((item) => item.order);
}

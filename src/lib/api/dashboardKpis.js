// src/lib/api/dashboardKpis.js
import supabase from "@/lib/supabaseClient";

const DASHBOARD_ORDERS_VIEW = "v_orders_frontend_v4";
const DASHBOARD_ACTIVE_STATUSES = Object.freeze([
  "new",
  "in_progress",
  "in_review",
  "needs_revisions",
  "review_cleared",
  "pending_final_approval",
  "ready_for_client",
]);
const REPORT_WRITING_STATUSES = ["new", "in_progress", "needs_revisions"];
const KPI_ROW_LIMIT = 2000;

function applyScope(
  q,
  {
    reviewerId = null,
    appraiserId = null,
    clientId = null,
    statusIn = [],
    operationsScope = null,
  } = {},
) {
  if (reviewerId) q = q.eq("reviewer_id", reviewerId);
  else if (appraiserId) q = q.eq("appraiser_id", appraiserId);
  if (clientId) q = q.eq("client_id", clientId);
  if (statusIn?.length) q = q.in("status", statusIn);
  if (operationsScope) q = q.eq("operations_scope", operationsScope);
  return q;
}

function normalizeStatus(value) {
  return String(value || "").toLowerCase().trim();
}

function readDueDate(order) {
  return order?.final_due_date || order?.final_due_at || order?.due_date || null;
}

function isBetween(value, startIso, endIso) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= new Date(startIso).getTime() && time <= new Date(endIso).getTime();
}

function isBefore(value, endIso) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time < new Date(endIso).getTime();
}

function hasPastSiteVisit(order, nowIso) {
  const value = order?.site_visit_date || order?.site_visit_at || null;
  return Boolean(value) && isBefore(value, nowIso);
}

async function fetchActiveRowsWithScope(scope) {
  let q = supabase
    .from(DASHBOARD_ORDERS_VIEW)
    .select(
      "id,status,final_due_date,final_due_at,due_date,site_visit_date,site_visit_at,operations_scope,appraiser_id,reviewer_id,client_id",
      { count: "exact" },
    )
    .range(0, KPI_ROW_LIMIT - 1);
  q = applyScope(q, scope);
  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}

export async function fetchDashboardKpis(scope = {}) {
  const baseScope = {
    reviewerId: scope.reviewerId || null,
    appraiserId: scope.appraiserId || null,
    clientId: scope.clientId || scope.managingAmcId || null,
    statusIn: scope.statusIn?.length ? scope.statusIn : DASHBOARD_ACTIVE_STATUSES,
    operationsScope: scope.operationsScope || null,
  };

  const dueLimit = new Date();
  dueLimit.setDate(dueLimit.getDate() + 7);
  const dueIso = dueLimit.toISOString();
  const clientDueLimit = new Date();
  clientDueLimit.setDate(clientDueLimit.getDate() + 2);
  const clientDueIso = clientDueLimit.toISOString();
  const nowIso = new Date().toISOString();

  const { rows, count } = await fetchActiveRowsWithScope(baseScope);
  const byStatus = (status) => rows.filter((row) => normalizeStatus(row.status) === status).length;

  return {
    total_active: count,
    in_progress: byStatus("in_progress"),
    due_in_7: rows.filter((row) => isBetween(readDueDate(row), nowIso, dueIso)).length,
    inspected_awaiting_report: rows.filter(
      (row) => REPORT_WRITING_STATUSES.includes(normalizeStatus(row.status)) && hasPastSiteVisit(row, nowIso),
    ).length,
    due_to_client_2: rows.filter((row) => isBetween(readDueDate(row), nowIso, clientDueIso)).length,
    in_review: byStatus("in_review"),
    needs_revisions: byStatus("needs_revisions"),
    overdue: rows.filter((row) => isBefore(readDueDate(row), nowIso)).length,
  };
}

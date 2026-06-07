import supabase from "@/lib/supabaseClient";

const CLIENT_PORTAL_ORDER_LIST_RPC = "rpc_client_portal_orders";
const CLIENT_PORTAL_ORDER_DETAIL_RPC = "rpc_client_portal_order_detail";
const CLIENT_PORTAL_DASHBOARD_RPC = "rpc_client_portal_dashboard";

const toStringOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const toBoolean = (value) => value === true || value === "true";

const firstPresent = (...values) => values.find((value) => value !== null && value !== undefined);

export function normalizeClientPortalOrder(row = {}) {
  const orderKey = toStringOrNull(row.order_key ?? row.orderKey ?? row.portal_order_key);

  if (!orderKey) return null;

  return {
    orderKey,
    orderNumber: toStringOrNull(row.order_number ?? row.orderNumber) || "Order",
    status: toStringOrNull(row.status_label ?? row.statusLabel ?? row.status) || "In progress",
    propertyAddress: toStringOrNull(row.property_address ?? row.propertyAddress ?? row.address) || "Property address pending",
    city: toStringOrNull(row.city),
    state: toStringOrNull(row.state),
    orderedAt: toStringOrNull(row.ordered_at ?? row.orderedAt ?? row.created_at),
    dueAt: toStringOrNull(row.due_at ?? row.dueAt ?? row.client_due_at),
    inspectionAt: toStringOrNull(row.inspection_at ?? row.inspectionAt ?? row.inspection_date),
    reportReadyAt: toStringOrNull(row.report_ready_at ?? row.reportReadyAt),
    reportAvailable: toBoolean(firstPresent(row.report_available, row.reportAvailable)),
  };
}

export function normalizeClientPortalOrderDetail(row = {}) {
  const order = normalizeClientPortalOrder(row);
  if (!order) return null;

  return {
    ...order,
    loanPurpose: toStringOrNull(row.loan_purpose ?? row.loanPurpose),
    propertyType: toStringOrNull(row.property_type ?? row.propertyType),
    contactName: toStringOrNull(row.contact_name ?? row.contactName),
    reportFileName: toStringOrNull(row.report_file_name ?? row.reportFileName),
    reportDownloadReady: toBoolean(firstPresent(row.report_download_ready, row.reportDownloadReady, row.report_available)),
    reportDownloadUrl: toStringOrNull(row.report_download_url ?? row.reportDownloadUrl),
    milestones: Array.isArray(row.milestones)
      ? row.milestones
          .map((milestone) => ({
            label: toStringOrNull(milestone?.label) || "Progress update",
            date: toStringOrNull(milestone?.date ?? milestone?.at),
            state: toStringOrNull(milestone?.state) || "pending",
          }))
          .filter((milestone) => milestone.label)
      : [],
  };
}

export function normalizeClientPortalDashboard(row = {}) {
  const recentOrders = Array.isArray(row.recent_orders) ? row.recent_orders : [];

  return {
    activeOrderCount: Number(row.active_order_count ?? row.activeOrderCount ?? 0) || 0,
    reportAvailableCount: Number(row.report_available_count ?? row.reportAvailableCount ?? 0) || 0,
    nextDueAt: toStringOrNull(row.next_due_at ?? row.nextDueAt),
    recentOrders: recentOrders.map(normalizeClientPortalOrder).filter(Boolean),
  };
}

export async function getClientPortalDashboard() {
  const { data, error } = await supabase.rpc(CLIENT_PORTAL_DASHBOARD_RPC);
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return normalizeClientPortalDashboard(row || {});
}

export async function listClientPortalOrders() {
  const { data, error } = await supabase.rpc(CLIENT_PORTAL_ORDER_LIST_RPC);
  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeClientPortalOrder)
    .filter(Boolean);
}

export async function getClientPortalOrderDetail(orderKey) {
  const safeOrderKey = toStringOrNull(orderKey);
  if (!safeOrderKey) {
    throw new Error("client_portal_order_key_required");
  }

  const { data, error } = await supabase.rpc(CLIENT_PORTAL_ORDER_DETAIL_RPC, {
    p_order_key: safeOrderKey,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row ? normalizeClientPortalOrderDetail(row) : null;
}

export const clientPortalRpcNames = Object.freeze({
  dashboard: CLIENT_PORTAL_DASHBOARD_RPC,
  listOrders: CLIENT_PORTAL_ORDER_LIST_RPC,
  orderDetail: CLIENT_PORTAL_ORDER_DETAIL_RPC,
});

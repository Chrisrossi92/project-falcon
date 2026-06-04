import supabase from "@/lib/supabaseClient";

const EMPTY_DASHBOARD_SUMMARY = Object.freeze({
  ok: true,
  counts: {
    available_work: 0,
    pending_bids: 0,
    assignment_offers: 0,
    active_assigned_orders: 0,
    submitted_awaiting_review: 0,
    needs_attention: 0,
  },
  actions: [],
});

export async function fetchVendorWorkspaceDashboardSummary() {
  const { data, error } = await supabase.rpc("rpc_vendor_workspace_dashboard_summary");
  if (error) throw error;

  if (!data || typeof data !== "object") {
    return EMPTY_DASHBOARD_SUMMARY;
  }

  return {
    ok: data.ok === true,
    counts: {
      ...EMPTY_DASHBOARD_SUMMARY.counts,
      ...(data.counts && typeof data.counts === "object" ? data.counts : {}),
    },
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
}

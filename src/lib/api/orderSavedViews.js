import supabase from "@/lib/supabaseClient";

function assertFiltersObject(filters) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    throw new TypeError("Saved view filters must be an object.");
  }
  return filters;
}

export async function listOrderSavedViews() {
  const { data, error } = await supabase.rpc("rpc_order_saved_views_list");
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createOrderSavedView(name, filters) {
  const { data, error } = await supabase.rpc("rpc_order_saved_view_create", {
    p_name: name,
    p_filters: assertFiltersObject(filters),
  });
  if (error) throw error;
  return data;
}

export async function updateOrderSavedView(viewId, name, filters) {
  const { data, error } = await supabase.rpc("rpc_order_saved_view_update", {
    p_view_id: viewId,
    p_name: name,
    p_filters: assertFiltersObject(filters),
  });
  if (error) throw error;
  return data;
}

export async function deleteOrderSavedView(viewId) {
  const { data, error } = await supabase.rpc("rpc_order_saved_view_delete", {
    p_view_id: viewId,
  });
  if (error) throw error;
  return data ?? true;
}

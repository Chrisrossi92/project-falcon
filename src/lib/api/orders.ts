// src/lib/api/orders.ts
import supabase from "@/lib/supabaseClient";

export const updateSiteVisitAt = async (orderId: string, newDateTime: string, extras?: {
  address?: string | null;
  appraiserId?: string | null;
}) => {
  // Update the order field (no RPC for site_visit_at yet)
  const { data, error } = await supabase
    .from("orders")
    .update({ site_visit_at: newDateTime })
    .eq("id", orderId)
    .select();

  if (error) {
    console.error("Error updating site visit:", error);
    return null;
  }

  // Mirror to calendar via RPC for uniformity
  try {
    await supabase.rpc("rpc_create_calendar_event", {
      p_event_type: "site_visit",
      p_title: `Site Visit – ${extras?.address || "Subject"}`,
      p_start_at: newDateTime,
      p_end_at: newDateTime,
      p_order_id: orderId,
      p_appraiser_id: extras?.appraiserId ?? null,
      p_location: extras?.address ?? null,
      p_notes: null,
    });
  } catch (e) {
    console.warn("rpc_create_calendar_event (site_visit) failed:", (e as any)?.message);
  }

  return data?.[0] || null;
};

export const fetchSiteVisitAt = async (orderId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select("site_visit_at")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching site visit:", error);
    return null;
  }

  return data;
};


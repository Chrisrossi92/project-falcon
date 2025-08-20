// src/lib/api/calendar.ts
import supabase from "@/lib/supabaseClient";

export async function createEvent(args: {
  eventType: "site_visit" | "due_for_review" | "due_to_client";
  title: string;
  startAt: string; // ISO
  endAt?: string | null;
  orderId?: string | null;
  appraiserId?: string | null;
  location?: string | null;
  notes?: string | null;
}) {
  const { error } = await supabase.rpc("rpc_create_calendar_event", {
    p_event_type: args.eventType,
    p_title: args.title,
    p_start_at: args.startAt,
    p_end_at: args.endAt ?? args.startAt,
    p_order_id: args.orderId ?? null,
    p_appraiser_id: args.appraiserId ?? null,
    p_location: args.location ?? null,
    p_notes: args.notes ?? null,
  });
  if (error) throw new Error(`rpc_create_calendar_event failed: ${error.message}`);
}

export async function listAdminEvents(params?: {
  start?: string; // ISO day start (optional, you can filter client-side)
  end?: string;   // ISO day end
}) {
  // Keep it simple; you can add date filters later with a view or where clauses.
  const { data, error } = await supabase
    .from("v_admin_calendar")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

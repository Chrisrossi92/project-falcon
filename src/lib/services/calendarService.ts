// src/lib/services/calendarService.ts
import supabase from "@/lib/supabaseClient";
import rpcFirst, { RpcResult } from "@/lib/utils/rpcFirst";

export type AdminCalendarRow = {
  order_id: string;
  event_type: "site_visit" | "review_due" | "final_due" | string;
  event_at: string; // ISO
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  order_number: string | null;
  status: string | null;
  client_id: string | null;
  client_name: string | null;
  appraiser_id: string | null;
  appraiser_name: string | null;
};

function asResult<T>(data: T | null, error: any | null): RpcResult<T> {
  return { data, error };
}

export async function listAdminEvents(opts: {
  start: string; // ISO
  end: string;   // ISO
  appraiserId?: string | null;
  limit?: number; // (not used by RPC, but available for future)
}): Promise<AdminCalendarRow[]> {
  const { start, end, appraiserId = null } = opts;

  const { data, error } = await rpcFirst<AdminCalendarRow[]>(
    () =>
      supabase.rpc("rpc_list_admin_events", {
        start_at: start,
        end_at: end,
        only_appraiser: appraiserId,
      }) as unknown as Promise<RpcResult<AdminCalendarRow[]>>,
    async () => {
      // Fallback: query the view directly
      let q = supabase
        .from("v_admin_calendar")
        .select("*")
        .gte("event_at", start)
        .lt("event_at", end)
        .order("event_at", { ascending: true });

      if (appraiserId) q = q.eq("appraiser_id", appraiserId);

      const { data: rows, error: err } = await q;
      return asResult((rows || []) as AdminCalendarRow[], err);
    }
  );

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

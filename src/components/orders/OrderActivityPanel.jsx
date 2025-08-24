import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

export default function OrderActivityPanel({ orderId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel;

    async function fetchRows() {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        if (!error) setRows(data || []);
        setLoading(false);
      }
    }

    fetchRows();

    // subscribe AFTER initial fetch
    channel = supabase
      .channel(`activity:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_log",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRows((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRows((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === "DELETE") {
            setRows((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
      } catch {
        /* no-op */
      }
    };
  }, [orderId]);

  if (loading) return <div className="text-sm text-gray-500 p-2">Loading…</div>;
  if (!rows.length) return <div className="text-sm text-gray-500 p-2">No activity yet.</div>;

  return (
    <div className="space-y-3 p-2">
      {rows.map((r) => (
        <div key={r.id} className="text-sm">
          <div className="font-medium">
            {(r.action || r.event_type || "event").replaceAll("_", " ")}
          </div>
          {r.message ? (
            <div className="text-gray-600">{r.message}</div>
          ) : null}
          <div className="text-xs text-gray-400">
            {new Date(r.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}


















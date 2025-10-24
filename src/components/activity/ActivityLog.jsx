import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";

const LABEL = {
  order_created: "Order created",
  status_changed: "Status changed",
  dates_updated: "Dates updated",
  assignee_changed: "Assignee changed",
  fee_changed: "Fee changed",
  note: "Note",
  note_added: "Note",
};
const icon = (t) =>
  t === "order_created" ? "🆕" :
  t === "status_changed" ? "🔁" :
  t === "dates_updated"  ? "📅" :
  t === "assignee_changed"? "👤" :
  t === "fee_changed"     ? "💵" : "📝";
const fmt = (ts) => (!ts ? "—" : isNaN(new Date(ts)) ? "—" : new Date(ts).toLocaleString());

export default function ActivityLog({ orderId }) {
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then((res) => setMe(res?.data?.user?.id || null));
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orderId) return;
      const res = await supabase
        .from("activity_log")
        .select("id, order_id, event_type, action, message, role, user_id, actor_name, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (res.error) {
        console.warn("activity load:", res.error.message);
        if (mounted) setRows([]);
        return;
      }
      const out = (res.data || []).map((r) => {
        const type = (r.event_type || r.action || "").toLowerCase();
        const who =
          r.user_id && me && r.user_id === me ? "You" : r.actor_name || (r.role || "User");
        return {
          id: r.id,
          type,
          label: LABEL[type] || (type ? type.replace(/_/g, " ") : "Event"),
          who,
          msg: r.message || "",
          when: r.created_at,
          mine: r.user_id && me ? r.user_id === me : false,
        };
      });
      if (mounted) setRows(out);
    })();
    return () => { mounted = false; };
  }, [orderId, me]);

  return (
    <div className="rounded border bg-white p-2">
      <div className="font-medium mb-2">Activity</div>
      <div className="max-h-[42vh] overflow-auto pr-1">
        {!rows.length ? (
          <div className="p-2 text-xs text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id} className={`flex ${e.mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg border p-2 text-sm ${e.mine ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">{icon(e.type)} {e.label}</div>
                    <div className="text-[11px] text-muted-foreground">{fmt(e.when)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">By: {e.who}</div>
                  {e.msg ? <div className="mt-1 text-[13px] whitespace-pre-wrap break-words">{e.msg}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}



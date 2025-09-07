// src/components/orders/view/OrderActivity.jsx
import React, { useEffect, useState } from "react";
import { listOrderActivity, logNote, subscribeOrderActivity } from "@/lib/services/activityService";

const icon = (t) =>
  t === "order_created"   ? "🆕" :
  t === "status_changed"  ? "🔁" :
  t === "dates_updated"   ? "📅" :
  t === "assignee_changed"? "👤" :
  t === "fee_changed"     ? "💵" :
  t === "note_added"      ? "📝" : "•";

export default function OrderActivity({ orderId }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [note, setNote] = useState("");

  async function refresh() {
    try {
      const rows = await listOrderActivity(orderId);
      setItems(rows);
    } catch (e) {
      setErr(e);
    }
  }

  useEffect(() => {
    if (!orderId) return;
    setErr(null);
    refresh();

    const unsub = subscribeOrderActivity(orderId, (row) => {
      setItems((prev) => {
        if (!row?.id) return prev;
        if (prev.some((r) => r.id === row.id)) {
          // replace if we already have it (e.g., UPDATE arrives after INSERT)
          return prev.map((r) => (r.id === row.id ? row : r));
        }
        return [row, ...prev];
      });
    });
    return () => unsub();
  }, [orderId]);

  async function onAddNote() {
    const text = note.trim();
    if (!text) return;
    setBusy(true);
    setErr(null);
    try {
      // optimistic add
      setItems((prev) => [
        {
          id: `local-${Date.now()}`,
          order_id: orderId,
          event_type: "note_added",
          created_at: new Date().toISOString(),
          actor_name: "You",
          detail: { text },
        },
        ...prev,
      ]);
      setNote("");
      await logNote(orderId, text);
      // force a one-shot refresh in case realtime is disabled
      refresh();
    } catch (e) {
      setErr(e);
      refresh(); // reset optimistic state if server rejected
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Activity</div>

      {err && (
        <div className="text-red-600 text-sm border rounded p-2">
          Couldn’t load activity: {err.message}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="text-sm border rounded p-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {icon(it.event_type)} {it.event_type.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(it.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  By: {it.actor_name || "—"}
                </div>
                {it.detail && Object.keys(it.detail).length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground break-words">
                    {Object.entries(it.detail).map(([k, v]) => (
                      <span key={k} className="inline-block mr-3">
                        <span className="uppercase tracking-wide">{k}</span>: {String(v ?? "—")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single add-note input */}
      <div className="flex items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="flex-1 rounded border px-3 py-2 text-sm"
          disabled={busy}
        />
        <button
          onClick={onAddNote}
          className="border rounded px-3 py-2 text-sm disabled:opacity-60"
          disabled={busy}
        >
          Post
        </button>
      </div>
    </div>
  );
}




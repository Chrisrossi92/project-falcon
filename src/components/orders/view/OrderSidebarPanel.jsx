import React, { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import QuickActionsDrawerPanel from "@/components/orders/view/QuickActionsDrawerPanel"; // reviewer/appraiser actions
import { useRole } from "@/lib/hooks/useRole";

// Map terse actions to friendly labels
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
  t === "fee_changed"     ? "💵" :
  t === "note" || t === "note_added" ? "📝" : "•";

function fmtWhen(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d) ? "—" : d.toLocaleString();
}

export default function OrderSidebarPanel({ order, orderId, onRefresh }) {
  const id = order?.id ?? orderId ?? null;
  const { isAdmin, isReviewer } = useRole() || {};
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState(null); // current auth user id

  // load self (for "mine" alignment)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMe(data?.user?.id || null);
    })();
  }, []);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Flexible select: if actor_name column exists in your view, select it; if not, we’ll infer below.
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, order_id, event_type, action, message, detail, role, user_id, actor_name, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Normalize each entry -> { id, who, when, type, msg, mine }
      const norm = (data || []).map((r) => {
        const type = (r.event_type || r.action || "").toLowerCase();
        const who =
          r.user_id && me && r.user_id === me
            ? "You"
            : r.actor_name || (r.role ? r.role.charAt(0).toUpperCase() + r.role.slice(1) : "User");
        const msg =
          r.message ||
          (r.detail && typeof r.detail === "object" ? JSON.stringify(r.detail) : "") ||
          "";

        return {
          id: r.id,
          when: r.created_at,
          who,
          type,
          label: LABEL[type] || (type ? type.replace(/_/g, " ") : "event"),
          msg,
          mine: r.user_id && me ? r.user_id === me : false,
        };
      });

      setEntries(norm);
    } catch (e) {
      console.warn("activity fetch error:", e?.message || e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [id, me]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  async function postNote() {
    if (!id || !note.trim()) return;
    setPosting(true);
    try {
      // optimistic add
      const nowISO = new Date().toISOString();
      const mineBubble = {
        id: `local-${Date.now()}`,
        when: nowISO,
        who: "You",
        type: "note",
        label: "Note",
        msg: note.trim(),
        mine: true,
      };
      setEntries((prev) => [mineBubble, ...prev]);
      setNote("");

      // insert
      const { data: userInfo } = await supabase.auth.getUser();
      const uid = userInfo?.user?.id ?? null;
      const { error } = await supabase.from("activity_log").insert([{
        order_id: id,
        event_type: "note_added",
        action: "note",
        message: mineBubble.msg,
        role: isReviewer ? "reviewer" : isAdmin ? "admin" : "appraiser",
        user_id: uid,
        actor_name: userInfo?.user?.email || null, // if you have display name, use that
      }]);
      if (error) throw error;

      // refresh to reconcile (or rely on realtime if enabled)
      await fetchActivity();
      onRefresh?.();
    } catch (e) {
      alert(e?.message || "Failed to post note");
      // roll back optimistic add
      fetchActivity();
    } finally {
      setPosting(false);
    }
  }

  if (!id) return <div className="p-3 text-xs text-muted-foreground">Loading activity…</div>;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* reviewer/appraiser quick actions (Approve/Revisions/Send to Review) */}
      <QuickActionsDrawerPanel
        orderId={id}
        onAfterChange={() => { fetchActivity(); onRefresh?.(); }}
        layout="bar"
      />

      <div className="flex items-center justify-between">
        <div className="font-medium">Activity</div>
        <button
          type="button"
          data-no-drawer
          className="px-2 py-1 rounded border text-xs"
          onClick={(e) => { e.stopPropagation(); fetchActivity(); }}
          disabled={loading}
          title="Reload activity"
        >
          Refresh
        </button>
      </div>

      {/* Thread view */}
      <div className="rounded border bg-white max-h-[42vh] overflow-auto p-2">
        {loading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="space-y-2">
            {entries.map((it) => (
              <li key={it.id} className={`flex ${it.mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg border p-2 text-sm ${
                    it.mine ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">
                      {icon(it.type)} {it.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{fmtWhen(it.when)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">By: {it.who}</div>
                  {it.msg ? (
                    <div className="mt-1 text-[13px] whitespace-pre-wrap break-words">{it.msg}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* add note */}
      <div className="flex items-start gap-2">
        <textarea
          className="flex-1 border rounded px-2 py-1 text-sm"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
        />
        <button
          type="button"
          data-no-drawer
          className="px-3 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          onClick={postNote}
          disabled={posting || !note.trim()}
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}













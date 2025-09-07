import React, { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";
import { updateOrderStatus } from "@/lib/services/ordersService";
import { useRole } from "@/lib/hooks/useRole";

function ReviewQuickActions({ orderId, onAfterChange, enabled }) {
  if (!orderId || !enabled) return null;
  async function setStatus(next, label) {
    const ok = window.confirm(`Set status to "${label}"?`);
    if (!ok) return;
    await updateOrderStatus(orderId, next);
    onAfterChange?.();
  }
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        data-no-drawer
        className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
        onClick={(e) => { e.stopPropagation(); setStatus("ready_to_send", "Ready to Send"); }}
        title="Approve review → Ready to Send"
      >
        Approve
      </button>
      <button
        type="button"
        data-no-drawer
        className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
        onClick={(e) => { e.stopPropagation(); setStatus("revisions", "Revisions"); }}
        title="Request revisions"
      >
        Request Revisions
      </button>
    </div>
  );
}

// Optional helper (best-effort logging)
let logActivity;
try { ({ logActivity } = require("@/lib/logactivity")); } catch {}

function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return isNaN(d) ? "—" : d.toLocaleString();
}

export default function OrderSidebarPanel({ order, orderId, onRefresh }) {
  const id = order?.id ?? orderId ?? null;
  const { isAdmin, isReviewer } = useRole() || {};

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [posting, setPosting] = useState(false);
  const [note, setNote] = useState("");

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, action, message, created_at, role, user_id")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setEntries(data || []);
    } catch (e) {
      console.warn("activity fetch error:", e?.message || e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  async function postNote() {
    if (!id || !note.trim()) return;
    setPosting(true);
    try {
      if (typeof logActivity === "function") {
        await logActivity({
          order_id: id,
          role: isReviewer ? "reviewer" : isAdmin ? "admin" : "appraiser",
          action: "note",
          context: { comment: note.trim() },
          visible_to: ["admin", "reviewer", "appraiser"],
        });
      } else {
        const { data: userInfo } = await supabase.auth.getUser();
        const uid = userInfo?.user?.id ?? null;
        const { error } = await supabase.from("activity_log").insert([{
          order_id: id, action: "note", message: note.trim(),
          role: isReviewer ? "reviewer" : isAdmin ? "admin" : "appraiser",
          user_id: uid,
        }]);
        if (error) throw error;
      }
      setNote("");
      await fetchActivity();
      onRefresh?.();
    } catch (e) {
      alert(e?.message || "Failed to post note");
    } finally {
      setPosting(false);
    }
  }

  if (!id) return <div className="p-3 text-xs text-muted-foreground">Loading activity…</div>;

  return (
    <div className="flex flex-col gap-2 h-full">
      <ReviewQuickActions
        orderId={id}
        enabled={!isAdmin && isReviewer}   // ✅ reviewer-only
        onAfterChange={() => { fetchActivity(); onRefresh?.(); }}
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

      <div className="rounded border bg-white max-h-[40vh] overflow-auto">
        {loading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="divide-y">
            {entries.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.action}</div>
                  <div className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</div>
                </div>
                {r.message && <div className="text-[13px] mt-1 whitespace-pre-wrap">{r.message}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
       </div>
  );
}












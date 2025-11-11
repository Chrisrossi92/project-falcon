// src/components/activity/ActivityLog.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listOrderActivity, subscribeOrderActivity } from "@/lib/services/activityService";
import ActivityNoteForm from "@/components/activity/ActivityNoteForm";

const LABEL = {
  note_added: "Note",
  order_created: "Order created",
  status_changed: "Status changed",
  dates_updated: "Dates updated",
  assignee_changed: "Assignee changed",
  fee_changed: "Fee changed",
};

function Row({ item }) {
  const when = item?.created_at ? new Date(item.created_at).toLocaleString() : "—";
  const by =
    item?.created_by_name?.trim?.() ||
    item?.created_by_email?.trim?.() ||
    item?.created_by ||
    "User";
  const label = LABEL[item?.event_type] || item?.event_type || "event";
  const msg = item?.message || "";

  return (
    <div className="flex items-start justify-between py-2">
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        {msg ? <div className="text-xs text-gray-700 mt-0.5">{msg}</div> : null}
        <div className="text-xs text-gray-500 mt-1">By: {by}</div>
      </div>
      <div className="text-xs text-gray-500 whitespace-nowrap ml-3">{when}</div>
    </div>
  );
}

export default function ActivityLog({
  orderId,
  className = "",
  showComposer = true,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const viewportRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setErr("");
    try {
      const list = await listOrderActivity(orderId);
      setRows(list || []);
    } catch (e) {
      setErr(e?.message || "Failed to load activity");
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 0);
    }
  }, [orderId, scrollToBottom]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orderId) return;
    const off = subscribeOrderActivity(orderId, (row) => {
      setRows((curr) => [...curr, row].slice(-500));
      setTimeout(scrollToBottom, 0);
    });
    return () => off?.();
  }, [orderId, scrollToBottom]);

  const content = useMemo(() => {
    if (loading) return <div className="text-sm text-gray-600">Loading…</div>;
    if (err) return <div className="text-sm text-red-600">Failed: {err}</div>;
    if (!rows.length) return <div className="text-sm text-gray-600">No activity yet.</div>;
    return <div className="divide-y">{rows.map((r) => <Row key={r.id || `${r.event_type}-${r.created_at}`} item={r} />)}</div>;
  }, [loading, err, rows]);

  // src/components/activity/ActivityLog.jsx
// …imports & rest unchanged…

function deriveNameFromEmail(email) {
  if (!email) return null;
  const local = String(email).split("@")[0] || "";
  if (!local) return null;
  // Title-case the local part (simple, readable)
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function Row({ item }) {
  const when = item?.created_at ? new Date(item.created_at).toLocaleString() : "—";
  // Prefer explicit name; else derive from email; else fallback id; else "User"
  const by =
    (item?.created_by_name && item.created_by_name.trim()) ||
    deriveNameFromEmail(item?.created_by_email) ||
    item?.created_by ||
    "User";

  const label = LABEL[item?.event_type] || item?.event_type || "event";
  const msg = item?.message || "";

  return (
    <div className="flex items-start justify-between py-2">
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        {msg ? <div className="text-xs text-gray-700 mt-0.5">{msg}</div> : null}
        <div className="text-xs text-gray-500 mt-1">By: {by}</div>
      </div>
      <div className="text-xs text-gray-500 whitespace-nowrap ml-3">{when}</div>
    </div>
  );
}


  return (
    <div className={className}>
      {/* Fixed height with internal scroll so the drawer doesn't grow */}
      <div ref={viewportRef} className="rounded border bg-white p-3 h-64 overflow-y-auto">
        {content}
      </div>
      {showComposer && (
        <div className="mt-3">
          <ActivityNoteForm orderId={orderId} />
        </div>
      )}
    </div>
  );
}






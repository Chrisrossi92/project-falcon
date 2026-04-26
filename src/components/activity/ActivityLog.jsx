// ActivityLog.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listOrderActivity, subscribeOrderActivity } from "@/lib/services/activityService";
import ActivityNoteForm from "@/components/activity/ActivityNoteForm";
import Legend from "./Legend";
import DaySection from "./DaySection";
import { dayKey, dayLabel, displayNameFrom } from "./utils";

// treat these as system events (no user badge)
const SYSTEM_TYPES = new Set([
  "order_created",
  "status_changed",
  "dates_updated",
  "assignee_changed",
  "fee_changed",
]);

export default function ActivityLog({
  orderId,
  order = null,
  className = "",
  showComposer = true,
  height = 520, // fixed-height viewport
  fill = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Legend/filter state
  const [showSystem, setShowSystem] = useState(true);
  const [activeUserKey, setActiveUserKey] = useState(null); // null = all users

  const viewportRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true); setErr("");
    try {
      const list = await listOrderActivity(orderId);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to load activity");
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 0);
    }
  }, [orderId, scrollToBottom]);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    setErr("");
    try {
      const list = await listOrderActivity(orderId);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.message || "Failed to load activity");
    } finally {
      setTimeout(scrollToBottom, 0);
    }
  }, [orderId, scrollToBottom]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orderId) return;
    const off = subscribeOrderActivity(orderId, (row) => {
      setRows((curr) => [...curr, row].slice(-1000));
      setTimeout(scrollToBottom, 0);
    });
    return () => off?.();
  }, [orderId, scrollToBottom]);

  // Build participants list from the data (exclude system events)
  const participants = useMemo(() => {
    const map = new Map();
    for (const it of rows) {
      if (SYSTEM_TYPES.has(it?.event_type)) continue;
      const key = it?.created_by_email || it?.created_by || displayNameFrom(it?.created_by_name, it?.created_by_email, it?.created_by);
      const name = displayNameFrom(it?.created_by_name, it?.created_by_email, it?.created_by);
      const email = it?.created_by_email || null;
      if (!map.has(key)) map.set(key, { key, name, email });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Filter + group by day
const grouped = useMemo(() => {
  const includeSystem = showSystem && !activeUserKey; // <-- system only when no user filter
  const keep = [];

  for (const it of rows) {
    const isSystem = SYSTEM_TYPES.has(it?.event_type);
    if (isSystem && !includeSystem) continue;

    if (!isSystem && activeUserKey) {
      const key =
        it?.created_by_email ||
        it?.created_by ||
        displayNameFrom(it?.created_by_name, it?.created_by_email, it?.created_by);
      if (key !== activeUserKey) continue;
    }
    keep.push(it);
  }

  const map = new Map();
  for (const it of keep) {
    const k = dayKey(it?.created_at);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a?.created_at || 0).getTime() -
        new Date(b?.created_at || 0).getTime()
    );
  }
  return Array.from(map.entries()).sort(([a],[b]) => (a < b ? -1 : a > b ? 1 : 0));
}, [rows, showSystem, activeUserKey]);


  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-500">
          Loading activity...
        </div>
      );
    }
    if (err) {
      return (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load activity: {err}
        </div>
      );
    }
    if (!rows.length) {
      return (
        <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-500">
          No activity yet.
        </div>
      );
    }
    if (!grouped.length) {
      return (
        <div className="flex h-full min-h-40 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-500">
          No events match the current filters.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {grouped.map(([k, list]) => {
          const label = list[0]?.created_at ? dayLabel(list[0].created_at) : k;
          return <DaySection key={k} label={label} items={list} />;
        })}
      </div>
    );
  }, [grouped, loading, err, rows]);

  // Legend callbacks
  const handleToggleUser = (key) => {
    setActiveUserKey((curr) => (curr === key ? null : key));
  };
  const handleToggleSystem = () => setShowSystem((v) => !v);
  const handleClear = () => {
    setActiveUserKey(null);
    setShowSystem(true);
  };
  const viewportStyle = { height, maxHeight: height };

  return (
    <div className={`${fill ? "flex min-h-0 flex-col" : ""} ${className}`}>
      <Legend
        participants={participants}
        activeUserKey={activeUserKey}
        onToggleUser={handleToggleUser}
        showSystem={showSystem}
        onToggleSystem={handleToggleSystem}
        onClear={handleClear}
        userActive={!!activeUserKey}
      />

      {/* Fixed-height, scrollable viewport */}
      <div
        ref={viewportRef}
        style={viewportStyle}
        className={`${fill ? "min-h-0 flex-1" : ""} overflow-y-auto rounded-md border border-slate-200 bg-slate-50/40 p-3`}
      >
        {content}
      </div>

      {showComposer && (
        <div className="mt-3">
          <ActivityNoteForm orderId={orderId} order={order} onSaved={refresh} />
        </div>
      )}
    </div>
  );
}







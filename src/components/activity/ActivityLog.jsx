// ActivityLog.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listOrderActivity, subscribeOrderActivity } from "@/lib/services/activityService";
import ActivityNoteForm from "@/components/activity/ActivityNoteForm";
import Legend from "./Legend";
import DaySection from "./DaySection";
import {
  dayKey,
  dayLabel,
  displayNameFrom,
  getActivityActorColorSeed,
  isSystemEvent,
  resolveActivityActor,
} from "./utils";

function activityTimestampMs(item) {
  const value = new Date(item?.created_at || "").getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function compareActivityChronologically(a, b) {
  const diff = activityTimestampMs(a) - activityTimestampMs(b);
  if (diff !== 0) return diff;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

const HUMAN_ACTIVITY_TYPES = new Set(["note", "note_added"]);

function stableDetailString(value) {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableDetailString(item) || String(item ?? "")).join(",")}]`;
  }
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableDetailString(value[key]) || String(value[key] ?? "")}`)
    .join("|");
}

function activityType(item) {
  return item?.event_type || item?.action || "";
}

function activityContentKey(item) {
  return item?.message || item?.body || item?.title || "";
}

function parseJsonDetail(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function systemPayloadKey(item) {
  const detailKey = stableDetailString(item?.detail);
  if (detailKey) return detailKey;

  const content = activityContentKey(item);
  const parsed = parseJsonDetail(content);
  return stableDetailString(parsed) || content;
}

function systemActivityFingerprint(item, fallbackOrderId) {
  return [
    "system",
    item?.order_id || fallbackOrderId || "",
    activityType(item),
    item?.created_at || "",
    systemPayloadKey(item),
  ].join("::");
}

function activityRowScore(item) {
  return [
    item?.detail && typeof item.detail === "object" ? 4 : 0,
    item?.order_id ? 2 : 0,
    item?.actor_user_id || item?.actor_id ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);
}

function preferActivityRow(current, next) {
  return activityRowScore(next) > activityRowScore(current) ? next : current;
}

function normalizeActivityRows(items, fallbackOrderId) {
  const rows = Array.isArray(items) ? items : [];
  const kept = [];
  const byId = new Map();
  const bySystemFingerprint = new Map();

  rows.forEach((item) => {
    const idKey = item?.id ? `id:${item.id}` : null;
    const type = activityType(item);
    const isHuman = HUMAN_ACTIVITY_TYPES.has(type);

    if (idKey && byId.has(idKey)) {
      const existingIndex = byId.get(idKey);
      kept[existingIndex] = preferActivityRow(kept[existingIndex], item);
      return;
    }

    const systemFingerprint = isHuman ? null : systemActivityFingerprint(item, fallbackOrderId);
    if (systemFingerprint && bySystemFingerprint.has(systemFingerprint)) {
      const existingIndex = bySystemFingerprint.get(systemFingerprint);
      kept[existingIndex] = preferActivityRow(kept[existingIndex], item);
      if (idKey) byId.set(idKey, existingIndex);
      return;
    }

    const nextIndex = kept.length;
    kept.push(item);
    if (idKey) byId.set(idKey, nextIndex);
    if (systemFingerprint) bySystemFingerprint.set(systemFingerprint, nextIndex);
  });

  return kept.sort(compareActivityChronologically);
}

function mergeActivityRows(current, next, fallbackOrderId) {
  return normalizeActivityRows([
    ...(Array.isArray(current) ? current : []),
    ...(Array.isArray(next) ? next : [next]),
  ], fallbackOrderId).slice(-1000);
}

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
      setRows(normalizeActivityRows(list, orderId));
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
      setRows(normalizeActivityRows(list, orderId));
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
      setRows((curr) => mergeActivityRows(curr, row, orderId));
      setTimeout(scrollToBottom, 0);
    });
    return () => off?.();
  }, [orderId, scrollToBottom]);

  // Build participants list from the data (exclude system events)
  const participants = useMemo(() => {
    const map = new Map();
    for (const it of rows) {
      if (isSystemEvent(it?.event_type)) continue;
      const actor = resolveActivityActor(it);
      const key = it?.created_by_email || it?.created_by || displayNameFrom(it?.created_by_name, it?.created_by_email, it?.created_by);
      const name = actor.shortName || displayNameFrom(it?.created_by_name, it?.created_by_email, it?.created_by);
      const colorSeed = getActivityActorColorSeed(actor);
      if (!map.has(key)) map.set(key, { key, name, email: colorSeed, colorSeed });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  // Filter + group by day
  const grouped = useMemo(() => {
    const includeSystem = showSystem && !activeUserKey; // <-- system only when no user filter
    const keep = [];

    for (const it of rows) {
      const isSystem = isSystemEvent(it?.event_type);
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
      list.sort(compareActivityChronologically);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
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

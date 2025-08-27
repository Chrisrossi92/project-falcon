// src/components/activity/ActivityLog.jsx
import React, { useCallback, useEffect, useState } from "react";
import { fetchOrderActivity, subscribeOrderActivity } from "@/lib/services/activityService";

function Row({ item }) {
  const when = item?.created_at ? new Date(item.created_at).toLocaleString() : "—";
  const label = item?.event_type || "event";
  const msg = item?.message || "";
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <div className="text-sm">
        <div className="font-medium">{label}</div>
        {msg ? <div className="text-gray-600">{msg}</div> : null}
      </div>
      <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">{when}</div>
    </div>
  );
}

/**
 * Props:
 *  - orderId: string (required for order-scoped log)
 *  - limit?: number
 */
export default function ActivityLog({ orderId, limit = 50 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const data = await fetchOrderActivity(orderId, { limit });
      setRows(data || []);
    } catch (e) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orderId, limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = subscribeOrderActivity(orderId, load);
    return unsubscribe;
  }, [orderId, load]);

  return (
    <div className="bg-white rounded-2xl shadow border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity</h2>
        <button
          className="px-2 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : err ? (
        <div className="text-sm text-red-600">Failed: {err}</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-600">No activity yet.</div>
      ) : (
        <div className="divide-y">
          {rows.map((r) => <Row key={r.id} item={r} />)}
        </div>
      )}
    </div>
  );
}

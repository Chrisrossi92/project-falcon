// src/components/orders/OrderActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import {
  listOrderActivity,
  subscribeOrderActivity,
} from "@/lib/services/activityService";
import {
  fetchUsersByAuthIds,
  displayNameFromUser,
  shortId,
} from "@/lib/services/userCache";

function Line({ label, value }) {
  if (!value) return null;
  return (
    <div className="text-xs text-gray-600">
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}

function prettyEvent(e) {
  const t = String(e || "").toLowerCase();
  if (t === "approve") return "approved";
  if (t === "request_revisions") return "requested revisions";
  if (t === "complete_override") return "completed (override)";
  if (t === "complete") return "completed";
  if (t === "review_start") return "review started";
  if (t === "send_to_client") return "sent to client";
  if (t.startsWith("set_status")) return "status changed";
  if (t === "note") return "note";
  return t || "activity";
}

export default function OrderActivity({ orderId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState(null);
  const [actorMap, setActorMap] = useState({}); // auth_id -> user row
  const [uid, setUid] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listOrderActivity(orderId, { limit: 100 });
      setRows(data);

      // collect actors and resolve to names (best-effort under RLS)
      const ids = [
        ...new Set(
          data.map((r) => r.user_id || r.created_by).filter(Boolean).map(String)
        ),
      ];
      if (ids.length) {
        const map = await fetchUsersByAuthIds(ids);
        setActorMap(map);
      } else {
        setActorMap({});
      }
    } catch (e) {
      setRows([]);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUid(data?.user?.id ?? null);
      } catch {
        if (!cancelled) setUid(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!orderId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    refresh();
    const unsub = subscribeOrderActivity(orderId, refresh);
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [String(orderId || "")]);

  const items = useMemo(() => rows || [], [rows]);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="mb-2 text-sm font-medium">Activity</div>

      {loading && (
        <div className="min-h-[10vh] flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
            <span className="text-sm">Loading activity…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Couldn’t load activity{error?.message ? `: ${error.message}` : ""}.
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded border bg-white p-3 text-xs text-gray-500">
          No activity yet.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="divide-y">
          {items.map((r) => {
            const actorId = String(r.user_id || r.created_by || "");
            const actorRow = actorMap[actorId];
            const actorName =
              actorId && uid && actorId === uid
                ? "You"
                : displayNameFromUser(actorRow) ||
                  (actorId ? `User ${shortId(actorId)}` : "—");

            return (
              <div key={r.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">
                    {prettyEvent(r.event_type || r.event || r.action)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </div>
                </div>
                <Line label="By" value={actorName} />
                <Line label="Message" value={r.message || r.note} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


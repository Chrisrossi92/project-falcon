import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabaseClient";

const STATE_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "seen", label: "Seen" },
  { key: "dismissed", label: "Dismissed" },
];

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "workflow", label: "Workflow" },
  { key: "communication", label: "Communication / Notes" },
  { key: "completed", label: "Completed / Cleared" },
  { key: "system", label: "System / Other" },
];

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function notificationState(notification) {
  if (notification?.dismissed_at) return "dismissed";
  if (notification?.read_at) return "seen";
  return "unread";
}

function stateLabelFor(notification) {
  const state = notificationState(notification);
  if (state === "dismissed") return "Dismissed";
  if (state === "seen") return "Seen";
  return "Unread";
}

function stateClassFor(notification) {
  const state = notificationState(notification);
  if (state === "dismissed") return "border-slate-200 bg-slate-100 text-slate-500";
  if (state === "seen") return "border-slate-200 bg-white text-slate-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function typeInfoFor(notification) {
  const type = String(notification?.type || "").toLowerCase();
  const category = String(notification?.category || "").toLowerCase();
  const title = String(notification?.title || "").toLowerCase();
  const body = String(notification?.body || "").toLowerCase();
  const value = `${type} ${category} ${title} ${body}`;

  if (/(completed|complete|cleared|review_cleared|ready_for_client)/.test(value)) {
    return {
      key: "completed",
      label: "Completed / Cleared",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      accent: "border-l-emerald-500",
    };
  }
  if (/(workflow|sent_to_review|sent_back|revision|review|approval|ready)/.test(value)) {
    return {
      key: "workflow",
      label: "Workflow",
      badge: "border-orange-200 bg-orange-50 text-orange-700",
      accent: "border-l-orange-500",
    };
  }
  if (/(note|communication|message|comment)/.test(value)) {
    return {
      key: "communication",
      label: "Communication / Notes",
      badge: "border-blue-200 bg-blue-50 text-blue-700",
      accent: "border-l-blue-500",
    };
  }
  return {
    key: "system",
    label: "System / Other",
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    accent: "border-l-slate-400",
  };
}

function orderNumberFor(notification) {
  return notification?.payload?.order_number || notification?.order_number || null;
}

function payloadText(notification) {
  if (!notification?.payload) return "";
  try {
    return JSON.stringify(notification.payload);
  } catch {
    return "";
  }
}

function searchableText(notification) {
  return [
    notification?.title,
    notification?.body,
    notification?.type,
    notification?.category,
    orderNumberFor(notification),
    payloadText(notification),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("rpc_get_notifications", { p_limit: 100 });
    if (error) {
      console.error("Activity loadNotifications error", error);
      setError(error);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const state = notificationState(item);
      const type = typeInfoFor(item);

      if (stateFilter !== "all" && state !== stateFilter) return false;
      if (typeFilter !== "all" && type.key !== typeFilter) return false;
      if (query && !searchableText(item).includes(query)) return false;

      return true;
    });
  }, [items, search, stateFilter, typeFilter]);

  const openItem = (notification) => {
    if (notification?.link_path) {
      navigate(notification.link_path);
      return;
    }
    if (notification?.order_id) {
      navigate(`/orders/${notification.order_id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Activity</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your notification history, workflow updates, and communication summaries.
          </p>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, body, order number, or payload"
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {STATE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStateFilter(filter.key)}
                className={`h-8 rounded-md border px-3 text-xs font-medium ${
                  stateFilter === filter.key
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {TYPE_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">History</h2>
          <span className="text-xs text-slate-500">
            {filteredItems.length} of {items.length}
          </span>
        </div>

        {loading && (
          <div className="p-6 text-sm text-slate-500">Loading activity history...</div>
        )}

        {!loading && error && (
          <div className="p-6 text-sm text-rose-600">Failed to load activity history.</div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="p-6 text-sm text-slate-500">No matching activity found.</div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <div className="divide-y">
            {filteredItems.map((notification) => {
              const state = notificationState(notification);
              const type = typeInfoFor(notification);
              const orderNumber = orderNumberFor(notification);
              const isOpenable = Boolean(notification?.link_path || notification?.order_id);

              return (
                <article
                  key={notification.id}
                  className={`border-l-4 px-4 py-4 ${type.accent} ${
                    state === "unread" ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stateClassFor(notification)}`}>
                          {stateLabelFor(notification)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${type.badge}`}>
                          {type.label}
                        </span>
                        {orderNumber && (
                          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {orderNumber}
                          </span>
                        )}
                      </div>

                      <h3 className={`mt-2 text-sm leading-5 ${state === "unread" ? "font-semibold text-slate-950" : "font-medium text-slate-700"}`}>
                        {notification.title || notification.type || "Notification"}
                      </h3>

                      {(notification.body || notification.payload?.message) && (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                          {notification.body || notification.payload?.message}
                        </p>
                      )}

                      {notification.payload?.note_text && (
                        <p className="mt-2 max-w-3xl rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                          {notification.payload.note_text}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      {notification.created_at && (
                        <time className="text-xs text-slate-500" dateTime={notification.created_at}>
                          {formatDateTime(notification.created_at)}
                        </time>
                      )}
                      {isOpenable && (
                        <button
                          type="button"
                          onClick={() => openItem(notification)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

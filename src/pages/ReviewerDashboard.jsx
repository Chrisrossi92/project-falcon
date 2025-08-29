// src/pages/ReviewerDashboard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/hooks/useOrders";

function Bucket({ title, items }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="grid gap-2">
        {items.length === 0 ? (
          <div className="rounded border bg-white p-3 text-sm text-gray-500">Nothing here.</div>
        ) : (
          items.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="block rounded border hover:border-gray-300 p-3">
              <div className="flex items-center justify-between">
                <div className="truncate font-medium">{o.address || "Order"} {o.order_number ? `• #${o.order_number}` : ""}</div>
                <div className="text-xs text-gray-500">
                  {o.due_date ? new Date(o.due_date).toLocaleDateString() : ""}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {o.client_name || "—"} {o.status ? `• ${String(o.status).replaceAll("_", " ")}` : ""}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function ReviewerDashboard() {
  const { data = [], loading, error } = useOrders();

  const kpis = useMemo(() => {
    const t = data.length;
    const inReview = data.filter((o) => String(o.status || "").toLowerCase() === "in_review").length;
    const revisions = data.filter((o) => String(o.status || "").toLowerCase() === "revisions").length;
    const ready = data.filter((o) => String(o.status || "").toLowerCase() === "ready_to_send").length;
    return { t, inReview, revisions, ready };
  }, [data]);

  const inReview = useMemo(
    () => data.filter((o) => String(o.status || "").toLowerCase() === "in_review"),
    [data]
  );
  const revisions = useMemo(
    () => data.filter((o) => String(o.status || "").toLowerCase() === "revisions"),
    [data]
  );
  const ready = useMemo(
    () => data.filter((o) => String(o.status || "").toLowerCase() === "ready_to_send"),
    [data]
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Reviewer Dashboard</h1>
        <p className="text-sm text-gray-600">
          {loading ? "Loading…" : error ? `Error: ${error.message}` : "Your current queue & statuses"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">My Orders</div>
          <div className="text-2xl font-semibold">{kpis.t}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">In Review</div>
          <div className="text-2xl font-semibold">{kpis.inReview}</div>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <div className="text-xs text-gray-500">Ready to Send</div>
          <div className="text-2xl font-semibold">{kpis.ready}</div>
        </div>
      </div>

      {/* Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Bucket title="In Review" items={inReview} />
        <Bucket title="Revisions" items={revisions} />
        <Bucket title="Ready to Send" items={ready} />
      </div>
    </div>
  );
}










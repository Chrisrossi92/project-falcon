// src/pages/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OrdersFilters from "@/features/orders/OrdersFilters";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import NewOrderButton from "@/components/orders/NewOrderButton";
import { orderHasQueue } from "@/features/queues/queueEvaluator";
import { getQueueSummaryById, summarizeOperationalQueues } from "@/features/queues/queueSummary";
import { useOrdersSummary } from "@/lib/hooks/useOrders";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function readFilters(qs) {
  const status = qs.get("status") || "";
  const statusIn = status ? [status] : [];
  return {
    search: qs.get("q") || "",
    clientId: qs.get("clientId") || "",
    appraiserId: qs.get("appraiserId") || "",
    priority: qs.get("priority") || "",
    dueWindow: qs.get("due") || "",
    queueId: qs.get("queue") || "",
    statusIn,
    page: Math.max(0, parseInt(qs.get("page") || "0", 10)),
    pageSize: Math.max(10, parseInt(qs.get("pageSize") || "15", 10)),
    orderBy: "order_number",
    ascending: false,
  };
}

function writeFilters(navigate, next) {
  const qs = new URLSearchParams();
  if (next.statusIn?.length) qs.set("status", next.statusIn[0]);
  if (next.appraiserId) qs.set("appraiserId", next.appraiserId);
  if (next.clientId) qs.set("clientId", next.clientId);
  if (next.priority) qs.set("priority", next.priority);
  if (next.dueWindow) qs.set("due", next.dueWindow);
  if (next.queueId) qs.set("queue", next.queueId);
  if (next.search) qs.set("q", next.search);
  qs.set("page", String(Math.max(0, next.page || 0)));
  qs.set("pageSize", String(Math.max(10, next.pageSize || 15)));
  navigate({ search: `?${qs.toString()}` }, { replace: true });
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const qs = useQuery();
  const [filters, setFilters] = useState(() => readFilters(qs));

  useEffect(() => setFilters(readFilters(qs)), [qs]);

  const queueId = filters.queueId || "";
  const queueSourceFilters = useMemo(() => {
    const { queueId: _queueId, page: _page, pageSize: _pageSize, ...rest } = filters;
    return {
      ...rest,
      page: 0,
      pageSize: 1000,
    };
  }, [filters]);
  const queueSource = useOrdersSummary(queueSourceFilters, {
    enabled: Boolean(queueId),
    scope: "orders",
  });
  const queueRows = useMemo(() => {
    if (!queueId) return null;
    return (queueSource.rows || []).filter((order) => orderHasQueue(order, queueId));
  }, [queueId, queueSource.rows]);
  const activeQueue = useMemo(() => {
    if (!queueId) return null;
    const summaries = summarizeOperationalQueues(queueSource.rows || []);
    const summary = getQueueSummaryById(summaries, queueId);
    return summary ? { ...summary, count: queueRows?.length || 0 } : null;
  }, [queueId, queueRows, queueSource.rows]);

  function onChange(patch) {
    const next = { ...filters, ...patch, page: 0 };
    setFilters(next);
    writeFilters(navigate, next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Operational Inventory</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Orders</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Search, filter, and manage the full order record without changing dashboard queue focus.
          </p>
        </div>
        <NewOrderButton show className="shrink-0" />
      </div>

      <OrdersFilters value={filters} onChange={onChange} />

      <UnifiedOrdersTable
        key={JSON.stringify({
          q: filters.search,
          s: filters.statusIn?.[0] || "",
          c: filters.clientId || "",
          a: filters.appraiserId || "",
          d: filters.dueWindow || "",
          queue: filters.queueId || "",
          p: filters.page,
          ps: filters.pageSize,
        })}
        filters={filters}
        pageSize={filters.pageSize || 15}
        rowsOverride={queueId ? queueRows || [] : null}
        activeQueue={activeQueue}
      />
    </div>
  );
}










































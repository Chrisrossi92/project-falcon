// src/pages/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import OrdersFilters from "@/features/orders/OrdersFilters";
import UnifiedOrdersTable from "@/features/orders/UnifiedOrdersTable";
import NewOrderButton from "@/components/orders/NewOrderButton";
import { labelForStatus } from "@/lib/constants/orderStatus";
import { OPERATIONAL_QUEUE_DEFINITIONS } from "@/features/queues/queueDefinitions";
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
    reviewerId: qs.get("reviewerId") || "",
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
  if (next.reviewerId) qs.set("reviewerId", next.reviewerId);
  if (next.clientId) qs.set("clientId", next.clientId);
  if (next.priority) qs.set("priority", next.priority);
  if (next.dueWindow) qs.set("due", next.dueWindow);
  if (next.queueId) qs.set("queue", next.queueId);
  if (next.search) qs.set("q", next.search);
  qs.set("page", String(Math.max(0, next.page || 0)));
  qs.set("pageSize", String(Math.max(10, next.pageSize || 15)));
  navigate({ search: `?${qs.toString()}` }, { replace: true });
}

const QUEUE_LABELS = new Map(OPERATIONAL_QUEUE_DEFINITIONS.map((queue) => [queue.id, queue.label]));

function formatIdLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > 24 ? `${text.slice(0, 8)}...${text.slice(-6)}` : text;
}

function formatDueLabel(value) {
  const due = String(value || "").trim();
  if (!due) return "";
  if (due === "overdue") return "Overdue";
  if (due === "this_week") return "This week (transitional)";
  if (due === "next_week") return "Next week (transitional)";
  if (/^\d+$/.test(due)) {
    return due === "1" ? "Due in 1 day" : `Due in ${due} days`;
  }
  return `${due.replace(/_/g, " ")} (transitional)`;
}

function buildActiveFilterChips(filters) {
  const chips = [];
  const status = filters.statusIn?.[0] || "";

  if (status) {
    chips.push({
      key: "status",
      label: `Status: ${labelForStatus(status)}`,
      clearPatch: { statusIn: [] },
    });
  }

  if (filters.search) {
    chips.push({
      key: "search",
      label: `Search: "${filters.search}"`,
      clearPatch: { search: "" },
    });
  }

  if (filters.clientId) {
    chips.push({
      key: "clientId",
      label: `Client: ${formatIdLabel(filters.clientId)}`,
      clearPatch: { clientId: "" },
    });
  }

  if (filters.appraiserId) {
    chips.push({
      key: "appraiserId",
      label: `Appraiser: ${formatIdLabel(filters.appraiserId)}`,
      clearPatch: { appraiserId: "" },
    });
  }

  if (filters.reviewerId) {
    chips.push({
      key: "reviewerId",
      label: `Reviewer: ${formatIdLabel(filters.reviewerId)}`,
      clearPatch: { reviewerId: "" },
    });
  }

  if (filters.dueWindow) {
    chips.push({
      key: "dueWindow",
      label: `Due: ${formatDueLabel(filters.dueWindow)}`,
      clearPatch: { dueWindow: "" },
    });
  }

  if (filters.queueId) {
    const queueLabel = QUEUE_LABELS.get(filters.queueId) || formatIdLabel(filters.queueId);
    chips.push({
      key: "queueId",
      label: `Queue: ${queueLabel} (derived)`,
      clearPatch: { queueId: "" },
    });
  }

  return chips;
}

function ActiveFilterChips({ filters, onChange }) {
  const chips = buildActiveFilterChips(filters || {});
  if (!chips.length) return null;

  const clearAll = () =>
    onChange?.({
      statusIn: [],
      search: "",
      clientId: "",
      appraiserId: "",
      reviewerId: "",
      dueWindow: "",
      queueId: "",
    });

  return (
    <div
      aria-label="Active order filters"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
    >
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        Active filters
      </span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange?.(chip.clearPatch)}
          aria-label={`Remove ${chip.label} filter`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
        >
          <span className="truncate">{chip.label}</span>
          <span aria-hidden="true" className="text-slate-400">
            x
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
      >
        Clear Filters
      </button>
    </div>
  );
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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to="/orders/historical"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          >
            Historical Orders
          </Link>
          <NewOrderButton show className="shrink-0" />
        </div>
      </div>

      <OrdersFilters value={filters} onChange={onChange} />
      <ActiveFilterChips filters={filters} onChange={onChange} />

      <UnifiedOrdersTable
        key={JSON.stringify({
          q: filters.search,
          s: filters.statusIn?.[0] || "",
          c: filters.clientId || "",
          a: filters.appraiserId || "",
          r: filters.reviewerId || "",
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






































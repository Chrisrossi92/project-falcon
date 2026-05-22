import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listHistoricalOrders } from "@/lib/api/orders";

const fallback = "-";
const stateFilters = [
  { id: "all", label: "All historical" },
  { id: "archived", label: "Archived" },
  { id: "cancelled", label: "Cancelled" },
  { id: "voided", label: "Voided" },
];

function statusLabel(value) {
  return String(value || "unknown")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}

function orderIdOf(order) {
  return order?.id || order?.order_id || null;
}

function retiredStateLabels(order) {
  const labels = [];
  const status = String(order?.status || "").toLowerCase();

  if (order?.is_archived) labels.push("Archived");
  if (status === "cancelled") labels.push("Cancelled");
  if (status === "voided") labels.push("Voided");

  return labels.length > 0 ? labels : ["Historical"];
}

function matchesStateFilter(order, filter) {
  const status = String(order?.status || "").toLowerCase();

  if (filter === "archived") return Boolean(order?.is_archived);
  if (filter === "cancelled") return status === "cancelled";
  if (filter === "voided") return status === "voided";

  return true;
}

function orderAddress(order) {
  return [
    order?.address_line1 || order?.address || order?.property_address,
    [order?.city, order?.state].filter(Boolean).join(", "),
    order?.postal_code || order?.zip,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function HistoricalOrders() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const filteredRows = useMemo(
    () => rows.filter((order) => matchesStateFilter(order, stateFilter)),
    [rows, stateFilter],
  );

  useEffect(() => {
    let active = true;

    async function loadHistoricalOrders() {
      setLoading(true);
      setError("");

      try {
        const result = await listHistoricalOrders({
          page: 0,
          pageSize: 50,
          orderBy: "updated_at",
          ascending: false,
        });

        if (!active) return;

        setRows(Array.isArray(result?.rows) ? result.rows : []);
        setCount(Number(result?.count) || 0);
        if (result?.error) setError(result.error?.message || "Historical orders unavailable.");
      } catch (loadError) {
        if (active) {
          setRows([]);
          setCount(0);
          setError(loadError?.message || "Historical orders unavailable.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistoricalOrders();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Preserved History
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          Historical Orders
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          This read-only page keeps archived, cancelled, and voided orders available for internal
          history and reference. Active orders remain in the normal Orders queue.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Historical order records</div>
            <div className="mt-0.5 text-xs text-slate-500">
              Review preserved records only. Lifecycle changes still belong outside this surface.
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {loading ? "Loading" : `${filteredRows.length} shown`}
            {!loading && count ? ` of ${count} total` : ""}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
          {stateFilters.map((filter) => {
            const active = stateFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                className={
                  active
                    ? "rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }
                onClick={() => setStateFilter(filter.id)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-slate-500">Loading historical orders...</div>
        ) : error ? (
          <div className="px-4 py-8 text-sm text-amber-700">{error}</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">No historical orders found.</div>
        ) : filteredRows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">
            No historical orders match this state filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Retired State</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((order) => {
                  const orderId = orderIdOf(order);
                  const orderNumber =
                    order.order_number || (orderId ? String(orderId).slice(0, 8) : fallback);

                  return (
                    <tr key={orderId || orderNumber}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                        {orderId ? (
                          <Link
                            className="text-slate-950 underline-offset-2 hover:underline"
                            to={`/orders/${orderId}`}
                          >
                            {orderNumber}
                          </Link>
                        ) : (
                          orderNumber
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {retiredStateLabels(order).map((label) => (
                            <span
                              key={label}
                              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {statusLabel(order.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.client_name || fallback}</td>
                      <td className="px-4 py-3 text-slate-700">{orderAddress(order) || fallback}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(order.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

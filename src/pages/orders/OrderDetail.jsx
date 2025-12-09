// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import MapContainer from "@/components/maps/MapContainer";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import { useRole } from "@/lib/hooks/useRole";
import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import useOrder from "@/lib/hooks/useOrder";

/* ---------- helpers ---------- */
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "-");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });

const ICONS = { site_visit: "SV", due_for_review: "REV", due_to_client: "FIN" };
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "") ?? null;
const reviewDateOf = (o) => pick(o.review_due_at);

const statusLabel = (s) =>
  s ? s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "";

/* ============================== component ============================== */
export default function OrderDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { isAdmin } = useRole() || {};

  const { order, loading, error: loadErr, refresh } = useOrder(id);

  // Display names
  const [clientName, setClientName] = useState("-");
  const [amcName, setAmcName] = useState("-");
  const [appraiserName, setAppraiserName] = useState("-");

  // site-visit overlay
  const [showAppt, setShowAppt] = useState(false);
  const [apptInput, setApptInput] = useState("");

  // inline status save
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    if (order) {
      setClientName(order.client_name || "-");
      setAmcName("-");
      setAppraiserName(order.appraiser_name || "-");
    }
  }, [order]);

  const titleNo = useMemo(
    () => (order?.order_number || (order?.id ? String(order.id).slice(0, 8) : "")),
    [order]
  );

  const addr1 = order?.address_line1 || "";
  const addr2 =
    [order?.city, order?.state].filter(Boolean).join(", ") +
    (order?.postal_code ? ` ${order.postal_code}` : "");
  const fullAddress = [addr1, addr2].filter(Boolean).join(", ");

  const copyNo = () => navigator.clipboard?.writeText(titleNo).catch(() => {});

  // calendar events (icon-only chips assumed in EventChip)
  const orderEventsLoader = useCallback(
    async (start, end) => {
      if (!order) return [];
      const add = (dt, type) => {
        if (!dt) return;
        const when = new Date(dt);
        if (when >= start && when <= end) {
          const icon = ICONS[type] || "*";
          return { id: `${order.id}-${type}`, type, start: when.toISOString(), end: when.toISOString(), label: icon, title: icon };
        }
      };
      return [
        add(order.site_visit_at, "site_visit"),
        add(reviewDateOf(order), "due_for_review"),
        add(order.final_due_at ?? order.due_date, "due_to_client"),
      ].filter(Boolean);
    },
    [order]
  );

  async function handleStatusChange(next) {
    if (!order?.id || !isAdmin) return;
    try {
      setSavingStatus(true);
      setStatusError("");
      const { data, error } = await supabase
        .from("orders")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .select("status, updated_at")
        .maybeSingle();
      if (error) throw error;
      refresh();
    } catch (e) {
      setStatusError(e?.message || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  function openApptEditor() {
    setApptInput(order?.site_visit_at ? order.site_visit_at.slice(0, 16) : "");
    setShowAppt(true);
  }

  async function saveAppt() {
    const iso = apptInput ? new Date(apptInput).toISOString() : null;
    const { error } = await supabase
      .from("orders")
      .update({ site_visit_at: iso, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) {
      alert(error.message || "Failed to save site visit");
      return;
    }
    setShowAppt(false);
    refresh();
  }

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (loadErr) return <div className="p-4 text-sm text-rose-600">Failed to load order.</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold flex items-center gap-3">
              <span>Order {titleNo}</span>
              <OrderStatusBadge status={order.status} />
              <button
                type="button"
                onClick={copyNo}
                title="Copy order number"
                className="text-xs rounded border px-1.5 py-0.5 text-gray-500 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            <div className="text-xs text-gray-500">Created {fmtDateTime(order.created_at)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/orders" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              {"<- Back"}
            </Link>
            <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 1: CLIENT + APPRAISER (with inline status editor) */}
      <div className="grid grid-cols-12 gap-4 items-stretch">
        {/* Client */}
        <div className="col-span-12 lg:col-span-6">
          <div className="h-full rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Client</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">AMC (optional)</div>
                <div className="text-gray-800">{amcName || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Client</div>
                <div className="text-gray-800">{clientName || "-"}</div>
              </div>
            </div>

            {/* Property contact */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Contact Name</div>
                <div className="text-gray-800">{order.entry_contact_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Contact Phone</div>
                <div className="text-gray-800">{order.entry_contact_phone || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Appraiser + Status inline */}
        <div className="col-span-12 lg:col-span-6">
          <div className="h-full rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Appraiser</div>

            {/* inline row: Appraiser (left) + Status (right) */}
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-gray-800">{appraiserName}</div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status</span>
                <select
                  className="border rounded px-2 py-1 text-sm disabled:opacity-50"
                  value={order.status || "NEW"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={!isAdmin || savingStatus}
                >
                  {Object.values(ORDER_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
                {savingStatus && <span className="text-[11px] text-gray-500">Saving...</span>}
                {statusError && <span className="text-[11px] text-rose-600">{statusError}</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Split %</div>
                <div className="text-gray-800">{order.split_pct != null ? `${order.split_pct}` : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Base Fee</div>
                <div className="text-gray-800">{money(order.base_fee)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Appraiser Fee</div>
                <div className="text-gray-800">{money(order.appraiser_fee)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: PROPERTY (L) + DATES (R) */}
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Property */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property</div>

            <div className="grid grid-cols-12 gap-4 items-start mb-3">
              <div className="col-span-12 md:col-span-6">
                <div className="text-xs text-gray-500 mb-0.5">Address</div>
                <div className="text-sm text-gray-800">{addr1 || "-"}</div>
                <div className="text-xs text-gray-500">{addr2 || "-"}</div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500 mb-0.5">Property Type</div>
                <div className="text-sm text-gray-800">{order.property_type || "-"}</div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500 mb-0.5">Report Type</div>
                <div className="text-sm text-gray-800">{order.report_type || "-"}</div>
              </div>
            </div>

            <div className="w-full h-64 md:h-72">
              <MapContainer address={fullAddress} />
            </div>
          </div>
        </div>

        {/* Dates (site visit editable via overlay button) */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Dates</div>

            <div className="grid grid-cols-12 gap-3 items-start mb-2 text-sm">
              <div className="col-span-6 md:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Site Visit</span>
                  <button
                    className="text-[11px] px-2 py-0.5 border rounded hover:bg-gray-50"
                    onClick={() => openApptEditor()}
                  >
                    Edit
                  </button>
                </div>
                <div className="text-gray-800">{fmtDateTime(order.site_visit_at)}</div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500">Review Due</div>
                <div className="text-gray-800">{fmtDate(reviewDateOf(order))}</div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500">Final Due</div>
                <div className="text-gray-800">{fmtDate(order.final_due_at ?? order.due_date)}</div>
              </div>
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500">Updated</div>
                <div className="text-gray-800">{fmtDateTime(order.updated_at)}</div>
              </div>
            </div>

            {/* Natural-height calendar; horizontal scroll safe */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[620px]">
                <TwoWeekCalendar
                  getEvents={orderEventsLoader}
                  onEventClick={() => {}}
                  weeks={2}
                  showWeekdayHeader
                  showWeekends
                  compact
                />
              </div>
            </div>

            <div className="mt-1 flex justify-end">
              <div className="text-xs">
                <CalendarLegend />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-md bg-white p-3 border">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Notes</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.access_notes || order.notes || "-"}</div>
      </div>

      {/* Site-visit overlay modal */}
      {showAppt && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
            <div className="text-sm font-medium mb-2">Update Site Visit</div>
            <input
              type="datetime-local"
              step="900"
              className="w-full border rounded px-2 py-2 text-sm"
              value={apptInput}
              onChange={(e) => setApptInput(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 border rounded text-sm" onClick={() => setShowAppt(false)}>
                Cancel
              </button>
              <button className="px-3 py-1.5 border rounded text-sm bg-black text-white" onClick={saveAppt}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

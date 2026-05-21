// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
import TwoWeekCalendar from "@/components/calendar/TwoWeekCalendar";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import OrderStatusBadge from "@/components/orders/table/OrderStatusBadge";
import ActivityLog from "@/components/activity/ActivityLog";
import useOrder from "@/lib/hooks/useOrder";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { useToast } from "@/lib/hooks/useToast";
import { PERMISSIONS } from "@/lib/permissions/constants";
import OfferAssignmentModal from "@/features/assignments/components/OfferAssignmentModal";
import OwnerOrderAssignmentsPanel from "@/features/assignments/components/OwnerOrderAssignmentsPanel";
import { updateSiteVisitAtViaRpc } from "@/lib/services/ordersService";

/* ---------- helpers ---------- */
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "-");
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString() : "-");
const money = (n) =>
  n == null ? "-" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });

const ICONS = { site_visit: "SV", due_for_review: "REV", due_to_client: "FIN" };
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "") ?? null;
const reviewDateOf = (o) => pick(o.review_due_at);

/* ============================== component ============================== */
export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { order, loading, error: loadErr, refresh } = useOrder(id);
  const permissions = useEffectivePermissions();
  const { success } = useToast();
  const [offerAssignmentOpen, setOfferAssignmentOpen] = useState(false);

  // Display names
  const [clientName, setClientName] = useState("-");
  const [amcName, setAmcName] = useState("-");
  const [appraiserName, setAppraiserName] = useState("-");

  useEffect(() => {
    if (order) {
      setClientName(order.client_name || "-");
      setAmcName(order.amc_name || "-");
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

  const copyNo = () => navigator.clipboard?.writeText(titleNo).catch(() => {});

  const canOfferAssignment =
    !permissions.loading &&
    !permissions.error &&
    permissions.hasAllPermissions([
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_OFFER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.RELATIONSHIPS_ASSIGN_WORK,
      PERMISSIONS.RELATIONSHIPS_READ,
    ]);

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

  async function saveAppt(iso) {
    try {
      await updateSiteVisitAtViaRpc(order.id, iso || null);
    } catch (error) {
      alert(error?.message || "Failed to save site visit");
      return;
    }
    refresh();
  }

  if (loading) return <div className="p-4 text-sm">Loading...</div>;
  if (loadErr) return <div className="p-4 text-sm text-rose-600">Failed to load order.</div>;
  if (!order) return <div className="p-4 text-sm text-amber-700">Order not found.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
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
          <div className="flex flex-wrap items-center gap-2">
            {canOfferAssignment && (
              <button
                type="button"
                onClick={() => setOfferAssignmentOpen(true)}
                className="px-3 py-1.5 border border-slate-950 bg-slate-950 text-white rounded text-sm font-semibold hover:bg-slate-800"
              >
                Offer Assignment
              </button>
            )}
            <Link to="/orders" className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              {"<- Back"}
            </Link>
            <Link to={`/orders/${order.id}/edit`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 1: CLIENT + APPRAISER */}
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

            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-xs text-gray-500 uppercase">Appraiser</div>
                <div className="text-sm text-gray-800">{appraiserName}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs text-gray-500 uppercase">Reviewer</div>
                <div className="text-sm text-gray-800">{order.reviewer_name || "–"}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status</span>
                <OrderStatusBadge status={order.status} />
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

      <OwnerOrderAssignmentsPanel
        orderId={order.id}
        canOfferAssignment={canOfferAssignment}
        onOfferAssignment={() => setOfferAssignmentOpen(true)}
      />

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
              <GoogleMapEmbed
                addressLine1={order.address_line1 || order.address || order.property_address}
                city={order.city}
                state={order.state}
                zip={order.postal_code || order.zip}
                height={260}
                zoom={13}
              />
            </div>
          </div>
        </div>

        {/* Dates (site visit editable via overlay button) */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Dates</div>

            <div className="grid grid-cols-12 gap-3 items-start mb-2 text-sm">
              <div className="col-span-6 md:col-span-3">
                <div className="text-xs text-gray-500 mb-1">Site Visit</div>
                <SiteVisitPicker value={order.site_visit_at} onChange={saveAppt} />
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

      {/* Activity */}
      <div className="rounded-md bg-white p-3 border">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
          Activity / Communication History
        </div>
        <ActivityLog orderId={order.id} order={order} showComposer height={520} />
      </div>

      <OfferAssignmentModal
        open={offerAssignmentOpen}
        order={order}
        onClose={() => setOfferAssignmentOpen(false)}
        onSuccess={(assignmentId) => {
          setOfferAssignmentOpen(false);
          success("Assignment offer created.");
          navigate(`/assignments/${assignmentId}`);
        }}
      />
    </div>
  );
}

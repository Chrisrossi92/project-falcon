// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import GoogleMapEmbed from "@/components/maps/GoogleMapEmbed";
import SiteVisitPicker from "@/components/dates/SiteVisitPicker";
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

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "") ?? null;
const reviewDateOf = (o) => pick(o.review_due_at);

function SummaryField({ label, value, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      {children ? (
        <div className="mt-1 text-sm font-medium text-gray-900">{children}</div>
      ) : (
        <div className="mt-1 truncate text-sm font-medium text-gray-900" title={value || "-"}>
          {value || "-"}
        </div>
      )}
    </div>
  );
}

function OverviewSection({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-gray-100 bg-gray-50/60 p-3 ${className}`}>
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

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
  const propertyAddress = [addr1, addr2].filter(Boolean).join(", ");
  const contactName = order?.property_contact_name || order?.entry_contact_name || "";
  const contactPhone = order?.property_contact_phone || order?.entry_contact_phone || "";

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
      {/* Operational overview */}
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
        <div
          className="mt-4 border-t border-gray-100 pt-4"
          aria-label="Operational Overview"
        >
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Operational Overview
          </div>
          <div className="grid gap-3 lg:grid-cols-12">
            <OverviewSection title="Order / Client" className="lg:col-span-4">
              <SummaryField label="Client" value={clientName} />
              <SummaryField label="AMC" value={amcName} />
            </OverviewSection>

            <OverviewSection title="Property / Assignment" className="lg:col-span-8">
              <SummaryField label="Property Address" value={propertyAddress} />
              <SummaryField label="Property Type" value={order.property_type} />
              <SummaryField label="Report Type" value={order.report_type} />
            </OverviewSection>

            <OverviewSection title="Schedule" className="lg:col-span-7">
              <SummaryField label="Site Visit">
                <SiteVisitPicker value={order.site_visit_at} onChange={saveAppt} />
              </SummaryField>
              <SummaryField label="Review Due" value={fmtDate(reviewDateOf(order))} />
              <SummaryField label="Final Due" value={fmtDate(order.final_due_at ?? order.due_date)} />
              <SummaryField label="Updated" value={fmtDateTime(order.updated_at)} />
            </OverviewSection>

            <OverviewSection title="Team / Fees" className="lg:col-span-5">
              <SummaryField label="Appraiser" value={appraiserName} />
              <SummaryField label="Reviewer" value={order.reviewer_name || "-"} />
              <SummaryField label="Split %" value={order.split_pct != null ? `${order.split_pct}` : "-"} />
              <SummaryField label="Base Fee" value={money(order.base_fee)} />
              <SummaryField label="Appraiser Fee" value={money(order.appraiser_fee)} />
            </OverviewSection>

            <OverviewSection title="Property Contact / Access" className="lg:col-span-12">
              <SummaryField label="Contact" value={contactName} />
              <SummaryField label="Contact Phone" value={contactPhone} />
            </OverviewSection>
          </div>
        </div>
      </div>

      {/* Detail body */}
      <div className="grid grid-cols-12 gap-4 items-start" aria-label="Order detail body">
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property / Map</div>

            <div className="mb-3 text-sm">
              <div className="text-xs text-gray-500 mb-0.5">Address</div>
              <div className="text-gray-800">{addr1 || "-"}</div>
              <div className="text-xs text-gray-500">{addr2 || "-"}</div>
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

        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-md bg-white p-3 border">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Activity
            </div>
            <ActivityLog orderId={order.id} order={order} showComposer height={420} />
          </div>
        </div>
      </div>

      <OwnerOrderAssignmentsPanel
        orderId={order.id}
        canOfferAssignment={canOfferAssignment}
        onOfferAssignment={() => setOfferAssignmentOpen(true)}
      />

      {/* Notes */}
      <div className="rounded-md bg-white p-3 border">
        <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Notes</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.access_notes || order.notes || "-"}</div>
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

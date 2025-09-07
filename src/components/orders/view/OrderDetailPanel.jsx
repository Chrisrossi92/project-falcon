import React from "react";
import MetaItem from "@/components/ui/MetaItem";
import { useNavigate } from "react-router-dom";
import { labelForStatus } from "@/lib/constants/orderStatus";
import MapContainer from "@/components/maps/MapContainer";

export default function OrderDetailPanel({ order, isAdmin, showMap = false }) {
  const navigate = useNavigate();

  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");
  const fmtMoney = (n) =>
    typeof n === "number"
      ? n.toLocaleString(undefined, { style: "currency", currency: "USD" })
      : "—";

  if (!order) return <div className="text-sm text-gray-500 p-4">Loading order details…</div>;

  const handleEdit = () => navigate(`/orders/${order.id}/edit`);

  const address = order.property_address || order.address || "—";
  const city = order.city || "—";
  const state = order.state || "—";
  const zip = order.postal_code || order.zip || "—";

  const statusLabel = labelForStatus(order.status || "");
  const siteVisitAt = order.site_visit_at || null;
  const reviewDueAt = order.review_due_at || null;
  const finalDueAt = order.final_due_at || order.due_date || null;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Order Info</h2>
        {isAdmin && (
          <button className="text-sm text-blue-600 hover:underline" onClick={handleEdit}>
            Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <MetaItem label="Client">{order.client_name || order.client?.name || "—"}</MetaItem>
          <MetaItem label="Appraiser">
            {order.appraiser_name || order.appraiser?.display_name || order.appraiser?.name || "—"}
          </MetaItem>
          <MetaItem label="Address">{address}</MetaItem>
          <MetaItem label="City">{city}</MetaItem>
          <MetaItem label="State">{state}</MetaItem>
          <MetaItem label="Zip">{zip}</MetaItem>
        </div>

        <div className="space-y-3">
          <MetaItem label="Base Fee">{fmtMoney(order.base_fee)}</MetaItem>
          {isAdmin && (
            <>
              <MetaItem label="Appraiser Fee">{fmtMoney(order.appraiser_fee)}</MetaItem>
              <MetaItem label="Appraiser Split">
                {typeof order.appraiser_split === "number" ? `${order.appraiser_split}%` : "—"}
              </MetaItem>
              <MetaItem label="Client Invoice #">{order.client_invoice || "—"}</MetaItem>
              <MetaItem label="Paid Status">{order.paid_status || "—"}</MetaItem>
            </>
          )}
        </div>

        <div className="space-y-3">
          <MetaItem label="Status">{statusLabel || "—"}</MetaItem>
          <MetaItem label="Site Visit">{fmtDateTime(siteVisitAt)}</MetaItem>
          <MetaItem label="Reviewer Due">{fmtDateTime(reviewDueAt)}</MetaItem>
          <MetaItem label="Final Due">{fmtDateTime(finalDueAt)}</MetaItem>
          {isAdmin && (
            <>
              <MetaItem label="Created At">{fmtDateTime(order.created_at)}</MetaItem>
              <MetaItem label="Updated At">{fmtDateTime(order.updated_at)}</MetaItem>
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</h3>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.notes || "—"}</div>
      </div>

      {showMap &&
        (() => {
          const parts = [
            address !== "—" ? address : "",
            city !== "—" ? city : "",
            state !== "—" ? state : "",
            zip !== "—" ? zip : "",
          ].filter(Boolean);
          const mapAddress = parts.join(", ").trim();
          if (!mapAddress || mapAddress.length < 5) return null;
          return (
            <div>
              <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Location
              </h3>
              <div className="rounded-lg overflow-hidden border">
                <MapContainer address={mapAddress} />
              </div>
            </div>
          );
        })()}
    </div>
  );
}













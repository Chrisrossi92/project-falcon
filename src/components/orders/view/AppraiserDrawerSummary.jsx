// src/components/orders/view/AppraiserDrawerSummary.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import MapContainer from "@/components/maps/MapContainer";

/**
 * Appraiser/Reviewer compact drawer content:
 *  - tiny header
 *  - property map
 *  - "View full order" button
 */
export default function AppraiserDrawerSummary({ order }) {
  const address = useMemo(() => {
    if (!order) return "";
    // prefer canonical field names; keep fallbacks for older data
    const street = order.property_address || order.address || "";
    const city   = order.city  || "";
    const state  = order.state || "";
    const zip    = order.postal_code || order.zip || "";
    const parts = [street, [city, state].filter(Boolean).join(", "), zip].filter(Boolean);
    return parts.join(" ");
  }, [order]);

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Order</div>
          <div className="text-base font-medium">{order?.order_no || order?.order_number || "—"}</div>
        </div>
        <Link
          to={`/orders/${order?.id}`}
          className="px-2 py-1 rounded border text-xs hover:bg-slate-50"
          onClick={(e) => e.stopPropagation()}
          title="Open full order details"
        >
          View full order
        </Link>
      </div>

      {/* map */}
      <div className="rounded-lg border overflow-hidden">
        <MapContainer address={address} />
      </div>
    </div>
  );
}

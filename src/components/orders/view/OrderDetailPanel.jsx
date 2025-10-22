import React from "react";
import normalizeOrder from "@/lib/orders/normalizeOrder";

const money = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function OrderDetailPanel({ order }) {
  const n = normalizeOrder(order);
  return (
    <div className="rounded border bg-white p-3">
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Client</div>
        <div>{n.clientName || "—"}</div>

        <div className="text-xs text-muted-foreground">Appraiser</div>
        <div>{n.appraiserName || "—"}</div>

        <div className="text-xs text-muted-foreground">Fee</div>
        <div>{money(n.feeAmount)}</div>

        <div className="text-xs text-muted-foreground">Property Type</div>
        <div>{n.propertyType || "—"}</div>

        <div className="text-xs text-muted-foreground">Address</div>
        <div className="truncate">
          <div>{n.street || "—"}</div>
          <div className="text-xs text-muted-foreground">{n.cityLine || "—"}</div>
        </div>
      </div>
    </div>
  );
}














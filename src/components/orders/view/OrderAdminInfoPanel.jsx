import React from "react";
import normalizeOrder, { num } from "@/lib/orders/normalizeOrder";

const money = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function OrderAdminInfoPanel({ order }) {
  const n = normalizeOrder(order);

  return (
    <div className="rounded border bg-white p-3">
      <div className="font-medium mb-2">Admin</div>

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Base Fee</div>
        <div>{money(n.baseFee)}</div>

        <div className="text-xs text-muted-foreground">Appraiser Fee</div>
        <div>{money(n.appraiserFee)}</div>

        <div className="text-xs text-muted-foreground">Appraiser Split</div>
        <div>{n.splitPct != null ? `${n.splitPct}%` : "—"}</div>

        <div className="text-xs text-muted-foreground">Client Invoice #</div>
        <div>{order?.client_invoice_no ?? "—"}</div>

        <div className="text-xs text-muted-foreground">Paid Status</div>
        <div>{order?.paid_status ?? "—"}</div>

        <div className="text-xs text-muted-foreground">Notes</div>
        <div className="whitespace-pre-wrap break-words">{order?.notes || "—"}</div>
      </div>
    </div>
  );
}





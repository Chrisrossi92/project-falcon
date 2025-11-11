// src/components/orders/view/OrderAdminInfoPanel.jsx
import React from "react";

const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pick(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] != null && obj?.[k] !== "") return obj[k];
  }
  return null;
}

export default function OrderAdminInfoPanel({ order }) {
  // Try common field names; adjust if your view uses different ones
  const baseFee        = pick(order, ["base_fee", "baseFee", "admin_base_fee"]);
  const appraiserFee   = pick(order, ["appraiser_fee", "appraiserFee"]);
  const appraiserSplit = pick(order, ["appraiser_split", "appraiserSplit"]);
  const clientInvoice  = pick(order, ["client_invoice_no", "client_invoice_number", "clientInvoiceNo"]);
  const paidStatus     = pick(order, ["paid_status", "paidStatus", "is_paid"]);
  const notes          = pick(order, ["admin_notes", "notes", "adminNotes"]);

  return (
    <div className="rounded border bg-white p-3">
      <div className="font-medium mb-2">Admin</div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="text-gray-600">Base Fee</div>
        <div>{money(baseFee)}</div>

        <div className="text-gray-600">Appraiser Fee</div>
        <div>{money(appraiserFee)}</div>

        <div className="text-gray-600">Appraiser Split</div>
        <div>{appraiserSplit ?? "—"}</div>

        <div className="text-gray-600">Client Invoice #</div>
        <div>{clientInvoice ?? "—"}</div>

        <div className="text-gray-600">Paid Status</div>
        <div>{paidStatus === true ? "Paid" : paidStatus === false ? "Unpaid" : paidStatus ?? "—"}</div>

        <div className="text-gray-600">Notes</div>
        <div className="whitespace-pre-wrap">{notes ?? "—"}</div>
      </div>
    </div>
  );
}






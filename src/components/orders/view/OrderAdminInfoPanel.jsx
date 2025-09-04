import React from "react";
import MetaItem from "@/components/ui/MetaItem";

const $ = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function OrderAdminInfoPanel({ order }) {
  if (!order) return null;

  // Fallbacks for mixed row field names
  const baseFee       = order.base_fee        ?? order.fee_amount ?? order.baseFee ?? null;
  const appraiserFee  = order.appraiser_fee   ?? order.appraiserFee ?? null;
  const splitPct      = order.appraiser_split ?? order.split_pct ?? order.fee_split ?? null;
  const clientInvoice = order.client_invoice  ?? order.client_invoice_no ?? order.invoice_no ?? null;
  const paidStatus    = order.paid_status     ?? order.payment_status ?? null;
  const notes         = order.notes ?? order.internal_notes ?? null;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-sm space-y-4 h-full">
      <h2 className="text-base font-semibold">Admin</h2>

      <div className="space-y-3">
        <MetaItem label="Base Fee">{$(baseFee)}</MetaItem>
        <MetaItem label="Appraiser Fee">{$(appraiserFee)}</MetaItem>
        <MetaItem label="Appraiser Split">
          {typeof splitPct === "number" ? `${splitPct}%` : splitPct ?? "—"}
        </MetaItem>
        <MetaItem label="Client Invoice #">{clientInvoice ?? "—"}</MetaItem>
        <MetaItem label="Paid Status">{paidStatus ?? "—"}</MetaItem>
      </div>

      <div>
        <h3 className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          Notes
        </h3>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{notes || "—"}</div>
      </div>
    </div>
  );
}




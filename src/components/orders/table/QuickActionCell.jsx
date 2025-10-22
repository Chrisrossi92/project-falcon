// src/components/orders/table/QuickActionCell.jsx
import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";

export default function QuickActionCell({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function sendToReview() {
    if (!order?.id) return;
    try {
      setBusy(true);
      setErr("");
      const { error } = await supabase
        .from("orders")
        .update({ status: "IN_REVIEW", updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (error) throw error;
      onChanged?.();
    } catch (e) {
      setErr(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
        onClick={sendToReview}
        disabled={busy}
      >
        {busy ? "Sending…" : "Send to Review"}
      </button>
      {err && <span className="text-[11px] text-rose-600">{err}</span>}
    </div>
  );
}








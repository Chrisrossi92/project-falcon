// src/components/orders/AssignAppraiser.jsx
import React, { useState } from "react";
import { assignOrder } from "@/lib/services/ordersService";
import AppraiserSelect from "@/components/ui/AppraiserSelect";

export default function AssignAppraiser({ order }) {
  const [appraiserId, setAppraiserId] = useState(order?.appraiser_id || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onAssign() {
    if (!appraiserId) {
      alert("Select an appraiser first");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await assignOrder(order.id, appraiserId);
      // useOrders realtime will refresh rows automatically
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[220px]">
        <AppraiserSelect value={appraiserId} onChange={setAppraiserId} />
      </div>
      <button
        className="px-2 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
        onClick={onAssign}
        disabled={busy}
        title="Assign appraiser"
      >
        Assign
      </button>
      {err ? <span className="text-[10px] text-red-600">{err}</span> : null}
    </div>
  );
}


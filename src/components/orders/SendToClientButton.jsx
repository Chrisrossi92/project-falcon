// src/components/orders/SendToClientButton.jsx
import React, { useState } from "react";
import { sendToClient } from "@/lib/services/ordersService";

export default function SendToClientButton({ orderId, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onClick() {
    setBusy(true);
    setErr(null);
    try {
      await sendToClient(orderId);
      onDone?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        onClick={onClick}
        disabled={busy}
        title="Send final report to client"
      >
        Send to Client
      </button>
      {err ? <span className="text-sm text-red-600">{err}</span> : null}
    </div>
  );
}

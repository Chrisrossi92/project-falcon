// src/components/orders/NewOrderForm.jsx
import React, { useMemo, useState } from "react";
import { createOrderWithLogs } from "@/lib/services/ordersService";
import ClientSelect from "@/components/ui/ClientSelect";
import AppraiserSelect from "@/components/ui/AppraiserSelect";

function toISOStringOrNull(local) {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d) ? null : d.toISOString();
}

export default function NewOrderForm({ onCreated }) {
  const [order_number, setOrderNumber] = useState("");
  const [status, setStatus] = useState("in_progress");

  // Selected client via picker OR manual fallback
  const [client_id, setClientId] = useState("");
  const [manual_client, setManualClient] = useState("");

  // Optional initial assignment (picker)
  const [appraiser_id, setAppraiserId] = useState("");

  // Address
  const [property_address, setPropertyAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postal_code, setPostalCode] = useState("");

  // Dates
  const [site_visit_at, setSiteVisitAt] = useState("");
  const [review_due_at, setReviewDueAt] = useState("");
  const [final_due_at, setFinalDueAt] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const canSubmit = useMemo(() => {
    const hasClient = manual_client.trim().length > 0 || client_id.trim().length > 0;
    const hasAddr = property_address.trim().length > 0;
    return hasClient && hasAddr && !busy;
  }, [manual_client, client_id, property_address, busy]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = {};
      if (order_number.trim()) payload.order_number = order_number.trim();
      if (status) payload.status = status;

      if (client_id.trim()) payload.client_id = client_id.trim();
      if (manual_client.trim()) payload.manual_client = manual_client.trim();

      if (appraiser_id.trim()) payload.appraiser_id = appraiser_id.trim();

      if (property_address.trim()) payload.property_address = property_address.trim();
      if (city.trim()) payload.city = city.trim();
      if (stateVal.trim()) payload.state = stateVal.trim();
      if (postal_code.trim()) payload.postal_code = postal_code.trim();

      const s = toISOStringOrNull(site_visit_at);
      const r = toISOStringOrNull(review_due_at);
      const f = toISOStringOrNull(final_due_at);
      if (s) payload.site_visit_at = s;
      if (r) payload.review_due_at = r;
      if (f) payload.final_due_at = f;

      const created = await createOrderWithLogs(payload);
      if (typeof onCreated === "function") onCreated(created);
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basics */}
      <section className="bg-white rounded-2xl shadow border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Order #</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={order_number}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="(optional)"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="revisions">Revisions</option>
              <option value="ready_to_send">Ready to Send</option>
              <option value="complete">Complete</option>
            </select>
          </div>
        </div>
      </section>

      {/* Client & Assignment */}
      <section className="bg-white rounded-2xl shadow border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Client</label>
            <ClientSelect value={client_id} onChange={setClientId} />
            <div className="mt-1 text-[11px] text-gray-500">
              Select a known client above. Or leave empty and use Manual Client below.
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Manual Client (name)</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={manual_client}
              onChange={(e) => setManualClient(e.target.value)}
              placeholder="Bank / Company name"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Assign Appraiser (optional)</label>
            <AppraiserSelect value={appraiser_id} onChange={setAppraiserId} />
          </div>
        </div>
      </section>

      {/* Property */}
      <section className="bg-white rounded-2xl shadow border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Property Address</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={property_address}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">State</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={stateVal}
              onChange={(e) => setStateVal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Postal Code</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={postal_code}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Dates */}
      <section className="bg-white rounded-2xl shadow border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">📍 Site Visit</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-2 py-1 text-sm"
              value={site_visit_at}
              onChange={(e) => setSiteVisitAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">🧐 Due for Review</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-2 py-1 text-sm"
              value={review_due_at}
              onChange={(e) => setReviewDueAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">🚨 Due to Client</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-2 py-1 text-sm"
              value={final_due_at}
              onChange={(e) => setFinalDueAt(e.target.value)}
            />
          </div>
        </div>
      </section>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Create order
        </button>
        <div className="text-xs text-gray-500 self-center">
          Requires: Property Address and either Client (picker) or Manual Client.
        </div>
      </div>
    </form>
  );
}



// src/components/orders/OrderForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import ClientSelect from "@/components/ui/ClientSelect";
import AppraiserSelect from "@/components/ui/AppraiserSelect";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/utils/formatDate";
import {
  createOrder,
  updateOrder,
  updateOrderDates,
  assignAppraiser,
  isOrderNumberAvailable,
} from "@/lib/services/ordersService";

/**
 * Props:
 *  - order?: existing order row (for edit)
 *  - onSaved?: (orderId) => void
 */
export default function OrderForm({ order = null, onSaved }) {
  const [form, setForm] = useState(() => ({
    client_id: order?.client_id || "",
    manual_client: order?.manual_client || "",
    appraiser_id: order?.appraiser_id || "",
    order_number: order?.order_number || "",
    property_address: order?.property_address || order?.address || "",
    city: order?.city || "",
    state: order?.state || "",
    postal_code: order?.postal_code || order?.zip || "",
    base_fee: order?.base_fee ?? "",
    appraiser_fee: order?.appraiser_fee ?? "",
    appraiser_split: order?.appraiser_split ?? "",
    notes: order?.notes || "",
  }));

  const [siteVisitLocal, setSiteVisitLocal] = useState(toLocalInputValue(order?.site_visit_at));
  const [reviewDueLocal, setReviewDueLocal] = useState(toLocalInputValue(order?.review_due_at));
  const [finalDueLocal, setFinalDueLocal] = useState(toLocalInputValue(order?.final_due_at || order?.due_date));

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Order # availability state
  const [ordNumState, setOrdNumState] = useState("idle"); // idle|checking|available|taken|skip
  const [ordNumMsg, setOrdNumMsg] = useState("");

  // When editing and the number equals original, skip check
  useEffect(() => {
    if (order?.id && form.order_number === (order.order_number || "")) {
      setOrdNumState("skip");
      setOrdNumMsg("");
    } else if (!form.order_number) {
      setOrdNumState("idle");
      setOrdNumMsg("");
    } else {
      setOrdNumState("idle");
      setOrdNumMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.order_number]);

  async function checkOrderNumber() {
    if (!form.order_number) {
      setOrdNumState("idle");
      setOrdNumMsg("");
      return;
    }
    if (order?.id && form.order_number === (order.order_number || "")) {
      setOrdNumState("skip");
      setOrdNumMsg("");
      return;
    }
    try {
      setOrdNumState("checking");
      const ok = await isOrderNumberAvailable(form.order_number, { ignoreOrderId: order?.id });
      if (ok) {
        setOrdNumState("available");
        setOrdNumMsg("Order # is available.");
      } else {
        setOrdNumState("taken");
        setOrdNumMsg("That order # is already in use.");
      }
    } catch (e) {
      setOrdNumState("idle");
      setOrdNumMsg("");
    }
  }

  const patch = useMemo(() => {
    const p = { ...form };
    // Normalize numeric fields
    ["base_fee", "appraiser_fee", "appraiser_split"].forEach((k) => {
      if (p[k] === "") delete p[k];
      else p[k] = Number(p[k]);
    });
    // Normalize empty strings to null where useful
    Object.keys(p).forEach((k) => {
      if (p[k] === "") p[k] = null;
    });
    return p;
  }, [form]);

  function onChange(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function saveDates(orderId) {
    const siteVisit = fromLocalInputValue(siteVisitLocal);
    const reviewDue = fromLocalInputValue(reviewDueLocal);
    const finalDue = fromLocalInputValue(finalDueLocal);
    if (siteVisit || reviewDue || finalDue) {
      await updateOrderDates(orderId, { siteVisit, reviewDue, finalDue });
    }
  }

  async function onSubmit(e) {
    e?.preventDefault?.();
    setBusy(true);
    setErr(null);
    try {
      // Soft guard: if we know it's taken, block submit
      if (ordNumState === "taken") {
        throw new Error("Order # is already in use. Please choose another.");
      }

      let row;
      if (order?.id) {
        row = await updateOrder(order.id, patch);
      } else {
        row = await createOrder(patch);
      }

      // Assign appraiser if provided and changed (only on create)
      if (!order?.id && patch.appraiser_id) {
        await assignAppraiser(row.id, patch.appraiser_id);
      }

      await saveDates(row.id);
      onSaved?.(row.id);
    } catch (e2) {
      // Friendly message for unique constraint on order_number
      const message = String(e2?.message || e2 || "");
      if (message.includes("orders_order_number_key") || message.toLowerCase().includes("duplicate key value")) {
        setErr("That order # already exists. Please choose a different number.");
      } else {
        setErr(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client */}
        <div>
          <label className="text-xs text-gray-600">Client</label>
          <ClientSelect
            value={form.client_id || ""}
            onChange={(v) => onChange("client_id", v)}
          />
          <div className="text-[11px] text-gray-500 mt-1">
            Or enter a manual client:{" "}
            <input
              className="border rounded px-2 py-1 text-xs"
              value={form.manual_client || ""}
              onChange={(e) => onChange("manual_client", e.target.value)}
              placeholder="Manual client name"
            />
          </div>
        </div>

        {/* Appraiser */}
        <div>
          <label className="text-xs text-gray-600">Appraiser</label>
          <AppraiserSelect
            value={form.appraiser_id || ""}
            onChange={(v) => onChange("appraiser_id", v)}
          />
        </div>

        {/* Order number (with availability check) */}
        <div>
          <label className="text-xs text-gray-600">Order #</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={form.order_number || ""}
            onChange={(e) => onChange("order_number", e.target.value)}
            onBlur={checkOrderNumber}
            placeholder="(leave blank if you assign later)"
          />
          {ordNumState === "taken" && (
            <div className="text-xs text-red-600 mt-1">{ordNumMsg}</div>
          )}
          {ordNumState === "available" && (
            <div className="text-xs text-green-600 mt-1">{ordNumMsg}</div>
          )}
        </div>

        {/* Fees */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-600">Base Fee</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.base_fee}
              onChange={(e) => onChange("base_fee", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Appraiser Fee</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.appraiser_fee}
              onChange={(e) => onChange("appraiser_fee", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Split %</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.appraiser_split}
              onChange={(e) => onChange("appraiser_split", e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Address</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.property_address}
              onChange={(e) => onChange("property_address", e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">City</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">State</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.state}
              onChange={(e) => onChange("state", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Zip</label>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.postal_code}
              onChange={(e) => onChange("postal_code", e.target.value)}
            />
          </div>
        </div>

        {/* Dates */}
        <div>
          <label className="text-xs text-gray-600">Site Visit</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={siteVisitLocal}
            onChange={(e) => setSiteVisitLocal(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Reviewer Due</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={reviewDueLocal}
            onChange={(e) => setReviewDueLocal(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Final Due</label>
          <input
            type="datetime-local"
            className="w-full border rounded px-2 py-1 text-sm"
            value={finalDueLocal}
            onChange={(e) => setFinalDueLocal(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">Notes</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={4}
            value={form.notes || ""}
            onChange={(e) => onChange("notes", e.target.value)}
          />
        </div>
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || ordNumState === "taken"}
          title={ordNumState === "taken" ? "Order # already in use" : undefined}
        >
          {order?.id ? "Save Changes" : "Create Order"}
        </button>
      </div>
    </form>
  );
}


















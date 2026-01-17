// src/components/orders/form/OrderForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientFields from "./ClientFields";
import AssignmentFields from "./AssignmentFields";
import PropertyFields from "./PropertyFields";
import DatesFields from "./DatesFields";
import { createOrder, updateOrder } from "@/lib/services/ordersService";

// ---- date helpers ----
const toYMD = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toLocalDateTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
};

const fromLocalDateTimeInputToISO = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

function buildOrderPayload(values) {
  return {
    status: String(values.status || "new").toLowerCase(),
    order_number: values.order_number || null,

    client_id: values.client_id || null,
    manual_client_name: values.manual_client_name || null,
    managing_amc_id: values.managing_amc_id || null,

    appraiser_id: values.appraiser_id || null,
    reviewer_id: values.reviewer_id || null,

    base_fee: values.base_fee ? Number(values.base_fee) : null,
    split_pct: values.split_pct ? Number(values.split_pct) : null,
    appraiser_fee: values.appraiser_fee ? Number(values.appraiser_fee) : null,

    property_address: values.address_line1 || values.property_address || null,
    city: values.city || values.property_city || null,
    state: values.state || values.property_state || null,
    postal_code: values.postal_code || values.zip || values.property_zip || null,

    property_type: values.property_type || null,
    report_type: values.report_type || null,

    entry_contact_name: values.entry_contact_name || null,
    entry_contact_phone: values.entry_contact_phone || null,

    site_visit_at: values.site_visit_at || null,
    review_due_at: values.review_due_at || null,
    final_due_at: values.final_due_at || null,

    notes: values.notes || null,
  };
}

export default function OrderForm({ order, onClose, onSaved, onCancel }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // hydrate from OrderFrontend
  useEffect(() => {
    if (!order) return;
    setValues({
      order_number: order.order_number ?? "",
      status: (order.status || "").toLowerCase(),
      client_id: order.client_id ?? null,
      manual_client_name: order.manual_client_name ?? order.client_name ?? "",
      managing_amc_id: order.managing_amc_id ?? order.amc_id ?? null,
      appraiser_id: order.appraiser_id ?? null,
      reviewer_id: order.reviewer_id ?? null,
      split_pct: order.split_pct ?? "",
      base_fee: order.base_fee ?? "",
      appraiser_fee: order.appraiser_fee ?? "",
      address_line1: order.address_line1 ?? order.property_address ?? "",
      city: order.city ?? "",
      state: order.state ?? "",
      postal_code: order.postal_code ?? order.zip ?? "",
      property_type: order.property_type ?? "",
      report_type: order.report_type ?? "",
      site_visit_at: toLocalDateTimeInput(order.site_visit_at),
      review_due_at: toYMD(order.review_due_at),
      final_due_at: toYMD(order.final_due_at ?? order.due_date),
      property_contact_name: order.property_contact_name ?? "",
      property_contact_phone: order.property_contact_phone ?? "",
      entry_contact_name: order.entry_contact_name ?? "",
      entry_contact_phone: order.entry_contact_phone ?? "",
      access_notes: order.access_notes ?? "",
      notes: order.notes ?? "",
    });
  }, [order]);

  const applyPatch = (patch) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };

      // auto-calc appraiser_fee from base_fee * split_pct
      if ("base_fee" in patch || "split_pct" in patch) {
        const base = parseFloat(next.base_fee ?? 0);
        const split = parseFloat(next.split_pct ?? 0);
        if (!Number.isNaN(base) && !Number.isNaN(split)) {
          next.appraiser_fee = String(
            Math.round(base * (split / 100) * 100) / 100
          );
        }
      }

      return next;
    });
  };

  const handleChange = (arg) => {
    if (arg && arg.target) {
      const { name, value } = arg.target;
      applyPatch({ [name]: value });
    } else if (arg && typeof arg === "object") {
      applyPatch(arg);
    }
  };

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const payload = buildOrderPayload({
        ...values,
        site_visit_at: values.site_visit_at
          ? fromLocalDateTimeInputToISO(values.site_visit_at)
          : null,
      });

      const isEdit = Boolean(order?.id);
      const result = isEdit
        ? await updateOrder(order.id, payload)
        : await createOrder(payload);

      if (onSaved) onSaved(result);
      if (result?.id) navigate(`/orders/${result.id}`);
    } catch (err) {
      console.error("Failed to save order", err);
      setError(err.message || "Failed to save order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 p-6 bg-white h-full"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold tracking-tight">Edit Order</h2>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-600 max-w-xs">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="text-sm px-4 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto pr-1">
        <ClientFields value={values} values={values} onChange={handleChange} />
        <AssignmentFields value={values} values={values} onChange={handleChange} />
        <PropertyFields value={values} values={values} onChange={handleChange} />
        <DatesFields value={values} values={values} onChange={handleChange} />
        <div className="col-span-1 xl:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Special Instructions (Internal)
          </label>
          <textarea
            name="notes"
            value={values.notes || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[96px]"
            placeholder="Internal instructions for appraisers/reviewers"
          />
        </div>
      </div>
    </form>
  );
}





























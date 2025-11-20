// src/components/orders/form/OrderForm.jsx
import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabaseClient";
import ClientFields from "./ClientFields";
import AssignmentFields from "./AssignmentFields";
import PropertyFields from "./PropertyFields";
import DatesFields from "./DatesFields";

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

// columns that really exist on `orders`
const ORDER_UPDATE_KEYS = [
  "status",
  "base_fee",
  "split_pct",
  "appraiser_fee",
  "order_number",
  "appraiser_id",
  "client_id",
  "manual_client_name",
  "managing_amc_id",
  "entry_contact_name",
  "entry_contact_phone",
  "property_address",
  "city",
  "state",
  "zip",
  "property_type",
  "report_type",
  "site_visit_at",
  "review_due_at",
  "final_due_at",
  "property_contact_name",
  "property_contact_phone",
  "access_notes",
];

export default function OrderForm({ order, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // hydrate from merged view + orders row
  useEffect(() => {
    if (!order) return;
    setValues({
      ...order,
      // front-end "property_*" convenience fields
      property_city: order.city ?? order.property_city ?? "",
      property_state: order.state ?? order.property_state ?? "",
      property_zip: order.zip ?? order.property_zip ?? "",
      site_visit_at: toLocalDateTimeInput(order.site_visit_at),
      review_due_at: toYMD(order.review_due_at),
      final_due_at: toYMD(order.final_due_at),
    });
  }, [order]);

  const applyPatch = (patch) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };

      // keep DB city/state/zip in sync with property_* fields
      if (Object.prototype.hasOwnProperty.call(patch, "property_city")) {
        next.city = patch.property_city;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "property_state")) {
        next.state = patch.property_state;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "property_zip")) {
        next.zip = patch.property_zip;
      }

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!order?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const raw = {
        ...values,
        review_due_at: values.review_due_at || null,
        final_due_at: values.final_due_at || null,
        site_visit_at: values.site_visit_at
          ? fromLocalDateTimeInputToISO(values.site_visit_at)
          : null,
      };

      const payload = {};
      for (const key of ORDER_UPDATE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(raw, key)) {
          payload[key] = raw[key];
        }
      }

      const { data, error: supabaseError } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", order.id)
        .select()
        .single();

      if (supabaseError) {
        console.error(supabaseError);
        throw supabaseError;
      }

      // only navigate if we actually got an id back
      if (onSaved && data?.id) onSaved(data.id);
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="text-sm px-4 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto pr-1">
        <ClientFields value={values} values={values} onChange={handleChange} />
        <AssignmentFields value={values} values={values} onChange={handleChange} />
        <PropertyFields value={values} values={values} onChange={handleChange} />
        <DatesFields value={values} values={values} onChange={handleChange} />
      </div>
    </form>
  );
}

































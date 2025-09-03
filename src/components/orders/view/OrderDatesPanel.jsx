// src/components/orders/OrderDatesPanel.jsx
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { updateOrderDates } from "@/lib/services/ordersService";

function toDate(v) {
  if (!v) return null;
  const d = typeof v === "string" ? new Date(v) : v;
  return isNaN(d?.getTime?.()) ? null : d;
}

export default function OrderDatesPanel({ order, onAfterChange }) {
  const [siteVisit, setSiteVisit] = useState(null);
  const [reviewDue, setReviewDue] = useState(null);
  const [finalDue, setFinalDue] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSiteVisit(toDate(order?.site_visit_date));
    setReviewDue(toDate(order?.review_due_date));
    setFinalDue(toDate(order?.final_due_date || order?.due_date));
  }, [order?.site_visit_date, order?.review_due_date, order?.final_due_date, order?.due_date]);

  async function save() {
    setSaving(true);
    try {
      await updateOrderDates(order.id, { siteVisit, reviewDue, finalDue });
      toast.success("Dates updated");
      onAfterChange?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update dates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium">Dates</div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm">
          <div className="text-xs text-gray-500 mb-1">Site Visit</div>
          <DatePicker
            selected={siteVisit}
            onChange={setSiteVisit}
            showTimeSelect
            dateFormat="Pp"
            isClearable
            placeholderText="Select date/time"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          <div className="text-xs text-gray-500 mb-1">Review Due</div>
          <DatePicker
            selected={reviewDue}
            onChange={setReviewDue}
            showTimeSelect
            dateFormat="Pp"
            isClearable
            placeholderText="Select date/time"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          <div className="text-xs text-gray-500 mb-1">Final/Global Due</div>
          <DatePicker
            selected={finalDue}
            onChange={setFinalDue}
            showTimeSelect
            dateFormat="Pp"
            isClearable
            placeholderText="Select date/time"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <button
          className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Dates"}
        </button>
      </div>
    </div>
  );
}

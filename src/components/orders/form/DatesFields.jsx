// src/components/orders/form/DatesFields.jsx
import React from "react";

export default function DatesFields({ values, onChange }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
        Dates
      </h3>

      {/* Site Visit - datetime-local */}
      <div className="space-y-1.5">
        <label
          htmlFor="site_visit_at"
          className="block text-xs font-medium text-slate-600"
        >
          Site Visit (Scheduled)
        </label>
        <input
          id="site_visit_at"
          name="site_visit_at"
          type="datetime-local"
          value={values.site_visit_at || ""}
          onChange={onChange}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {/* Reviewer Due - date only */}
      <div className="space-y-1.5">
        <label
          htmlFor="review_due_at"
          className="block text-xs font-medium text-slate-600"
        >
          Reviewer Due
        </label>
        <input
          id="review_due_at"
          name="review_due_at"
          type="date"
          value={values.review_due_at || ""}
          onChange={onChange}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        />
      </div>

      {/* Final Due - date only */}
      <div className="space-y-1.5">
        <label
          htmlFor="final_due_at"
          className="block text-xs font-medium text-slate-600"
        >
          Final Due
        </label>
        <input
          id="final_due_at"
          name="final_due_at"
          type="date"
          value={values.final_due_at || ""}
          onChange={onChange}
          className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
        />
      </div>
    </section>
  );
}


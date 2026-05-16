// src/components/orders/form/DatesFields.jsx
import React from "react";

function RecommendedCue({ show, children }) {
  if (!show) return null;
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export default function DatesFields({ values, onChange }) {
  const needsFinalDue = !values.final_due_at;

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
        Scheduling
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
        <RecommendedCue show={needsFinalDue}>
          Recommended: add the client-facing final due date.
        </RecommendedCue>
      </div>
    </section>
  );
}

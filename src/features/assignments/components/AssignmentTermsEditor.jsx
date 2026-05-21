const TERM_FIELDS = [
  ["scope", "Scope"],
  ["deliverable", "Deliverable"],
  ["turn_time", "Turn time"],
  ["requirements", "Requirements"],
  ["revision_policy", "Revision policy"],
  ["contact_method", "Contact method"],
];

export default function AssignmentTermsEditor({ value = {}, onChange }) {
  const updateField = (key, fieldValue) => {
    onChange?.({ ...value, [key]: fieldValue });
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">Terms</h3>
        <p className="mt-1 text-xs text-slate-500">Optional owner-curated terms for the assigned company.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TERM_FIELDS.map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
            <textarea
              value={value[key] || ""}
              onChange={(event) => updateField(key, event.target.value)}
              rows={2}
              className="min-h-[72px] rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

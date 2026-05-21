const HANDOFF_FIELDS = [
  ["property_summary", "Property summary"],
  ["scope_notes", "Scope notes"],
  ["special_instructions", "Special instructions"],
  ["documents_available_note", "Documents available note"],
  ["client_facing_contact_note", "Client-facing contact note"],
];

export default function HandoffPayloadEditor({ value = {}, onChange }) {
  const updateField = (key, fieldValue) => {
    onChange?.({ ...value, [key]: fieldValue });
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-950">Handoff Packet</h3>
        <p className="mt-1 text-xs text-slate-500">
          Enter only the information intentionally approved for this assignment handoff.
        </p>
      </div>
      <div className="grid gap-3">
        {HANDOFF_FIELDS.map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
            <textarea
              value={value[key] || ""}
              onChange={(event) => updateField(key, event.target.value)}
              rows={key === "property_summary" ? 2 : 3}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

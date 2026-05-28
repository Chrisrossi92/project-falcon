function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function TextInput(props){ return <input {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }
function RecommendedCue({ show, children }) {
  if (!show) return null;
  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export const PROPERTY_TYPES = [
  "Industrial",
  "Office",
  "Retail",
  "Multifamily",
  "Land",
  "Mixed-Use",
  "Special Purpose",
  "Medical Office",
  "Self Storage",
  "Hospitality",
  "Restaurant",
  "Auto Service",
  "Car Wash",
  "Gas Station/C-Store",
  "Bank Branch",
  "School/Daycare",
  "Religious Facility",
  "Agricultural",
  "Residential",
  "Other",
];
export const REPORT_TYPES = [
  "Appraisal",
  "Restricted Appraisal",
  "Construction Draw",
  "Trip Fee",
  "Review",
  "Other",
];
const LEGACY_REPORT_TYPE_LABELS = {
  Narrative: "Narrative",
  Form: "Form",
  Restricted: "Restricted",
};

export default function PropertyFields({ value, onChange }) {
  const needsAddress = !String(value.address_line1 || value.property_address || "").trim();

  return (
    <div className="rounded-md bg-white/60 p-3 border">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property & Report</div>

      <Label>Address</Label>
      <TextInput
        name="address_line1"
        placeholder="123 Main St"
        value={value.address_line1 || ""}
        onChange={(e) => onChange({ address_line1: e.target.value })}
      />
      <RecommendedCue show={needsAddress}>
        Recommended: add the property street address for scheduling and worklists.
      </RecommendedCue>

      <div className="mt-3 grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <Label>City</Label>
          <TextInput value={value.city || ""} onChange={(e) => onChange({ city: e.target.value })} />
        </div>
        <div className="col-span-1">
          <Label>State</Label>
          <TextInput value={value.state || ""} onChange={(e) => onChange({ state: (e.target.value || "").toUpperCase() })} maxLength={2}/>
        </div>
        <div className="col-span-2">
          <Label>Zip</Label>
          <TextInput value={value.postal_code || value.zip || ""} onChange={(e) => onChange({ postal_code: e.target.value })} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <Label>Property Type</Label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={value.property_type || ""}
            onChange={(e) => onChange({ property_type: e.target.value })}
          >
            <option value="">Select type...</option>
            {PROPERTY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <Label>Report Type</Label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={value.report_type || ""}
            onChange={(e) => onChange({ report_type: e.target.value })}
          >
            <option value="">Select report...</option>
            {value.report_type && !REPORT_TYPES.includes(value.report_type) && (
              <option value={value.report_type}>
                {LEGACY_REPORT_TYPE_LABELS[value.report_type] || value.report_type} (legacy)
              </option>
            )}
            {REPORT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
}

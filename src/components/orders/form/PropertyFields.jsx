import React from "react";

function Label({ children }) { return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>; }
function TextInput(props){ return <input {...props} className={"w-full border rounded px-2 py-1 text-sm "+(props.className||"")} />; }

const PROPERTY_TYPES = ["Industrial","Office","Retail","Multifamily","Land","Mixed-Use","Special Purpose","Other"];
const REPORT_TYPES   = ["Narrative","Form","Restricted","Review","Other"];

export default function PropertyFields({ value, onChange }) {
  return (
    <div className="rounded-md bg-white/60 p-3 border">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Property</div>

      <Label>Address</Label>
      <TextInput
        name="address_line1"
        placeholder="123 Main St"
        value={value.address_line1 || ""}
        onChange={(e) => onChange({ address_line1: e.target.value })}
      />

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
            {REPORT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
}

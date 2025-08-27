// src/components/ui/AppraiserFilterBar.jsx
import React from "react";
import AppraiserSelect from "@/components/ui/AppraiserSelect";

/**
 * AppraiserFilterBar
 * Props:
 *  - value: string (appraiser_id or "")
 *  - onChange: (id: string) => void
 */
export default function AppraiserFilterBar({ value, onChange }) {
  return (
    <div className="w-full bg-white rounded-2xl shadow border p-3 flex items-center gap-3">
      <div className="text-sm font-medium">Filter by appraiser:</div>
      <div className="min-w-[260px]">
        <AppraiserSelect value={value} onChange={onChange} />
      </div>
      <button
        type="button"
        className="px-2 py-1 border rounded text-xs hover:bg-gray-50 disabled:opacity-50"
        onClick={() => onChange("")}
        disabled={!value}
        title="Clear appraiser filter"
      >
        Clear
      </button>
    </div>
  );
}

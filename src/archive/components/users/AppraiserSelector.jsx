import React from "react";

export default function AppraiserSelector({ appraisers, appraiserId, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Appraiser</label>
      <select
        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 bg-white"
        value={appraiserId || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select Appraiser</option>
        {appraisers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
}

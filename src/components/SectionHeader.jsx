import React from "react";

export default function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}


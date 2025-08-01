// src/components/MetaItem.jsx

import React from "react";

export default function MetaItem({ label, children }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900 break-words">
        {children || "—"}
      </span>
    </div>
  );
}


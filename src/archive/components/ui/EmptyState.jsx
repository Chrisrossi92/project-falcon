// src/components/ui/EmptyState.jsx
import React from "react";

export default function EmptyState({ title = "Nothing here yet.", hint }) {
  return (
    <div className="rounded border bg-white p-4 text-sm text-gray-500">
      <div className="font-medium text-gray-700">{title}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}

// src/components/ui/LoadingBlock.jsx
import React from "react";

export default function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="min-h-[10vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

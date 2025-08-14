// src/components/ui/Loaders.jsx
import React from "react";

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-gray-600">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

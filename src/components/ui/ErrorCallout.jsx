// src/components/ui/ErrorCallout.jsx
import React from "react";

export default function ErrorCallout({ children }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {children}
    </div>
  );
}

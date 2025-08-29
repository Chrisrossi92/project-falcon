// src/templates/FormTemplate.jsx
import React from "react";

export default function FormTemplate({ title, subtitle, back, actions, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}{back}</div>
      </div>
      <div className="bg-white border rounded-xl p-4">{children}</div>
    </div>
  );
}

// src/templates/DashboardTemplate.jsx
import React from "react";

export default function DashboardTemplate({ title, subtitle, kpis, children }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
      </div>

      {Array.isArray(kpis) && kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{kpis}</div>
      )}

      <div className="space-y-4">{children}</div>
    </div>
  );
}

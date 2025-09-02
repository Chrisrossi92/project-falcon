// src/templates/DetailTemplate.jsx
import React from "react";

export default function DetailTemplate({ title, subtitle, back, headerRight, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {back}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

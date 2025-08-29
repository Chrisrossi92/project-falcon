// src/templates/ListTemplate.jsx
import React from "react";

export default function ListTemplate({ title, subtitle, toolbar, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

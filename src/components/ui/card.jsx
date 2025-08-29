// src/components/ui/Card.jsx
import React from "react";

export default function Card({ title, subtitle, children, footer, className = "" }) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <div className="text-sm font-medium">{title}</div>}
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="mt-3 pt-3 border-t">{footer}</div>}
    </div>
  );
}





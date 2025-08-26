// src/components/DashboardCard.jsx
import React from "react";

/**
 * DashboardCard — simple stat card.
 * Props:
 *  - label: string
 *  - value: number|string
 *  - icon?: ReactNode
 */
export default function DashboardCard({ label, value, icon = null }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      {icon ? <div className="text-2xl opacity-70">{icon}</div> : null}
    </div>
  );
}


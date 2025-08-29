// src/components/ui/SectionHeader.jsx
import React from "react";

/**
 * SectionHeader — reusable header row for tables/sections shown inside a card.
 * Props:
 *  - title: string
 *  - subtitle?: string
 *  - actions?: ReactNode (buttons, links, etc.)
 *  - compact?: boolean (smaller padding)
 */
export default function SectionHeader({ title, subtitle, actions, compact = false }) {
  return (
    <div className={`mb-2 ${compact ? "pt-1 pb-2" : "pt-2 pb-3"}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500 truncate">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-2 h-px bg-gradient-to-r from-gray-200 to-transparent" />
    </div>
  );
}

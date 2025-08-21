// src/components/ui/CalendarLegend.jsx
import React from 'react';

export default function CalendarLegend() {
  const Item = ({ emoji, label }) => (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <span className="text-lg leading-none">{emoji}</span>
      <span>{label}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Item emoji="📍" label="Site Visit" />
      <Item emoji="🔍" label="Due for Review" />
      <Item emoji="⏰" label="Due to Client" />
    </div>
  );
}

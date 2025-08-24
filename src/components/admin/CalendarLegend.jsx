import React from 'react';

const Item = ({ icon, label }) => (
  <div className="flex items-center gap-2 text-xs text-gray-700">
    <span className="text-base">{icon}</span>
    <span>{label}</span>
  </div>
);

export default function CalendarLegend({ appraisers = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Item icon="📍" label="Site Visit" />
      <Item icon="📝" label="Review Due" />
      <Item icon="🚨" label="Due to Client" />
      {appraisers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span className="text-gray-500">Appraisers:</span>
          <div className="flex flex-wrap gap-2">
            {appraisers.map(a => (
              <span key={a.id} className="inline-flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: a.color }} />
                <span className="truncate max-w-[9rem]">{a.name || a.display_name || a.id.slice(0,8)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

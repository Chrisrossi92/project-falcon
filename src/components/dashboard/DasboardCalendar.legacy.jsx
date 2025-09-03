// src/components/DashboardCalendar.jsx
import React, { useMemo } from "react";

function fmtDate(d) {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
function fmtTime(d) {
  try {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function DashboardCalendar({ events = [] }) {
  // group by YYYY-MM-DD
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const iso = e.date.toISOString().slice(0, 10);
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso).push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(0, 30); // show next ~30 groups max
  }, [events]);

  if (!groups.length) {
    return (
      <div className="border rounded-lg p-4 text-sm text-gray-600">
        No upcoming events.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center gap-4 text-sm">
        <span className="font-medium">Legend:</span>
        <LegendDot label="Site Visit" icon="📍" />
        <LegendDot label="Due for Review" icon="🧐" />
        <LegendDot label="Due to Client" icon="🚨" />
      </div>

      <div className="divide-y">
        {groups.map(([iso, list]) => {
          const d = new Date(iso + "T00:00:00");
          return (
            <div key={iso} className="p-4">
              <div className="text-xs text-gray-500 mb-2">{fmtDate(d)}</div>
              <ul className="space-y-2">
                {list.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border px-3 py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">
                        {e.type === "site_visit"
                          ? "📍"
                          : e.type === "review_due"
                          ? "🧐"
                          : "🚨"}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{e.label}</span>
                        <span className="text-xs text-gray-500">
                          {e.meta?.client ? `${e.meta.client} • ` : ""}
                          {e.meta?.who || ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">{fmtTime(e.date)}</div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendDot({ label, icon }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-700">
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </span>
  );
}









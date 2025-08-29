// src/components/dashboard/DashboardSplit.jsx
import React, { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * DashboardSplit
 * Two-column layout with a LEFT card that can switch between modes
 * (e.g., Calendar / Upcoming), and a RIGHT card (e.g., Orders table).
 *
 * Props:
 *  - modes: {
 *      [key: string]: { label: string, render: () => React.ReactNode }
 *    }
 *  - initial?: string                 // default mode key
 *  - leftTitles?: Record<string,string>    // e.g., { calendar: "Calendar", upcoming: "Upcoming Events" }
 *  - leftSubtitles?: Record<string,string> // optional per-mode subtitles
 *  - right: () => React.ReactNode      // contents of the right card (include its own SectionHeader inside)
 */
export default function DashboardSplit({
  modes = {},
  initial,
  leftTitles = {},
  leftSubtitles = {},
  right,
}) {
  const keys = Object.keys(modes);
  const [mode, setMode] = useState(
    initial && keys.includes(initial) ? initial : keys[0] || null
  );

  const title = leftTitles[mode] || modes[mode]?.label || "";
  const subtitle = leftSubtitles[mode] || "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* LEFT card */}
      <div className="bg-white border rounded-xl p-3">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          actions={
            keys.length > 1 ? (
              <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                {keys.map((k, i) => {
                  const active = k === mode;
                  return (
                    <button
                      key={k}
                      onClick={() => setMode(k)}
                      className={[
                        "text-sm px-3 py-1.5",
                        active
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50",
                        i !== 0 ? "border-l border-gray-200" : "",
                      ].join(" ")}
                    >
                      {modes[k].label}
                    </button>
                  );
                })}
              </div>
            ) : null
          }
        />
        <div>{mode && modes[mode]?.render?.()}</div>
      </div>

      {/* RIGHT card (caller provides header/content) */}
      <div className="bg-white border rounded-xl p-3 overflow-hidden">
        {right?.()}
      </div>
    </div>
  );
}


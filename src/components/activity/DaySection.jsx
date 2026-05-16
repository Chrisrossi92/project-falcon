// DaySection.jsx
import React from "react";
import Row from "./Row";
import { buildTimelineNodes } from "./timelineIntelligence";

export default function DaySection({ label, items }) {
  const nodes = buildTimelineNodes(items);

  return (
    <div className="space-y-2.5">
      <div className="sticky top-0 z-10 -mx-3 border-b border-slate-100 bg-slate-50/95 px-3 py-1.5 backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      </div>
      <div className="space-y-2.5">
        {nodes.map((node) => {
          if (node.type === "moment") {
            return (
              <div
                key={node.key}
                className="rounded-2xl border border-slate-200 bg-white/85 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
              >
                <div className="mb-2 flex items-center gap-2 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Operational moment
                  </div>
                </div>
                <div className="space-y-2">
                  {node.items.map((item, index) => (
                    <Row
                      key={item.id || `${item.event_type}-${item.created_at}-${index}`}
                      item={item}
                      grouped
                    />
                  ))}
                </div>
              </div>
            );
          }

          return <Row key={node.key} item={node.item} />;
        })}
      </div>
    </div>
  );
}

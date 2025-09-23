import React from "react";

const PALETTE = {
  amc: {
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    strip: "bg-indigo-500/70",
    kpiRing: "ring-indigo-200",
  },
  lender: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    strip: "bg-emerald-500/70",
    kpiRing: "ring-emerald-200",
  },
  other: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    strip: "bg-slate-400/70",
    kpiRing: "ring-slate-200",
  },
};

export default function ClientHeader({ name, category = "other", onOpen }) {
  const c = PALETTE[category] || PALETTE.other;

  return (
    <div className="relative rounded-t-xl overflow-hidden">
      {/* subtle color strip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${c.strip}`} />

      <div className="flex items-start justify-between px-4 pt-3 pb-2 bg-slate-50/80">
        <div className="min-w-0">
          {/* two-line clamp without needing a Tailwind plugin */}
          <div
            className="font-medium text-[15px] leading-tight break-words"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={name}
          >
            {name || "—"}
          </div>
          <span
            className={`inline-flex items-center mt-2 text-[11px] px-2 py-0.5 rounded border ${c.badge}`}
          >
            {category === "amc" ? "AMC" : category === "lender" ? "Lender" : "Client"}
          </span>
        </div>

        <button
          onClick={onOpen}
          className="shrink-0 text-xs border rounded px-2.5 py-1 hover:bg-white"
        >
          View Client
        </button>
      </div>
    </div>
  );
}

// expose palette key so cards can tint KPI rings similarly
export const headerPalette = PALETTE;

// Badges.jsx
import React from "react";
import { hsl, colorForUser } from "./utils";

export function TypeBadge({ type = "system" }) {
  const map = {
    system: { label: "System", bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
    user:   { label: "User",   bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    partb:  { label: "Part-B", bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  };
  const t = map[type] || map.user;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: t.bg, color: t.text, border: `1px solid ${t.border}` }}
    >
      {t.label}
    </span>
  );
}

export function UserBadge({ nameOrId, email }) {
  const seed = email || nameOrId || "";
  const c = colorForUser(seed);
  const bg = hsl({ h: c.h, s: c.s, l: c.l });
  const br = hsl({ h: c.h, s: c.s, l: c.borderL });
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      title={nameOrId}
      style={{ backgroundColor: bg, color: c.text, border: `1px solid ${br}` }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: br }} />
      {nameOrId}
    </span>
  );
}

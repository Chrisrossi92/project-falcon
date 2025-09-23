import React from "react";

/** deterministic fallback color from a string */
function hashToHsl(str = "", s = 60, l = 52) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return `hsl(${Math.abs(h) % 360} ${s}% ${l}%)`;
}

/** pick black/white for readability based on bg lightness */
function textForBg(color) {
  if (color.startsWith("hsl")) {
    const l = Number(color.split(" ")[2]?.replace("%", "")) || 50;
    return l < 60 ? "#fff" : "#111827";
  }
  const hex = color.replace("#", "").padEnd(6, "0");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y < 140 ? "#fff" : "#111827";
}

export default function AvatarBadge({
  name = "User",
  email = "",
  id = "",
  color,           // preferred hex/hsl from users.display_color
  src,             // optional photo URL
  size = 40,
  ring = true,
  className = "",
}) {
  const initials = (name || email || "U")
    .split(" ")
    .map((x) => x.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fallback = hashToHsl(email || id || name);
  const bg = (color || "").trim() || fallback;
  const fg = textForBg(bg);

  if (src) {
    return (
      <div
        className={`rounded-full ${className}`}
        style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${bg}` : undefined }}
        title={name}
      >
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" draggable={false} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        boxShadow: ring ? "0 0 0 1px inset rgba(0,0,0,0.04)" : undefined,
      }}
      title={name}
    >
      <span style={{ fontSize: Math.max(11, Math.floor(size * 0.4)) }}>{initials}</span>
    </div>
  );
}

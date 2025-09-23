import React, { useEffect, useMemo, useRef, useState } from "react";

const ITEMS = [
  { id: "orders",    label: "Go to Orders",          hint: "g o", to: "/orders" },
  { id: "calendar",  label: "Go to Calendar",        hint: "g c", to: "/calendar" },
  { id: "clients",   label: "Go to Clients",         hint: "g l", to: "/clients" },
  { id: "users",     label: "Go to Users",           hint: "g u", to: "/users" },
  { id: "settings",  label: "Open Settings",         hint: ",",   to: "/settings" },
  { id: "notif",     label: "Notification Settings", hint: "",    to: "/settings/notifications" },
];

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ]   = useState("");
  const [idx, setI] = useState(0);
  const inputRef    = useRef(null);

  // Filter first so effects can depend on it safely
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ITEMS;
    return ITEMS.filter((it) => it.label.toLowerCase().includes(needle));
  }, [q]);

  // Reset & focus when opened
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard handling (Esc, arrows, Enter)
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setI((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setI((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[idx];
        if (item) {
          onNavigate?.(item.to);
        } else if (q.trim()) {
          onNavigate?.(`/orders?q=${encodeURIComponent(q.trim())}`);
        } else {
          onClose?.();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx, q, filtered, onNavigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="mx-auto mt-24 w-full max-w-xl rounded-2xl border bg-white shadow-xl relative">
        <div className="px-3 py-2 border-b">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search… (Orders, Clients, Users, Settings)"
            className="w-full outline-none text-sm px-1.5 py-1.5"
          />
        </div>
        <ul className="max-h-72 overflow-auto py-2">
          {filtered.map((it, i) => (
            <li
              key={it.id}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                i === idx ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => setI(i)}
              onClick={() => onNavigate?.(it.to)}
            >
              <span>{it.label}</span>
              {it.hint && (
                <span className="text-[10px] rounded border px-1 py-0.5 text-gray-400">{it.hint}</span>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-sm text-gray-500">
              Press Enter to search Orders for “{q}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}


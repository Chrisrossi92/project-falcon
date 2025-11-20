// src/features/orders/columns/useColumnsConfig.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import getColumnsForRole from "./ordersColumns";

// bump so everyone gets new defaults once
const KEY = (role) => `falcon:columns:v6:${role}`;

export default function useColumnsConfig(role, actionsCell) {
  const defaults = useMemo(() => getColumnsForRole(role, actionsCell), [role, actionsCell]);

  // safe hydrate
  const [active, setActive] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY(role));
      if (!raw) return defaults;
      const stored = JSON.parse(raw);
      if (!Array.isArray(stored.active)) return defaults;

      // rebuild by key (always take current header/cell/locked)
      const dict = new Map(defaults.map((c) => [c.key, c]));
      const rebuilt = stored.active
        .map((s) => {
          const base = dict.get(s.key);
          if (!base) return null;
          return { ...base, width: s.width || base.width };
        })
        .filter(Boolean);

      // ensure all defaults exist
      defaults.forEach((d) => {
        if (!rebuilt.find((c) => c.key === d.key)) rebuilt.push(d);
      });

      return rebuilt;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(KEY(role), JSON.stringify({ active })); } catch {}
  }, [active, role]);

  // --- drag to reorder
  const dragIndex = useRef(null);
  function onDragStart(i) { dragIndex.current = i; }
  function onDragOver(e) { e.dataTransfer.dropEffect = "move"; }
  function onDrop(i) {
    if (dragIndex.current == null) return;
    const from = dragIndex.current, to = i;
    if (from === to) return;
    setActive((cols) => {
      const next = cols.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragIndex.current = null;
  }

  // --- resize: start / move / end
  const resizeRef = useRef(null); // { key, startX, startW }
  function startResize(key, startX, startW) {
    resizeRef.current = { key, startX, startW: Math.max(80, Math.round(startW)) };
  }
  function resizeTo(clientX) {
    const r = resizeRef.current;
    if (!r) return;
    const delta = clientX - r.startX;
    const nextPx = Math.max(120, Math.min(520, r.startW + delta)); // clamp
    setActive((cols) =>
      cols.map((c) => (c.key === r.key ? { ...c, width: `${nextPx}px` } : c))
    );
  }
  function endResize() {
    resizeRef.current = null;
  }

  return {
    active,
    onDragStart,
    onDragOver,
    onDrop,
    startResize,
    resizeTo,
    endResize,
  };
}



// src/features/orders/columns/useColumnsConfig.jsx
import { useEffect, useMemo, useState } from "react";
import { getColumnsForRole } from "./ordersColumns";

// Each role gets its own saved state
const keyFor = (role) => `cols:orders:${role}`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Manages per-role columns: order, width, visibility.
 * - role: "admin" | "reviewer" | "appraiser"
 * - actionsCell: fn(row)->JSX
 * Returns: { active, defaults, startResize, endResize, onDrag*, saveOrder, toggle, reset }
 */
export default function useColumnsConfig(role, actionsCell) {
  const STORAGE_KEY = keyFor(role);

  // Defaults from registry
  const defaults = useMemo(() => getColumnsForRole(role, actionsCell), [role, actionsCell]);
  const defaultMap = useMemo(() => {
    const m = new Map();
    defaults.forEach((d) => m.set(d.key, d));
    return m;
  }, [defaults]);

  // Load saved
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setSaved(raw ? JSON.parse(raw) : null);
    } catch {
      setSaved(null);
    }
  }, [STORAGE_KEY]);

  // Build active columns from defaults + saved (keeps any new columns that weren't saved)
  const active = useMemo(() => {
    // saved model: [{ key, width, hidden }]
    const byKey = new Map();
    defaults.forEach((d) => {
      byKey.set(d.key, { ...d, width: d.width || "160px", hidden: false, locked: !!d.locked });
    });

    const list = [];
    if (saved && Array.isArray(saved)) {
      saved.forEach((s) => {
        const d = byKey.get(s.key);
        if (!d) return;
        const width = typeof s.width === "number" ? `${s.width}px` : s.width || d.width;
        list.push({ ...d, width, hidden: !!s.hidden });
        byKey.delete(s.key);
      });
    }

    // add any new defaults not in saved
    byKey.forEach((d) => list.push(d));

    // only visible columns in this table
    return list.filter((c) => !c.hidden);
  }, [defaults, saved]);

  // Persist order/width
  function persist(nextList) {
    const payload = nextList.map((c) => ({
      key: c.key,
      width: c.width,
      hidden: !!c.hidden,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaved(payload);
  }

  // -------- resize ----------
  const [resizing, setResizing] = useState(null); // { key, startX, startW }
  function startResize(key, startX) {
    const col = active.find((c) => c.key === key);
    if (!col) return;
    const startW = parseInt(col.width, 10) || 160;
    setResizing({ key, startX, startW });
  }
  function endResize(clientX) {
    if (!resizing) return;
    const delta = clientX - resizing.startX;
    const nextW = clamp(resizing.startW + delta, 100, 640); // min/max px
    const next = active.map((c) =>
      c.key === resizing.key ? { ...c, width: `${nextW}px` } : c
    );
    persist(next);
    setResizing(null);
  }

  // -------- reorder ----------
  const [dragIdx, setDragIdx] = useState(null);
  function onDragStart(idx) { setDragIdx(idx); }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(idx) {
    if (dragIdx == null || dragIdx === idx) return;
    // prevent moving locked column
    if (active[dragIdx]?.locked || active[idx]?.locked) {
      setDragIdx(null);
      return;
    }
    const next = [...active];
    const [item] = next.splice(dragIdx, 1);
    next.splice(idx, 0, item);
    persist(next);
    setDragIdx(null);
  }

  // Toggle visibility (if you want to add checkboxes later)
  function toggle(key, hidden) {
    const full = saved && Array.isArray(saved)
      ? [...saved]
      : defaults.map((d) => ({ key: d.key, width: d.width || "160px", hidden: false }));
    const i = full.findIndex((x) => x.key === key);
    if (i >= 0) full[i] = { ...full[i], hidden: !!hidden };
    else full.push({ key, width: "160px", hidden: !!hidden });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    setSaved(full);
  }

  function saveOrder(orderKeys) {
    const full = (saved && Array.isArray(saved))
      ? saved.map((s) => ({ ...s }))
      : defaults.map((d) => ({ key: d.key, width: d.width || "160px", hidden: false }));
    // maintain widths/hidden, just reorder by given keys
    const mapS = new Map(full.map((s) => [s.key, s]));
    const next = [];
    orderKeys.forEach((k) => {
      const s = mapS.get(k);
      if (s) next.push(s);
      mapS.delete(k);
    });
    mapS.forEach((s) => next.push(s));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next);
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
  }

  return {
    defaults,
    active,
    startResize,
    endResize,
    onDragStart,
    onDragOver,
    onDrop,
    saveOrder,
    toggle,
    reset,
  };
}

// src/features/orders/columns/ColumnPicker.jsx
import React, { useMemo, useState } from "react";

/**
 * Small column picker:
 * - shows current order + visibility
 * - up/down arrows to reorder
 * - checkboxes to show/hide
 * - Save persists order (visible only) via hook.save(nextKeys)
 */
export default function ColumnPicker({ defaults, saved, onSaveOrder, onToggle, onReset }) {
  const initial = useMemo(() => {
    // derive working list from saved or defaults
    const visibleKeys = saved && Array.isArray(saved)
      ? saved.filter((s) => !s.hidden).map((s) => s.key)
      : defaults.map((d) => d.key);
    return visibleKeys;
  }, [saved, defaults]);

  const [order, setOrder] = useState(initial);

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    const [item] = next.splice(idx, 1);
    next.splice(j, 0, item);
    setOrder(next);
  }

  return (
    <div className="border rounded-lg bg-white shadow p-3 w-[320px]">
      <div className="text-sm font-semibold mb-2">Columns</div>

      <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
        {defaults.map((d) => {
          const hidden = saved?.find((s) => s.key === d.key)?.hidden === true;
          const idx = order.indexOf(d.key);
          const inOrder = idx !== -1 && !hidden;

          return (
            <div key={d.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!hidden}
                  onChange={(e) => onToggle(d.key, !e.target.checked)}
                />
                <span className="truncate max-w-[160px]">{d.header()}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="px-1 py-0.5 border rounded text-xs disabled:opacity-30"
                  disabled={!inOrder || idx === 0}
                  onClick={() => move(idx, -1)}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="px-1 py-0.5 border rounded text-xs disabled:opacity-30"
                  disabled={!inOrder || idx === order.length - 1}
                  onClick={() => move(idx, +1)}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button className="px-2 py-1 text-xs border rounded" onClick={onReset}>Reset</button>
        <button
          className="px-2 py-1 text-xs border rounded bg-black text-white"
          onClick={() => onSaveOrder(order)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

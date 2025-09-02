// src/components/dashboard/DraggableGrid.jsx
import React, { useEffect, useMemo, useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

/**
 * Draggable/resizable dashboard grid.
 * Props:
 *  - items: [{ key: 'calendar', component: <Calendar/>, minW, minH, default: {x,y,w,h} }, ...]
 *  - storageKey: string  (localStorage persistence)
 *  - isEditing: boolean  (toggle drag/resize on/off)
 */
export default function DraggableGrid({ items = [], storageKey = "falcon-layout", isEditing = false }) {
  const defaults = useMemo(() => items.map(it => ({ i: it.key, ...(it.default || { x:0,y:0,w:6,h:8 }), minW: it.minW || 3, minH: it.minH || 4 })), [items]);
  const [layout, setLayout] = useState(defaults);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved) && saved.length) setLayout(saved);
    } catch {}
  }, [storageKey]);

  function onLayoutChange(next) {
    setLayout(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }

  return (
    <div className="bg-white border rounded-xl p-2">
      <GridLayout
        className="layout"
        cols={12}
        rowHeight={24}
        width={1200}
        isDraggable={isEditing}
        isResizable={isEditing}
        margin={[12, 12]}
        layout={layout}
        onLayoutChange={onLayoutChange}
        draggableCancel=".dg-static"
      >
        {items.map(it => (
          <div key={it.key} data-grid={layout.find(l => l.i === it.key)} className="rounded border p-2 overflow-auto">
            <div className="dg-static flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{it.title}</div>
              {isEditing && <div className="text-xs text-gray-500">drag/resize</div>}
            </div>
            <div>{it.component}</div>
          </div>
        ))}
      </GridLayout>
      {!isEditing && <div className="text-xs text-gray-500 mt-2">Tip: Use Customize to rearrange.</div>}
    </div>
  );
}

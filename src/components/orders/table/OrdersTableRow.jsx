// src/components/orders/table/OrdersTableRow.jsx
import React from "react";

const INTERACTIVE_TAGS = new Set([
  "A","BUTTON","SELECT","INPUT","TEXTAREA","LABEL","svg","path",
]);

function isInteractiveTarget(path) {
  for (const el of path) {
    if (!el || !el.tagName) continue;
    if (INTERACTIVE_TAGS.has(el.tagName.toUpperCase())) return true;
    if (el.isContentEditable) return true;
    if (el.closest && (el.closest("[data-no-drawer]") || el.closest("[data-interactive]"))) return true;
  }
  return false;
}

/**
 * OrdersTableRow
 * - Renders a clickable main row
 * - If isOpen, shows an inline drawer region directly beneath
 */
export default function OrdersTableRow({
  order,
  isOpen = false,
  onToggle,
  renderCells,   // (order) => node
  drawer,        // node
  className = "",
}) {
  return (
    <>
      <div
        onClick={(e) => {
          const path = e.composedPath ? e.composedPath() : [e.target];
          if (isInteractiveTarget(path)) return; // ignore clicks on controls
          onToggle?.();
        }}
        className={
          "group border-b cursor-pointer select-none transition-all duration-150 ease-out hover:bg-muted/50 active:scale-[0.997] px-4 " +
          className
        }
        role="row"
        aria-expanded={isOpen ? "true" : "false"}
      >
        {renderCells?.(order)}
      </div>

      {isOpen && (
        <div role="region" aria-label="Order inline details" className="border-b bg-slate-50/60 px-4 py-3">
          <div className="rounded-lg border bg-white shadow-sm p-3" data-no-drawer>
            {drawer}
          </div>
        </div>
      )}
    </>
  );
}













// src/components/orders/table/OrdersTableRow.jsx
const INTERACTIVE_TAGS = new Set([
  "A",
  "BUTTON",
  "SELECT",
  "INPUT",
  "TEXTAREA",
  "LABEL",
  "svg",
  "path",
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

export default function OrdersTableRow({
  order,
  onOpenDrawer,
  renderCells,
  className = "",
}) {
  return (
    <div
      onClick={(e) => {
        const path = e.composedPath ? e.composedPath() : [e.target];
        if (isInteractiveTarget(path)) return; // ignore clicks on controls
        onOpenDrawer?.();
      }}
      className={
        "group border-b cursor-pointer select-none transition-all duration-150 ease-out " +
        "hover:bg-muted/50 active:scale-[0.997] " +
        "px-4 " +
        className
      }
    >
      {renderCells?.(order)}
    </div>
  );
}










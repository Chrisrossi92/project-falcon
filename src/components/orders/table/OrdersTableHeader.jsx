// src/components/orders/table/OrdersTableHeader.jsx
export default function OrdersTableHeader({
  // Order/Status 100 | Fee 100 | Client/Type/Address min 360 (grows) | Appraiser 140 | Dates 200
  GRID = "grid grid-cols-[100px_100px_minmax(360px,1fr)_140px_200px]",
}) {
  return (
    <div
      className={`sticky top-0 z-10 bg-white/95 backdrop-blur border-b ${GRID}
                  items-center gap-3 py-2 px-4 text-[13px] font-medium text-muted-foreground`}
      role="row"
    >
      <div>Order / Status</div>
      <div className="text-right">Fee</div>
      <div>Client / Type / Address</div>
      <div>Appraiser</div>
      <div>Dates</div>
    </div>
  );
}



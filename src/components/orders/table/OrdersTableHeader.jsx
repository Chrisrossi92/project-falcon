// src/components/orders/table/OrdersTableHeader.jsx
export default function OrdersTableHeader() {
  return (
    <div
      className={`sticky top-0 z-10 bg-white/95 backdrop-blur border-b
                  grid grid-cols-[120px_90px_220px_360px_140px_200px]
                  items-center gap-3 py-2 px-4 text-[13px] font-medium text-muted-foreground`}
      role="row"
    >
      <div>Order / Status</div>
      <div className="text-right">Fee</div>
      <div>Client</div>
      <div>Address</div>
      <div>Appraiser</div>
      <div>Dates</div>
    </div>
  );
}



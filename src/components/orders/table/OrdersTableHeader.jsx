// src/components/orders/table/OrdersTableHeader.jsx
export default function OrdersTableHeader() {
  return (
    <div
      className="sticky top-0 z-10 bg-white border-b text-[13px] grid
                 grid-cols-[120px_180px_minmax(320px,1fr)_140px_180px_130px]
                 items-center gap-4 px-4 py-2 font-medium text-muted-foreground"
    >
      <div>Order / Status</div>
      <div>Client</div>
      <div>Address</div>
      <div>Type</div>
      <div>Appointment</div>
      <div>Due</div>
    </div>
  );
}










// src/components/orders/table/OrdersTableHeader.jsx
export default function OrdersTableHeader() {
  return (
    <div className="sticky top-0 z-10 bg-white border-b text-[13px] flex items-center gap-4 px-4 py-2 font-medium text-muted-foreground">
      <div className="basis-28 shrink-0">Order</div>
      <div className="grow">
        Client / Address <span className="ml-1 text-xs text-muted-foreground">(Due)</span>
      </div>
      <div className="basis-40 shrink-0">Appointment</div>
      <div className="basis-16 shrink-0">Send</div>
    </div>
  );
}








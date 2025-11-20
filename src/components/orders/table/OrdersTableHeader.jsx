export default function OrdersTableHeader() {
  return (
    <div
      role="row"
      className={[
        "sticky top-0 z-10 bg-white/95 backdrop-blur border-b",
        // grid tracks must match the row
        "grid grid-cols-[120px_220px_360px_260px_140px_200px]",
        "items-center gap-3 px-4 py-2.5",
        "text-[12.5px] leading-5 font-semibold text-gray-700 tracking-wide",
      ].join(" ")}
    >
      <div>ORDER / STATUS</div>
      <div>CLIENT</div>
      <div>ADDRESS</div>
      <div>PROPERTY / REPORT TYPE</div>
      <div className="text-right">FEE</div>
      <div className="text-right">DATES</div>
    </div>
  );
}





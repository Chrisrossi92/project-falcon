import React from "react";

export default function OrdersTableHeader() {
  return (
    <thead className="bg-muted/40">
      <tr className="text-[12px] uppercase tracking-wide text-muted-foreground">
        <th className="px-3 py-2 text-left font-semibold">Order / Client / Address</th>
        <th className="px-3 py-2 text-left font-semibold">Quick action</th>
        <th className="px-3 py-2 text-left font-semibold">Due</th>
      </tr>
    </thead>
  );
}






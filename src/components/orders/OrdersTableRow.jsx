// src/components/orders/OrdersTableRow.jsx
import React from "react";

export default function OrdersTableRow({ order, onOpenDrawer, renderCells }) {
  return (
    <tr className="border-b hover:bg-slate-50">
      {renderCells
        ? renderCells(order)
        : (
          <>
            <td className="py-2 pr-2">{order.order_no ?? "—"}</td>
            <td className="py-2 pr-2">
              <div className="font-medium">{order.client_name ?? "—"}</div>
              <div className="text-muted-foreground">{order.display_subtitle ?? "—"}</div>
            </td>
            <td className="py-2 pr-2">{order.appraiser_name ?? "—"}</td>
            <td className="py-2 pr-2">{order.status ?? "—"}</td>
            <td className="py-2 pr-2 text-right">{order.due_date ?? "—"}</td>
            <td className="py-2 pl-2 text-right">{order.fee_amount ?? "—"}</td>
            <td className="py-2 pl-2 text-right">
              <button className="text-blue-600 hover:underline" onClick={() => onOpenDrawer?.(order)}>
                Open
              </button>
            </td>
          </>
        )
      }
    </tr>
  );
}














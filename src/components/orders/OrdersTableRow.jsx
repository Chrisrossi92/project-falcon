// src/components/orders/OrdersTableRow.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";
import { canEditOrder, canDeleteOrder } from "@/lib/utils/permissions";

export default function OrdersTableRow({
  order,
  hideAppraiserColumn,
  isSelected,
  onRowClick,
  onDeleteOrder,
  effectiveRole,
  userId,
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Main row */}
      <tr
        onClick={onRowClick}
        className={`border-b hover:bg-gray-50 cursor-pointer ${
          isSelected ? "bg-gray-100" : ""
        }`}
      >
        <td className="px-4 py-2">{order.id}</td>
        <td className="px-4 py-2">
          {order.client?.name || order.client_name || "—"}
        </td>
        <td className="px-4 py-2">{order.address}</td>
        <td className="px-4 py-2">
          {!hideAppraiserColumn
            ? order.appraiser?.name || order.appraiser_name || "—"
            : order.appraiser_split || "—"}
        </td>
        <td className="px-4 py-2 capitalize">{order.status || "—"}</td>
        <td className="px-4 py-2">
          {order.site_visit_date ? (
            formatDate(order.site_visit_date)
          ) : (
            canEditOrder(
              effectiveRole,
              order.appraiser_id,
              userId,
              order.status
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  alert("Site visit logic placeholder");
                }}
              >
                Set Site Visit
              </Button>
            )
          )}
        </td>
        <td className="px-4 py-2">
          {order.due_date ? formatDate(order.due_date) : "—"}
        </td>
        <td className="px-4 py-2">
          {canDeleteOrder(effectiveRole) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteOrder(order.id);
              }}
            >
              Delete
            </Button>
          )}
        </td>
      </tr>

      {/* Drawer row */}
      {isSelected && (
        <tr>
          <td colSpan={8} className="p-0">
            <div className="overflow-hidden animate-slideDown">
              <OrderDrawerContent data={order} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


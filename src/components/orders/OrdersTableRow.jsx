// src/components/orders/OrdersTableRow.jsx

import React from "react";
import AppointmentCell from "@/components/orders/AppointmentCell";
import { Button } from "@/components/ui/button";
import { canEditOrder, canDeleteOrder } from "@/lib/utils/permissions";

/**
 * OrdersTableRow.jsx
 *
 * A single row in the orders table.
 * - Clicking the row opens the inline drawer.
 * - AppointmentCell updates appointment date/time.
 */
export default function OrdersTableRow({
  order,
  hideAppraiserColumn,
  isSelected,
  onRowClick,
  onSetAppointment,
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
    <tr
      onClick={onRowClick}
      className={`border-b hover:bg-gray-50 cursor-pointer ${
        isSelected ? "bg-gray-100" : ""
      }`}
    >
      {/* ORDER ID */}
      <td className="px-4 py-2">{order.id}</td>

      {/* CLIENT */}
      <td className="px-4 py-2">
        {order.client?.name || order.client_name || "—"}
      </td>

      {/* ADDRESS */}
      <td className="px-4 py-2">{order.address || "—"}</td>

      {/* APPRAISER */}
      {!hideAppraiserColumn && (
        <td className="px-4 py-2">{order.appraiser_name || "—"}</td>
      )}

      {/* STATUS */}
      <td className="px-4 py-2">{order.status || "—"}</td>

      {/* APPOINTMENT CELL */}
      <td className="px-4 py-2">
        <AppointmentCell
          siteVisitAt={order.site_visit_at}
          onSetAppointment={(dateString) => {
            // Pass the order.id and updated date back up
            if (onSetAppointment) {
              onSetAppointment(order.id, dateString);
            }
          }}
        />
      </td>

      {/* DUE DATE */}
      <td className="px-4 py-2">{formatDate(order.due_date)}</td>

      {/* ACTIONS */}
      <td className="px-4 py-2 text-right">
        {canEditOrder(order, effectiveRole, userId) && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteOrder) {
                onDeleteOrder(order.id);
              }
            }}
          >
            Delete
          </Button>
        )}
      </td>
    </tr>
  );
}





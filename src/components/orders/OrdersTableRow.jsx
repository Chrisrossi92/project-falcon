// src/components/orders/OrdersTableRow.jsx

import React from "react";
import AppointmentCell from "@/components/orders/AppointmentCell";
import { Button } from "@/components/ui/button";
import { canEditOrder, canDeleteOrder } from "@/lib/utils/permissions";
import { Pencil, Eye } from "lucide-react";
import SendToReviewButton from "@/components/review/SendToReviewButton";

export default function OrdersTableRow({
  order,
  hideAppraiserColumn,
  isSelected,
  onRowClick,
  onSetAppointment,
  onDeleteOrder,
  effectiveRole,
  userId,
  onEdit,
  onView,
  currentUser,
  refreshOrders,
}) {
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  const showSendToReview =
    (effectiveRole === "admin" || effectiveRole === "appraiser") &&
    (order.status === "Needs Review" || order.status === "Inspected");

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
        {order.client?.name || order.manual_client || "—"}
      </td>

      {/* ADDRESS */}
      <td className="px-4 py-2">{order.address || "—"}</td>

      {/* APPRAISER */}
      {!hideAppraiserColumn && (
        <td className="px-4 py-2">
          {order.appraiser?.name || order.manual_appraiser || "—"}
        </td>
      )}

      {/* STATUS */}
      <td className="px-4 py-2">{order.status || "—"}</td>

      {/* APPOINTMENT */}
      <td className="px-4 py-2">
        <AppointmentCell
          siteVisitAt={order.site_visit_at}
          onSetAppointment={(dateString) => {
            if (onSetAppointment) {
              onSetAppointment(order.id, dateString);
            }
          }}
        />
      </td>

      {/* DUE DATE */}
      <td className="px-4 py-2">{formatDate(order.due_date)}</td>

      {/* ACTIONS */}
      <td className="px-4 py-2 align-middle w-[120px]">
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(order);
                }}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}

            {onView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(order);
                }}
                title="View"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showSendToReview && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <SendToReviewButton
                order={order}
                currentUser={currentUser}
                onAssignment={refreshOrders}
              />
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}







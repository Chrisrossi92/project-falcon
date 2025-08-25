// src/features/orders/OrdersTable.jsx
import React, { useMemo } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import PresentationalOrdersTable from "@/components/orders/OrdersTable";

const REVIEW_STATES = new Set(["in_review", "revisions", "ready_to_send"]);

/**
 * Adapter table for the Orders page.
 * Accepts lightweight filters and renders the shared presentational table.
 *
 * Props (all optional):
 *  - status: string | "__REVIEW__" (special token to show review states)
 *  - appraiserId: string
 *  - clientId: string
 *  - priority: string (reserved for future)
 *  - dueWindow: string (reserved for future)
 *  - includeArchived: boolean (reserved for future)
 */
export default function OrdersTable({
  status,
  appraiserId,
  clientId,
  priority,
  dueWindow,
  includeArchived,
}) {
  const { data: allOrders = [], loading, error, refetch } = useOrders();

  const rows = useMemo(() => {
    let list = Array.isArray(allOrders) ? allOrders : [];

    // Status filtering
    if (status === "__REVIEW__") {
      list = list.filter((o) => REVIEW_STATES.has(String(o.status || "").toLowerCase()));
    } else if (status && typeof status === "string") {
      const needle = status.toLowerCase();
      list = list.filter((o) => String(o.status || "").toLowerCase() === needle);
    }

    // Appraiser filter
    if (appraiserId) {
      list = list.filter((o) => String(o.appraiser_id || "") === String(appraiserId));
    }

    // Client filter
    if (clientId) {
      list = list.filter((o) => String(o.client_id || "") === String(clientId));
    }

    // Future hooks for priority/dueWindow/includeArchived can go here

    return list;
  }, [allOrders, status, appraiserId, clientId, priority, dueWindow, includeArchived]);

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load orders: {error.message}
      </div>
    );
  }

  return (
    <PresentationalOrdersTable
      orders={rows}
      loading={loading}
      onRefresh={refetch}
    />
  );
}











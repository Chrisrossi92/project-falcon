// src/components/orders/OrdersTable.jsx
import React, { useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";
import supabase from "@/lib/supabaseClient";

import OrdersTableHeader from "@/components/orders/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/OrdersTableRow";
import OrdersTablePagination from "@/components/orders/OrdersTablePagination";

export default function OrdersTable({
  orders,
  hideAppraiserColumn = false,
  role: propRole = "admin",
}) {
  const { user } = useSession();
  const { role } = useRole();
  const effectiveRole = role || propRole;

  // Local state
  const [localOrders, setLocalOrders] = useState(orders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;
  const totalPages = Math.ceil(localOrders.length / pageSize);
  const paginatedOrders = localOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // Delete order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      console.error("Error deleting order:", error);
    } else {
      const updatedOrders = localOrders.filter((o) => o.id !== orderId);
      setLocalOrders(updatedOrders);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    }
  };

  if (localOrders.length === 0) {
    return <p>No orders to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-700">
        <OrdersTableHeader hideAppraiserColumn={hideAppraiserColumn} />
        <tbody>
          {paginatedOrders.map((order) => (
            <OrdersTableRow
              key={order.id}
              order={order}
              hideAppraiserColumn={hideAppraiserColumn}
              isSelected={selectedOrder?.id === order.id}
              onRowClick={() =>
                setSelectedOrder(
                  selectedOrder?.id === order.id ? null : order
                )
              }
              onDeleteOrder={handleDeleteOrder}
              effectiveRole={effectiveRole}
              userId={user?.id}
            />
          ))}
        </tbody>
      </table>

      <OrdersTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        goToPage={goToPage}
      />
    </div>
  );
}


















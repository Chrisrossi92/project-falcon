import { useState } from "react";
import TableDrawer from "@/components/TableDrawer";
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';

export default function OrdersTable({ orders, hideAppraiserColumn = false, role = "admin" }) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRowClick = (orderId) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-700">
        <thead className="bg-gray-100 text-gray-800 uppercase text-xs">
          <tr>
            <th className="px-4 py-2">Order #</th>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Address</th>
            {!hideAppraiserColumn ? (
              <th className="px-4 py-2">Appraiser</th>
            ) : (
              <th className="px-4 py-2">Fee Split</th>
            )}
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <tr key={order.id}>
              <td colSpan={6}>
                <Card className="mb-4 cursor-pointer" onClick={() => handleRowClick(order.id)}>
                  <div className="grid grid-cols-6 gap-4 items-center px-4 py-2">
                    <div className="font-medium">{order.id}</div>
                    <div>{order.client_name}</div>
                    <div>{order.address}</div>
                    {!hideAppraiserColumn ? (
                      <div>{order.appraiser_name || "—"}</div>
                    ) : (
                      <div>{order.fee_split || "—"}</div>
                    )}
                    <div className="capitalize">{order.status || "—"}</div>
                    <div>{order.due_date ? new Date(order.due_date).toLocaleDateString() : "—"}</div>
                  </div>

                  {selectedOrderId === order.id && (
                    <div className="mt-4 border-t pt-4">
                      <TableDrawer
                        isOpen={true}
                        onClose={() => setSelectedOrderId(null)}
                        data={order}
                        type="order"
                        role={role}
                      />
                    </div>
                  )}
                </Card>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center mt-4 gap-4">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
















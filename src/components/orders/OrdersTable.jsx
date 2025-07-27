import { useState, useEffect } from "react";
import OrdersTableHeader from "@/components/orders/OrdersTableHeader";
import OrdersTableRow from "@/components/orders/OrdersTableRow";

import { Drawer } from "@/components/ui/drawer";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";



import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRole } from '@/lib/hooks/useRole';
import { canEditOrder, canDeleteOrder } from '@/lib/utils/permissions';

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
    // Sync localOrders when orders prop changes
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

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

      {/* Pagination */}
      <div className="flex justify-center items-center mt-4 gap-4">
        <Button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
        >
          Prev
        </Button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
        >
          Next
        </Button>
      </div>

      {/* Drawer for order details */}
      <Drawer open={!!selectedOrder} onOpenChange={(open) => !open && closeDrawer()}>
        <div className="max-h-[90vh] overflow-auto">
          {selectedOrder && (
            <OrderDrawerContent data={selectedOrder} />
          )}
        </div>
      </Drawer>

      {/* Dialog for Setting Site Visit */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Site Visit for Order #{selectedOrderForVisit?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full"
            />
            <Button onClick={handleSetVisit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


















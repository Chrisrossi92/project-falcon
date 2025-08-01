import React, { useState } from "react";
import OrdersTableRow from "@/components/orders/OrdersTableRow";
import OrdersTableHeader from "@/components/orders/OrdersTableHeader";
import OrdersTablePagination from "@/components/orders/OrdersTablePagination";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";
import InlineDrawer from "@/components/ui/InlineDrawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { updateSiteVisitAt } from "@/lib/api/orders";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";

export default function OrdersTable({
  orders,
  hideAppraiserColumn = false,
  role: propRole = "admin",
}) {
  const { user } = useSession();
  const { role } = useRole();
  const effectiveRole = role || propRole;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedOrderForVisit, setSelectedOrderForVisit] = useState(null);
  const [visitDate, setVisitDate] = useState("");

  const pageSize = 10;
  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleRowClick = (order) => {
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  const handleCloseDrawer = () => {
    setSelectedOrder(null);
  };

  const handleSetVisit = async () => {
    try {
      await updateSiteVisitAt(selectedOrderForVisit.id, visitDate);
      toast.success("Appointment date saved");
      setAppointmentDialogOpen(false);
      setSelectedOrderForVisit(null);
      setVisitDate("");
    } catch (error) {
      toast.error("Failed to save appointment");
    }
  };

  return (
    <div className="relative w-full">
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full bg-white text-sm text-left">
          <OrdersTableHeader hideAppraiserColumn={hideAppraiserColumn} />
          <tbody>
            {paginatedOrders.map((order) => (
              <React.Fragment key={order.id}>
                <OrdersTableRow
                  order={order}
                  userId={user?.id}
                  effectiveRole={effectiveRole}
                  hideAppraiserColumn={hideAppraiserColumn}
                  isSelected={selectedOrder?.id === order.id}
                  onRowClick={() => handleRowClick(order)}
                  onSetAppointment={async (order, newDateString) => {
  try {
    await updateSiteVisitAt(order.id, newDateString);
    toast.success("Appointment date saved");
    setSelectedOrder((prev) =>
      prev?.id === order.id ? { ...prev, site_visit_at: newDateString } : prev
    );
  } catch (err) {
    toast.error("Failed to save appointment");
  }
}}
                />
                {selectedOrder?.id === order.id && (
                  <tr>
                    <td colSpan={hideAppraiserColumn ? 7 : 8}>
                      <InlineDrawer isOpen={true}>
                        <OrderDrawerContent
                          data={selectedOrder}
                          onClose={handleCloseDrawer}
                        />
                      </InlineDrawer>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <OrdersTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Appointment Date</DialogTitle>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="mb-4"
          />
          <button
            onClick={handleSetVisit}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}







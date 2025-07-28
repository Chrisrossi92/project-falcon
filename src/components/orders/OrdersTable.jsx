import { useState } from "react";
import { Drawer, DrawerContent } from "vaul"; // Updated import to include DrawerContent
import OrderDrawerContent from '@/components/orders/OrderDrawerContent'; // Adjust path if needed
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRole } from '@/lib/hooks/useRole';
import { canEditOrder, canDeleteOrder } from '@/lib/utils/permissions';

export default function OrdersTable({ orders, hideAppraiserColumn = false, role: propRole = "admin" }) {
  const { user } = useSession();
  const { role } = useRole();
  
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedOrderForVisit, setSelectedOrderForVisit] = useState(null);
  const [visitDate, setVisitDate] = useState("");
  const handleSetVisit = () => {
    // Placeholder: implement saving visit logic
    setAppointmentDialogOpen(false);
  };
  const closeDrawer = () => {
    setSelectedOrder(null);
  };
const effectiveRole = role || propRole;

  // Local state
  const [localOrders, setLocalOrders] = useState(orders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(orders.length / pageSize);
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRowClick = (order) => {
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto border-separate border-spacing-y-2">
        <thead className="text-sm text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">Order #</th>
            <th className="px-4 py-2 text-left">Client</th>
            <th className="px-4 py-2 text-left">Address</th>
            {!hideAppraiserColumn && <th className="px-4 py-2 text-left">Appraiser</th>}
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Appointment</th>
            <th className="px-4 py-2 text-left">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <React.Fragment key={order.id}>
              <tr
                onClick={() => handleRowClick(order)}
                className={`cursor-pointer bg-white hover:shadow-md border border-gray-200 transition-all duration-200 ${
                  selectedOrder?.id === order.id ? "ring-2 ring-blue-300" : ""
                }`}
              >
                <td className="px-4 py-3">{order.id}</td>
                <td className="px-4 py-3">{order.client_name || "—"}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{order.address}</td>
                {!hideAppraiserColumn && <td className="px-4 py-3">{order.appraiser_name || "—"}</td>}
                <td className="px-4 py-3">{order.status}</td>
                <td className="px-4 py-3">
                  <AppointmentCell
  siteVisitAt={order.site_visit_at}
  onSetAppointment={async (newDateTime) => {
    await updateSiteVisitAt(order.id, newDateTime);
    const updated = await fetchSiteVisitAt(order.id);
    if (updated) {
      order.site_visit_at = updated.site_visit_at; // force rebind
      setSelectedOrder({ ...order }); // trigger re-render if needed
    }
  }}
/>
                </td>
                <td className="px-4 py-3">{order.due_date}</td>
              </tr>

              {selectedOrder?.id === order.id && (
                <tr>
                  <td colSpan={7}>
                    <InlineDrawer isOpen={true}>
                      <OrderDrawerContent data={selectedOrder} />
                    </InlineDrawer>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Drawer for order details */}
      <Drawer open={!!selectedOrder} onOpenChange={(open) => !open && closeDrawer()}>
        <DrawerContent className="max-h-[90vh] overflow-auto">
          {selectedOrder && (
            <OrderDrawerContent data={selectedOrder} />
          )}
        </DrawerContent>
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





















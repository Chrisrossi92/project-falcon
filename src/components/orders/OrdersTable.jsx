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
  const effectiveRole = role || propRole;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedOrderForVisit, setSelectedOrderForVisit] = useState(null);
  const [visitDate, setVisitDate] = useState('');
  const [localOrders, setLocalOrders] = useState(orders);
  const pageSize = 10;

  const totalPages = Math.ceil(localOrders.length / pageSize);
  const paginatedOrders = localOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRowClick = (order) => {
    setSelectedOrder(order);
  };

  const closeDrawer = () => {
    setSelectedOrder(null);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const openVisitDialog = (order) => {
    setSelectedOrderForVisit(order);
    setVisitDate('');
    setAppointmentDialogOpen(true);
  };

  const handleSetVisit = async () => {
    if (!visitDate || !selectedOrderForVisit) return;

    const { error } = await supabase
      .from('orders')
      .update({ site_visit_date: visitDate })
      .eq('id', selectedOrderForVisit.id);

    if (error) {
      console.error('Error setting site visit:', error);
    } else {
      const updatedOrders = localOrders.map(o =>
        o.id === selectedOrderForVisit.id ? { ...o, site_visit_date: visitDate } : o
      );
      setLocalOrders(updatedOrders);
    }

    setAppointmentDialogOpen(false);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting order:', error);
    } else {
      const updatedOrders = localOrders.filter(o => o.id !== orderId);
      setLocalOrders(updatedOrders);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  if (localOrders.length === 0) {
    return <p>No orders to display.</p>;
  }

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
            <th className="px-4 py-2">Site Visit</th>
            <th className="px-4 py-2">Due Date</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <tr key={order.id} onClick={() => handleRowClick(order)} className="border-b hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-2">{order.id}</td>
              <td className="px-4 py-2">{order.client?.name || order.client_name || "—"}</td>
              <td className="px-4 py-2">{order.address}</td>
              <td className="px-4 py-2">
                {!hideAppraiserColumn ? (
                  order.appraiser?.name || order.appraiser_name || "—"
                ) : (
                  order.appraiser_split || "—"
                )}
              </td>
              <td className="px-4 py-2 capitalize">{order.status || "—"}</td>
              <td className="px-4 py-2">
                {order.site_visit_date ? (
                  formatDate(order.site_visit_date)
                ) : (
                  canEditOrder(effectiveRole, order.appraiser_id, user?.id, order.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openVisitDialog(order);
                      }}
                    >
                      Set Site Visit
                    </Button>
                  )
                )}
              </td>
              <td className="px-4 py-2">{order.due_date ? formatDate(order.due_date) : "—"}</td>
              <td className="px-4 py-2">
                {canDeleteOrder(effectiveRole) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOrder(order.id);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
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
















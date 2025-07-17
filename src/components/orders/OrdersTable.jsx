import { useState } from "react";
import TableDrawer from "@/components/TableDrawer";
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';  // ShadCN dialog (install if needed: npx shadcn-ui@latest add dialog)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OrdersTable({ orders, hideAppraiserColumn = false, role = "admin" }) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedOrderForVisit, setSelectedOrderForVisit] = useState(null);
  const [visitDate, setVisitDate] = useState('');
  const [localOrders, setLocalOrders] = useState(orders);  // Local for optimistic updates
  const pageSize = 10;

  const totalPages = Math.ceil(localOrders.length / pageSize);
  const paginatedOrders = localOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleRowClick = (orderId) => {
    setSelectedOrderId(orderId === selectedOrderId ? null : orderId);
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
      .update({ site_visit_date: visitDate })  // Use date string; if timestamp, use new Date(visitDate).toISOString()
      .eq('id', selectedOrderForVisit.id);

    if (error) {
      console.error('Error setting site visit:', error);
      // Add error toast if available
    } else {
      const updatedOrders = localOrders.map(o =>
        o.id === selectedOrderForVisit.id ? { ...o, site_visit_date: visitDate } : o
      );
      setLocalOrders(updatedOrders);
    }

    setAppointmentDialogOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
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
            <th className="px-4 py-2">Site Visit</th>  {/* New column */}
            <th className="px-4 py-2">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map((order) => (
            <tr key={order.id}>
              <td colSpan={7}>  {/* Colspan 7 for new column */}
                <Card className="mb-4 cursor-pointer" onClick={() => handleRowClick(order.id)}>
                  <div className="grid grid-cols-7 gap-4 items-center px-4 py-2">  {/* grid-cols-7 */}
                    <div className="font-medium">{order.id}</div>
                    <div>{order.client?.name || order.client_name || "—"}</div>  {/* Adjusted for nested client */}
                    <div>{order.address}</div>
                    {!hideAppraiserColumn ? (
                      <div>{order.appraiser?.name || order.appraiser_name || "—"}</div>
                    ) : (
                      <div>{order.fee_split || "—"}</div>
                    )}
                    <div className="capitalize">{order.status || "—"}</div>
                    <div>
                      {order.site_visit_date ? (
                        formatDate(order.site_visit_date)
                      ) : (
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
                      )}
                    </div>
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

      {/* Pagination */}
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

      {/* Dialog for Setting Site Visit */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Site Visit for Order #{selectedOrderForVisit?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="date"  // Date picker; use "datetime-local" if time is needed
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
















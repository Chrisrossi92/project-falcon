// pages/OrderDetailForm.jsx
import { useOrderForm } from '@/lib/hooks/useOrderForm';
import OrderInfoFields from '@/components/orders/OrderInfoFields';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '@/lib/hooks/useSession';
import { canDeleteOrder } from '@/lib/utils/permissions';

export default function OrderDetailForm({ order, setOrder }) {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();

  const {
    clients,
    appraisers,
    clientId,
    manualClient,
    isCustomClient,
    reviewDueDate,
    setReviewDueDate,
    editedData,
    handleChange,
    handleClientChange,
    handleCustomClientNameChange,
    handleAppraiserSelect,
    handleSave,
    canEdit,
    role,
  } = useOrderForm({ order, setOrder });

  const handleDelete = async () => {
    if (!canDeleteOrder(role)) return;
    const confirmed = window.confirm('Are you sure you want to delete this order?');
    if (!confirmed) return;

    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      console.error('Failed to delete order:', error.message);
      alert('Could not delete order. Please try again.');
    } else {
      navigate('/orders');
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow">
        <OrderInfoFields
          editedData={editedData}
          handleChange={handleChange}
          handleAppraiserSelect={handleAppraiserSelect}
          currentUserRole={role}
          appraisers={appraisers}
          clients={clients}
          isCustomClient={isCustomClient}
          manualClient={manualClient}
          clientId={clientId}
          handleClientChange={handleClientChange}
          handleCustomClientNameChange={handleCustomClientNameChange}
          reviewDueDate={reviewDueDate}
          setReviewDueDate={setReviewDueDate}
          disabled={!canEdit}
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition"
            disabled={!canEdit}
          >
            Save
          </Button>

          {canDeleteOrder(role) && (
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 text-white px-6 py-2 rounded-md shadow hover:bg-red-700 transition"
            >
              Delete Order
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}







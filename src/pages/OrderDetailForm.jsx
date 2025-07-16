// OrderDetailForm.jsx (Merged: Full version with role-aware logic and appraiser fee calculation)

import { useEditableForm } from '@/lib/hooks/useEditableForm';
import { getUsers, getClients, updateOrder } from '@/lib/supabaseClient';
import ClientSelector from '@/components/clients/ClientSelector';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import OrderInfoFields from '@/components/orders/OrderInfoFields';
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';


export default function OrderDetailForm({ order, setOrder, currentUserRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(order.client_id ? String(order.client_id) : '');
  const { id: orderId } = useParams();
  const [appraiserId, setAppraiserId] = useState(order.appraiser_id || '');
  const [manualClient, setManualClient] = useState(order.manual_client || '');
  const [isCustomClient, setIsCustomClient] = useState(order.client_id === null);
  const [reviewDueDate, setReviewDueDate] = useState(order.review_due_date || '');
  const [appraisers, setAppraisers] = useState([]);
  const { user } = useSession();
  
  


  const {
    editedData,
    setEditedData,
    handleChange,
    updateField,
  } = useEditableForm(order);

  useEffect(() => {
    getClients().then(setClients);
    getUsers().then((data) => {
      const filtered = (data || []).filter((u) => u.role === 'appraiser');
      setAppraisers(filtered);
    });
  }, []);

  useEffect(() => {
    if (editedData.base_fee && editedData.appraiser_split) {
      const fee = (parseFloat(editedData.base_fee) || 0) * (parseFloat(editedData.appraiser_split) / 100);
      setEditedData((prev) => ({ ...prev, appraiser_fee: fee.toFixed(2) }));
    }
  }, [editedData.base_fee, editedData.appraiser_split]);

  const handleClientChange = (value) => {
    if (value === 'custom') {
      setIsCustomClient(true);
      setClientId('');
      setManualClient(''); // Reset manual on switch
      setEditedData((prev) => ({
        ...prev,
        client_id: null,
        manual_client: '',
      }));
    } else {
      setIsCustomClient(false);
      setClientId(value); // Keep as string for form
      setManualClient(''); // Clear manual when selecting registered client
      setEditedData((prev) => ({
        ...prev,
        client_id: value ? parseInt(value, 10) : null,
        manual_client: '',
      }));
    }
    console.log('Client change - value:', value, 'parsed:', parseInt(value, 10), 'editedData.client_id:', editedData.client_id);
  };

  const handleCustomClientNameChange = (value) => {
    setManualClient(value);
    setEditedData((prev) => ({
      ...prev,
      manual_client: value.trim(), // Trim to avoid whitespace issues
    }));
  };

  const handleAppraiserSelect = (e) => {
    const selectedUserId = e.target.value.trim(); // Appraiser IDs might be UUID strings, so no parseInt
    const selectedAppraiser = appraisers.find((user) => user.id === selectedUserId);

    if (selectedAppraiser) {
      setEditedData((prev) => ({
        ...prev,
        appraiser_id: selectedAppraiser.id,
        appraiser_split: selectedAppraiser.split ?? 0.5,
      }));
    } else {
      setEditedData((prev) => ({
        ...prev,
        appraiser_id: null,
        appraiser_split: '',
      }));
    }
  };

  const handleSave = async () => {
    // Validate custom client
    if (isCustomClient && !manualClient.trim()) {
      toast.error('Please enter a manual client name when selecting custom.');
      return;
    }

    // Log for debug
    console.log('Saving editedData:', editedData);

    try {
      const { data, error } = await updateOrder(editedData);
      if (error) {
        console.error('Update error:', error);
        toast.error(`Failed to save order: ${error.message}`);
      } else {
        toast.success("Order saved!");
        setOrder(data?.[0] || editedData);
        setTimeout(() => navigate(location.state?.from || '/orders'), 500);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Unexpected error occurred.");
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-lg shadow">
  <OrderInfoFields
    editedData={editedData}
    handleChange={handleChange}
    handleAppraiserSelect={handleAppraiserSelect}
    currentUserRole={currentUserRole}
    appraisers={appraisers}
    clients={clients}
    isCustomClient={isCustomClient}
    manualClient={manualClient}
    clientId={clientId}
    handleClientChange={handleClientChange}
    handleCustomClientNameChange={handleCustomClientNameChange}
    reviewDueDate={reviewDueDate}
    setReviewDueDate={setReviewDueDate}
  />

  <div className="flex justify-end gap-3 mt-6">
  <button
    type="submit"
    className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition"
  >
    Save
  </button>

  {user?.role === 'admin' && (
    <button
      type="button"
      onClick={async () => {
        const confirmed = window.confirm('Are you sure you want to delete this order?');
        if (!confirmed) return;

        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);

        if (error) {
          console.error('Failed to delete order:', error.message);
          alert('Could not delete order. Please try again.');
        } else {
          navigate('/orders');
        }
      }}
      className="bg-red-600 text-white px-6 py-2 rounded-md shadow hover:bg-red-700 transition"
    >
      Delete Order
    </button>
  )}
</div>
      </div>
    </form>
  );
}







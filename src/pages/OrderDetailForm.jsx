// OrderDetailForm.jsx (Merged: Full version with role-aware logic and appraiser fee calculation)

import { useEditableForm } from '@/lib/hooks/useEditableForm';
import { getUsers, getClients, updateOrder } from '@/lib/supabaseClient';
import ClientSelector from '@/components/clients/ClientSelector';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import OrderInfoFields from '@/components/orders/OrderInfoFields';

export default function OrderDetailForm({ order, setOrder, currentUserRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(order.client_id || '');
  const [appraiserId, setAppraiserId] = useState(order.appraiser_id || '');
  const [manualClient, setManualClient] = useState(order.manual_client || '');
  const [isCustomClient, setIsCustomClient] = useState(order.client_id === null);
  const [reviewDueDate, setReviewDueDate] = useState(order.review_due_date || '');
  const [appraisers, setAppraisers] = useState([]);

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
      setManualClient('');
      setEditedData((prev) => ({
        ...prev,
        client_id: null,
        manual_client: '',
      }));
    } else {
      const selectedClient = clients.find((c) => c.id === value);
      setIsCustomClient(false);
      setClientId(value);
      setManualClient('');
      setEditedData((prev) => ({
        ...prev,
        client_id: selectedClient?.id || null,
        manual_client: '',
      }));
    }
  };

  const handleCustomClientNameChange = (value) => {
    setManualClient(value);
    setEditedData((prev) => ({
      ...prev,
      manual_client: value,
    }));
  };

  const handleAppraiserSelect = (e) => {
    const selectedUserId = String(e.target.value).trim();
    const selectedAppraiser = appraisers.find((user) => String(user.id).trim() === selectedUserId);

    if (selectedAppraiser) {
      setEditedData((prev) => ({
        ...prev,
        appraiser_id: selectedAppraiser.id,
        appraiser_split: selectedAppraiser.split ?? 0.5,
      }));
    } else {
      setEditedData((prev) => ({
        ...prev,
        appraiser_id: '',
        appraiser_split: '',
      }));
    }
  };

  const handleSave = async () => {
    try {
      const { data, error } = await updateOrder(editedData);
      if (error) {
        toast.error("Failed to save order.");
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

  <div className="md:col-span-2 flex justify-end">
    <button
      type="submit"
      className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition"
    >
      Save
    </button>
  </div>
      </div>
    </form>
  );
}







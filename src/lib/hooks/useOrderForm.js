// lib/hooks/useOrderForm.js
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getUsers, getClients, updateOrder } from '@/lib/supabaseClient';
import { useEditableForm } from '@/lib/hooks/useEditableForm';
import { useSession } from '@/lib/hooks/useSession';
import { useRole } from '@/lib/hooks/useRole';
import { canEditOrder } from '@/lib/utils/permissions';

export const useOrderForm = ({ order, setOrder }) => {
  const { user } = useSession();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);
  const [clientId, setClientId] = useState(order.client_id ? String(order.client_id) : '');
  const [appraiserId, setAppraiserId] = useState(order.appraiser_id || '');
  const [manualClient, setManualClient] = useState(order.manual_client || '');
  const [isCustomClient, setIsCustomClient] = useState(order.client_id === null);
  const [reviewDueDate, setReviewDueDate] = useState(order.review_due_date || '');
  const [siteVisitAt, setSiteVisitAt] = useState(order.site_visit_at || '');

  const {
    editedData,
    setEditedData,
    handleChange,
    updateField,
  } = useEditableForm(order);

  const canEdit = canEditOrder(role, order.appraiser_id, user?.id, order.status);

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
  }, [editedData.base_fee, editedData.appraiser_split, setEditedData]);

  const handleClientChange = (value) => {
    if (!canEdit) return;
    if (value === 'custom') {
      setIsCustomClient(true);
      setClientId('');
      setManualClient('');
      setEditedData((prev) => ({ ...prev, client_id: null, manual_client: '' }));
    } else {
      setIsCustomClient(false);
      setClientId(value);
      setManualClient('');
      setEditedData((prev) => ({ ...prev, client_id: value ? parseInt(value, 10) : null, manual_client: '' }));
    }
  };

  const handleCustomClientNameChange = (value) => {
    if (!canEdit) return;
    setManualClient(value);
    setEditedData((prev) => ({ ...prev, manual_client: value.trim() }));
  };

  const handleAppraiserSelect = (e) => {
    if (!canEdit) return;
    const selectedUserId = e.target.value.trim();
    const selectedAppraiser = appraisers.find((user) => user.id === selectedUserId);
    if (selectedAppraiser) {
      setEditedData((prev) => ({ ...prev, appraiser_id: selectedAppraiser.id, appraiser_split: selectedAppraiser.split ?? 0.5 }));
    } else {
      setEditedData((prev) => ({ ...prev, appraiser_id: null, appraiser_split: '' }));
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this order.');
      return;
    }
    if (isCustomClient && !manualClient.trim()) {
      toast.error('Please enter a manual client name when selecting custom.');
      return;
    }
    try {
      const { data, error } = await updateOrder(editedData);
      if (error) throw error;
      toast.success("Order saved!");
      setOrder(data?.[0] || editedData);
      setTimeout(() => navigate(location.state?.from || '/orders'), 500);
    } catch (err) {
      toast.error(`Failed to save: ${err.message || 'Unexpected error'}`);
    }
  };

  return {
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
  };
};
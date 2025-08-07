// src/lib/hooks/useOrderForm.js
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getUsers, getClients, updateOrder } from '@/lib/supabaseClient';
import { useEditableForm } from '@/lib/hooks/useEditableForm';
import { useSession } from '@/lib/hooks/useSession';
import { useRole } from '@/lib/hooks/useRole';
import { canEditOrder } from '@/lib/utils/permissions';
import { createOrderWithLogs } from '@/lib/services/ordersService';

export const useOrderForm = ({ order, setOrder }) => {
  const { user } = useSession();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  // UI helpers used by your form fields
  const [clientId, setClientId] = useState(order.client_id ? String(order.client_id) : '');
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

  // Load clients + appraisers
  useEffect(() => {
    getClients().then(setClients);
    getUsers().then((data) => {
      const filtered = (data || []).filter((u) => u.role === 'appraiser');
      setAppraisers(filtered);
    });
  }, []);

  // Auto-calc appraiser_fee when base_fee or appraiser_split changes
  useEffect(() => {
    if (editedData.base_fee && editedData.appraiser_split !== undefined && editedData.appraiser_split !== null) {
      const fee =
        (parseFloat(editedData.base_fee) || 0) *
        ((parseFloat(editedData.appraiser_split) || 0) / 100);
      setEditedData((prev) => ({ ...prev, appraiser_fee: fee.toFixed(2) }));
    }
  }, [editedData.base_fee, editedData.appraiser_split, setEditedData]);

  // Client selection: regular vs custom
  const handleClientChange = (value) => {
    if (!canEdit) return;
    if (value === 'custom') {
      setIsCustomClient(true);
      setClientId('');
      setManualClient('');
      setEditedData((prev) => ({ ...prev, client_id: null, branch_id: null, manual_client: '' }));
    } else {
      setIsCustomClient(false);
      setClientId(value);
      setManualClient('');
      setEditedData((prev) => ({
        ...prev,
        client_id: value ? parseInt(value, 10) : null,
        branch_id: null,
        manual_client: '',
      }));
    }
  };

  const handleBranchChange = (branchId) => {
    if (!canEdit) return;
    setEditedData((prev) => ({
      ...prev,
      branch_id: branchId || null,
    }));
  };

  const handleCustomClientNameChange = (value) => {
    if (!canEdit) return;
    setManualClient(value);
    setEditedData((prev) => ({ ...prev, manual_client: value.trim() }));
  };

  const handleAppraiserSelect = (e) => {
    if (!canEdit) return;
    const selectedUserId = e.target.value.trim();
    const selectedAppraiser = appraisers.find((u) => u.id === selectedUserId);
    if (selectedAppraiser) {
      setEditedData((prev) => ({
        ...prev,
        appraiser_id: selectedAppraiser.id,
        appraiser_split: selectedAppraiser.split ?? 0,
      }));
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
      // 🆕 New order path
      if (!order?.id) {
        const created = await createOrderWithLogs({
          payload: editedData,
          createdByUserId: user.id,
          appraisers, // used to resolve appraiser name when logging
        });

        setOrder(created);
        toast.success('Order created!');
        setTimeout(() => navigate(location.state?.from || '/orders'), 500);
        return;
      }

      // ✏️ Existing order path
      const { data, error } = await updateOrder(editedData);
      if (error) throw error;

      const updated = data?.[0] || editedData;
      setOrder(updated);
      toast.success('Order updated!');
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
    siteVisitAt,
    setSiteVisitAt,
    editedData,
    setEditedData,
    handleChange,
    updateField,
    handleClientChange,
    handleBranchChange,
    handleCustomClientNameChange,
    handleAppraiserSelect,
    handleSave,
    canEdit,
    role,
  };
};




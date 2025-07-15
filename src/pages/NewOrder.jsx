// src/pages/NewOrder.jsx (Updated for branch_id in payload)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { logActivity } from '@/lib/logactivity';

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useSession();

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  const [formData, setFormData] = useState({
    client_id: '',
    branch_id: '', // New
    manual_client: '',
    address: '',
    status: 'In Progress',
    due_date: '',
    appraiser_id: '',
    appraiser: '',
    appraiser_split: 0,
    base_fee: '',
    notes: '',
  });

  useEffect(() => {
    const fetchMeta = async () => {
      const { data: clients } = await supabase.from('clients').select('*');
      const { data: appraisers } = await supabase.from('users').select('*');
      setClients(clients || []);
      setAppraisers(appraisers || []);
    };
    fetchMeta();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAppraiserSelect = (e) => {
    const selectedId = e.target.value;
    const appraiser = appraisers.find((a) => a.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      appraiser_id: selectedId || null,
      appraiser_split: appraiser?.split || 0,
      appraiser: appraiser?.name || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      address: formData.address,
      due_date: formData.due_date,
      status: formData.status,
      base_fee: parseFloat(formData.base_fee || 0),
      notes: formData.notes || '',
      appraiser_id: formData.appraiser_id || null,
      appraiser_split: parseFloat(formData.appraiser_split) || 0,
      client_id: formData.client_id ? parseInt(formData.client_id) : null,
      branch_id: formData.branch_id ? parseInt(formData.branch_id) : null, // New
      manual_client: formData.manual_client || '',
    };

    console.log('🚨 Submitting order payload:', payload);

    const {
      appraiser,
      client,
      appraiser_name,
      client_name,
      ...cleanedPayload
    } = formData;

    const { data: insertedOrder, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Order insert error:', error);
      return;
    }

    await logActivity({
      user_id: user.id,
      order_id: insertedOrder.id,
      role: user.role,
      action: 'created',
      visible_to: user.role === 'admin' ? ['admin'] : ['admin', 'appraiser'],
      context: { address: insertedOrder.address },
    });

    navigate('/orders');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-2xl rounded-2xl">
      <h2 className="text-2xl font-bold mb-4">Create New Order</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* ... other fields ... */}
        <div>
          <label className="block font-medium">Client</label>
          <ClientSelector
            clients={clients}
            value={formData.client_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, client_id: value }))}
            isCustomClient={formData.client_id === null}
            manualClient={formData.manual_client}
            onCustomClientNameChange={(value) => setFormData((prev) => ({ ...prev, manual_client: value }))}
          />
        </div>
        {/* Add branch selector logic in ClientSelector */}
        {/* ... rest of form ... */}
      </form>
    </div>
  );
};

export default NewOrder;




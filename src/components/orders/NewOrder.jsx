// Updated NewOrder.jsx to remove non-schema 'appraiser' field and fix insert logic

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { logActivity } from '@/lib/logactivity';

const NewOrder = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useSession();

  const [clients, setClients] = useState([]);
  const [appraisers, setAppraisers] = useState([]);

  const [formData, setFormData] = useState({
    client_id: '',
    manual_client: '',
    address: '',
    status: 'In Progress',
    due_date: '',
    appraiser_id: '',
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
    const selectedId = parseInt(e.target.value);
    const appraiser = appraisers.find((a) => a.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      appraiser_id: selectedId,
      appraiser_split: appraiser?.split || 0,
    }));
  };

    const handleSubmit = async (e) => {
  e.preventDefault();

  const {
    appraiser,
    client,
    appraiser_name,
    client_name,
    ...cleanedPayload
  } = formData;

   const { data: insertedOrder, error } = await supabase
    .from('orders')
    .insert([cleanedPayload])
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
        <div>
          <label className="block font-medium">Client</label>
          <select
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option value="">-- Select Client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400">Or manually enter:</p>
          <input
            type="text"
            name="manual_client"
            placeholder="Manual Client"
            value={formData.manual_client}
            onChange={handleChange}
            className="w-full border rounded p-2 mt-1"
          />
        </div>

        <div>
          <label className="block font-medium">Address</label>
          <input
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Appraiser</label>
          <select
            name="appraiser_id"
            value={formData.appraiser_id}
            onChange={handleAppraiserSelect}
            className="w-full border rounded p-2"
          >
            <option value="">-- Select Appraiser --</option>
            {appraisers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Base Fee ($)</label>
          <input
            type="number"
            name="base_fee"
            value={formData.base_fee}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option>In Progress</option>
            <option>Needs Review</option>
            <option>Completed</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Save Order
        </button>
      </form>
    </div>
  );
};

export default NewOrder;

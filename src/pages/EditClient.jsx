// src/pages/EditClient.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isNew = !clientId || clientId === 'new';

  const [client, setClient] = useState({
    name: '',
    company_address: '',
    contact_name_1: '',
    contact_phone_1: '',
    contact_email_1: '',
    contact_name_2: '',
    contact_phone_2: '',
    contact_email_2: '',
    parent_id: null,
    notes: ''
  });

  const [parents, setParents] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchParents = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .is('parent_id', null);
      setParents(data || []);
    };

    fetchParents();

    const fetchClient = async () => {
      if (isNew) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setClient(data);
      } else {
        setError('Client not found.');
      }
      setLoading(false);
    };
    fetchClient();
  }, [clientId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = name === 'parent_id' ? (value ? parseInt(value, 10) : null) : value;
    setClient((prev) => ({ ...prev, [name]: parsedValue }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!client.name.trim()) newErrors.name = 'Name is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const { id, ...clientData } = client;

    const action = isNew
      ? supabase.from('clients').insert([clientData], { returning: 'minimal' })
      : supabase.from('clients').update(clientData, { returning: 'minimal' }).eq('id', clientId);

    const { error: saveError } = await action;
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
    } else {
      navigate('/clients');
    }
  };

  if (loading) return <p className="p-4">Loading client...</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? 'Add New Client/Lender/Branch' : `Edit ${client.name}`}</h1>

      <label className="block">
        <span className="text-sm font-medium">Parent Client/AMC (if branch or lender)</span>
        <select
          name="parent_id"
          value={client.parent_id || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        >
          <option value="">None (Top-level Client/AMC)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            name="name"
            value={client.name || ''}
            onChange={handleChange}
            className={`mt-1 block w-full border px-3 py-2 rounded ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Company Address</span>
          <input
            name="company_address"
            value={client.company_address || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Name 1</span>
          <input
            name="contact_name_1"
            value={client.contact_name_1 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Name 2</span>
          <input
            name="contact_name_2"
            value={client.contact_name_2 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Phone 1</span>
          <input
            name="contact_phone_1"
            value={client.contact_phone_1 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Phone 2</span>
          <input
            name="contact_phone_2"
            value={client.contact_phone_2 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Email 1</span>
          <input
            name="contact_email_1"
            value={client.contact_email_1 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Email 2</span>
          <input
            name="contact_email_2"
            value={client.contact_email_2 || ''}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </label>
      </div>

      <label className="block mt-4">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          value={client.notes || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {saving ? 'Saving...' : isNew ? 'Add Client' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditClient;


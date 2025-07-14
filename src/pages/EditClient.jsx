// src/pages/EditClient.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isNew = clientId === 'new';

  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    contact: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) setError(error);
      else setClient(data);
      setLoading(false);
    };
    if (!isNew) fetchClient();
    else setLoading(false);
  }, [clientId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!client.name.trim()) newErrors.name = 'Name is required';
    if (!client.email.trim()) newErrors.email = 'Email is required';
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

  console.log('Updating client with ID:', clientId);
  console.log('Payload:', clientData);

  const action = isNew
    ? supabase.from('clients').insert([clientData], { returning: 'minimal' })
    : supabase.from('clients').update(clientData, { returning: 'minimal' }).eq('id', clientId);

  const { error } = await action;
  setSaving(false);
  if (error) {
    setError(error.message);
  } else {
    navigate('/clients');
  }
};

  if (loading) return <p className="p-4">Loading client...</p>;
  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold">{isNew ? 'Add New Client' : `Edit ${client.name}`}</h1>

      {[
        { label: 'Name', name: 'name' },
        { label: 'Email', name: 'email' },
        { label: 'Phone', name: 'phone' },
        { label: 'Company', name: 'company' },
        { label: 'Contact', name: 'contact' }
      ].map(({ label, name }) => (
        <label key={name} className="block">
          <span className="text-sm font-medium">{label}</span>
          <input
            name={name}
            value={client[name]}
            onChange={handleChange}
            className={`mt-1 block w-full border px-3 py-2 rounded ${errors[name] ? 'border-red-500' : ''}`}
          />
          {errors[name] && <p className="text-sm text-red-600 mt-1">{errors[name]}</p>}
        </label>
      ))}

      <label className="block">
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


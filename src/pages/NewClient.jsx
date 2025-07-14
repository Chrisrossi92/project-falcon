// src/pages/NewClient.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';

const NewClient = () => {
  const navigate = useNavigate();
  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    contact: '',
    company: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!client.name.trim()) newErrors.name = 'Name is required';
    if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      newErrors.email = 'Invalid email';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('clients').insert(client);
    setSubmitting(false);

    if (error) {
      setSubmitError('Failed to add client.');
    } else {
      navigate('/clients');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 bg-white shadow rounded space-y-4">
      <h1 className="text-2xl font-bold">Add New Client</h1>

      {submitError && <p className="text-red-600 text-sm">{submitError}</p>}

      {['name', 'email', 'phone', 'contact', 'company'].map(field => (
        <label key={field} className="block">
          <span className="text-sm font-medium capitalize">{field}</span>
          <input
            name={field}
            value={client[field]}
            onChange={handleChange}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
          {errors[field] && <span className="text-red-600 text-sm">{errors[field]}</span>}
        </label>
      ))}

      <label className="block">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          value={client.notes}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        ></textarea>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {submitting ? 'Saving...' : 'Save Client'}
        </button>
        <button type="button" onClick={() => navigate('/clients')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default NewClient;
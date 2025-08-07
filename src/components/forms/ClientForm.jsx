import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';

export default function ClientForm({ initialValues = {}, onSubmit, mode = 'create' }) {
  const [client, setClient] = useState({
    name: '',
    company_address: '',
    contact_name_1: '',
    contact_phone_1: '',
    contact_email_1: '',
    contact_name_2: '',
    contact_phone_2: '',
    contact_email_2: '',
    notes: '',
    parent_id: null,
    client_type: '',
    ...initialValues,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [amcOptions, setAmcOptions] = useState([]);

  // Fetch list of AMCs for parent_id dropdown
  useEffect(() => {
    const fetchAMCs = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('client_type', 'AMC');

      if (!error && data) {
        setAmcOptions(data);
      }
    };

    fetchAMCs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = name === 'parent_id' ? (value ? parseInt(value) : null) : value;
    setClient(prev => ({ ...prev, [name]: parsed }));
    setErrors(prev => ({ ...prev, [name]: '' }));
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
    await onSubmit(client);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">
        {mode === 'edit' ? `Edit ${client.name}` : 'Add New Client'}
      </h1>

      {/* Client Type */}
      <label className="block">
        <span className="text-sm font-medium">Client Type</span>
        <select
          name="client_type"
          value={client.client_type || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        >
          <option value="">Select type</option>
          <option value="Lender">Lender</option>
          <option value="Private">Private</option>
          <option value="AMC">AMC</option>
        </select>
      </label>

      {/* Parent Client (AMC) */}
      <label className="block">
        <span className="text-sm font-medium">Parent Client / AMC (optional)</span>
        <select
          name="parent_id"
          value={client.parent_id || ''}
          onChange={handleChange}
          className="mt-1 block w-full border px-3 py-2 rounded"
        >
          <option value="">None (Top-level Client / AMC)</option>
          {amcOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {client.parent_id && (
          <p className="text-xs text-gray-500 mt-1">
            This client will be listed under:{' '}
            <strong>
              {amcOptions.find((p) => p.id === client.parent_id)?.name || 'Selected AMC'}
            </strong>
          </p>
        )}
      </label>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Client Name</span>
          <input
            name="name"
            value={client.name}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
          {errors.name && <p className="text-red-600 text-sm">{errors.name}</p>}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Company Address</span>
          <input
            name="company_address"
            value={client.company_address || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Name 1</span>
          <input
            name="contact_name_1"
            value={client.contact_name_1 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Name 2</span>
          <input
            name="contact_name_2"
            value={client.contact_name_2 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Phone 1</span>
          <input
            name="contact_phone_1"
            value={client.contact_phone_1 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Phone 2</span>
          <input
            name="contact_phone_2"
            value={client.contact_phone_2 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Email 1</span>
          <input
            name="contact_email_1"
            value={client.contact_email_1 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Contact Email 2</span>
          <input
            name="contact_email_2"
            value={client.contact_email_2 || ''}
            onChange={handleChange}
            className="mt-1 w-full border px-3 py-2 rounded"
          />
        </label>
      </div>

      {/* Notes */}
      <label className="block mt-4">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          value={client.notes || ''}
          onChange={handleChange}
          className="mt-1 w-full border px-3 py-2 rounded"
        />
      </label>

      {/* Save Button */}
      <div className="flex justify-start pt-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Client'}
        </button>
      </div>
    </form>
  );
}



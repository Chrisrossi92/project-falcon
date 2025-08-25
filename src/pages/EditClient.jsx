import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ClientForm from '@/components/forms/ClientForm';
import { fetchClientById, updateClient, deleteClient } from '@/lib/services/clientsService';

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await fetchClientById(clientId);
        setClient(c);
      } catch (e) {
        setError(e.message || 'Failed to load client');
      }
    })();
  }, [clientId]);

  const handleSave = async (formData) => {
    try {
      setSaving(true);
      await updateClient(clientId, formData);
      navigate('/clients');
    } catch (e) {
      setError(e.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!ok) return;
    try {
      await deleteClient(clientId);
      navigate('/clients');
    } catch (e) {
      alert('Failed to delete client: ' + (e.message || String(e)));
    }
  };

  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;
  if (!client) return <p className="p-4">Loading client...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded space-y-6">
      <ClientForm initialValues={client} onSubmit={handleSave} mode="edit" />
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => navigate('/clients')} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
          Cancel
        </button>
        <button type="button" onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-auto">
          Delete
        </button>
      </div>
    </div>
  );
};

export default EditClient;





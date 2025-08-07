import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import ClientForm from '../components/forms/ClientForm';

const EditClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) setError(error.message);
      else setClient(data);
    };

    fetchClient();
  }, [clientId]);

  const handleSave = async (formData) => {
    setSaving(true);
    const { error } = await supabase
      .from('clients')
      .update(formData)
      .eq('id', clientId);

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/clients');
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(
      `Are you sure you want to delete this client? This action cannot be undone.`
    );

    if (!confirm) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      alert('Failed to delete client: ' + error.message);
    } else {
      alert('Client deleted.');
      navigate('/clients');
    }
  };

  if (error) return <p className="p-4 text-red-600">Error: {error}</p>;
  if (!client) return <p className="p-4">Loading client...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded space-y-6">
      <ClientForm initialValues={client} onSubmit={handleSave} mode="edit" />
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default EditClient;




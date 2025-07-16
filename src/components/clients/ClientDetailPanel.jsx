// src/components/clients/ClientDetailPanel.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';


const ClientDetailPanel = ({ clientData }) => {
  const navigate = useNavigate();

  const handleEditClick = () => {
    const clientId = clientData?.id;
    if (clientId) {
      navigate(`/clients/edit/${clientId}`);
    } else {
      console.warn('Missing client ID for edit.');
    }
  };

  const handleDeleteClick = async () => {
  const clientId = clientData?.id;
  if (!clientId) {
    console.warn('No client ID provided for deletion.');
    return;
  }

  const confirmed = window.confirm('Are you sure you want to delete this client? This cannot be undone.');
  if (!confirmed) return;

  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .select(); // <-- include select() to force response for debugging

  if (error) {
    console.error('Delete failed:', error.message);
    alert(`Failed to delete client: ${error.message}`);
  } else {
    console.log('Delete succeeded:', data);
    navigate('/clients');
  }
};


  return (
    <div className="w-2/3 p-4 border-r">
      <h3 className="text-lg font-semibold">Client Details</h3>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium">Company Name</label>
          <p>{clientData.name || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Company Address</label>
          <p>{clientData.company_address || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 1 Name</label>
          <p>{clientData.contact_name_1 || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 1 Phone</label>
          <p>{clientData.contact_phone_1 || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 1 Email</label>
          <p>{clientData.contact_email_1 || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 2 Name</label>
          <p>{clientData.contact_name_2 || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 2 Phone</label>
          <p>{clientData.contact_phone_2 || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Contact 2 Email</label>
          <p>{clientData.contact_email_2 || 'N/A'}</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleEditClick}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Edit
        </button>
        <button
  type="button"
  onClick={handleDeleteClick}
  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
>
  Delete
</button>
      </div>
    </div>
  );
};

export default ClientDetailPanel;

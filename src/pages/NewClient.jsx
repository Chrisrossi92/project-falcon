import React from 'react';
import { useNavigate } from 'react-router-dom';
import ClientForm from '@/components/forms/ClientForm';
import { createClient } from '@/lib/services/clientsService';

const NewClient = () => {
  const navigate = useNavigate();

  const handleCreate = async (formData) => {
    try {
      await createClient(formData);
      navigate('/clients');
    } catch (e) {
      alert(`Error: ${e.message || String(e)}`);
    }
  };

  return <ClientForm onSubmit={handleCreate} mode="create" />;
};

export default NewClient;



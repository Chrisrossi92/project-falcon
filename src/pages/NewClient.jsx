import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import ClientForm from '../components/forms/ClientForm'; // Make sure path is correct

const NewClient = () => {
  const navigate = useNavigate();

  const handleCreate = async (formData) => {
    const { error } = await supabase.from('clients').insert([formData]);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      navigate('/clients');
    }
  };

  return <ClientForm onSubmit={handleCreate} mode="create" />;
};

export default NewClient;


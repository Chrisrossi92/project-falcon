// src/pages/ClientDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient';
import ContactForm from '../components/ContactForm';

const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const isNew = !clientId || clientId === 'new';

  const [client, setClient] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    contact: '',
    notes: ''
  });

  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!isNew) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientError) {
          console.error('Error fetching client:', clientError);
          setError(clientError.message || 'Failed to fetch client data.');
          return;
        }
        setClient(clientData);

        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select('*')
          .eq('client_id', clientId);

        if (contactError) {
          console.error('Error fetching contacts:', contactError);
          setError(contactError.message || 'Failed to fetch contacts.');
          return;
        }

        setContacts(Array.isArray(contactData) ? contactData : []);
      }
    };
    fetchClientData();
  }, [clientId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!client.name.trim()) return;

    const clientPayload = {
      name: client.name,
      phone: client.phone || null,
      email: client.email || null,
      company: client.company || null,
      contact: client.contact || null,
      notes: client.notes || null
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientPayload])
        .select()
        .single();
      if (error) {
        console.error('Client creation failed:', error);
        setError(error.message || 'Failed to create client.');
        return;
      }
      if (data?.id) navigate(`/clients/${data.id}`);
    } else {
      const { error } = await supabase
        .from('clients')
        .update(clientPayload)
        .eq('id', clientId);
      if (error) {
        console.error('Error updating client:', error);
        setError(error.message || 'Failed to update client.');
        return;
      }
      navigate('/clients');
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !clientId) return;
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...newContact, client_id: clientId }])
      .select()
      .single();
    if (error) {
      console.error('Error adding contact:', error);
      setError(error.message || 'Failed to add contact.');
      return;
    }
    setContacts((prev) => [...prev, data]);
    setNewContact({ name: '', email: '', phone: '' });
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-xl shadow-md max-w-3xl mx-auto mt-6">
      <h1 className="text-2xl font-bold">{isNew ? 'New Client' : 'Edit Client'}</h1>

      {error && <div className="text-red-600">Error: {String(error)}</div>}

      <div className="space-y-4">
        <input
          type="text"
          name="name"
          value={client.name || ''}
          onChange={handleChange}
          placeholder="Client Name"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="phone"
          value={client.phone || ''}
          onChange={handleChange}
          placeholder="Phone Number"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="email"
          name="email"
          value={client.email || ''}
          onChange={handleChange}
          placeholder="Email"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="company"
          value={client.company || ''}
          onChange={handleChange}
          placeholder="Company"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="contact"
          value={client.contact || ''}
          onChange={handleChange}
          placeholder="Primary Contact"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <textarea
          name="notes"
          value={client.notes || ''}
          onChange={handleChange}
          placeholder="Notes"
          className="w-full px-4 py-2 border rounded-lg min-h-[100px]"
        />
      </div>

      {!isNew && (
        <div className="space-y-4 mt-6">
          <h2 className="text-lg font-semibold">Additional Contacts</h2>
          <ContactForm contact={newContact} setContact={setNewContact} onAdd={handleAddContact} />

          {Array.isArray(contacts) && contacts.length > 0 ? (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="border rounded p-3">
                  <div className="font-semibold">{String(c.name || 'Unnamed Contact')}</div>
                  <div className="text-sm text-gray-600">{String(c.email || '')}</div>
                  <div className="text-sm text-gray-600">{String(c.phone || '')}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 italic">No additional contacts found.</div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} className="px-6 py-2 bg-green-600 text-white rounded">
          Save
        </button>
      </div>
    </div>
  );
};

export default ClientDetail;

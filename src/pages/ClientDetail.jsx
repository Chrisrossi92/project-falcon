// src/pages/ClientDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabaseClient';
import ContactForm from '@/components/ContactForm';
import { fetchClientById, updateClient } from '@/lib/services/clientsService';

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isNew) {
        try {
          const c = await fetchClientById(clientId);
          setClient(c);

          const { data: contactData, error: contactError } = await supabase
            .from('contacts')
            .select('*')
            .eq('client_id', clientId);
          if (contactError) throw contactError;
          setContacts(Array.isArray(contactData) ? contactData : []);
        } catch (e) {
          setError(e.message || 'Failed to load client');
        }
      }
    };
    load();
  }, [clientId, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isNew) {
        // New should be handled in the NewClient page; we keep edit behavior here
        return;
      }
      await updateClient(clientId, {
        name: client.name || null,
        phone: client.phone || null,
        email: client.email || null,
        company: client.company || null,
        contact: client.contact || null,
        notes: client.notes || null,
      });
      navigate('/clients');
    } catch (e) {
      setError(e.message || 'Failed to update client.');
    } finally {
      setSaving(false);
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

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/clients')} className="px-6 py-2 border rounded">
          Cancel
        </button>
        {!isNew && (
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-black text-white rounded">
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientDetail;


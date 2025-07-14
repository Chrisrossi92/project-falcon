// src/components/ContactForm.jsx
import React from 'react';

const ContactForm = ({ contact, setContact, onAdd }) => {
  return (
    <div className="space-y-2">
      <input
        type="text"
        name="name"
        value={contact.name}
        onChange={(e) => setContact({ ...contact, name: e.target.value })}
        placeholder="Contact Name"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="email"
        name="email"
        value={contact.email}
        onChange={(e) => setContact({ ...contact, email: e.target.value })}
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="text"
        name="phone"
        value={contact.phone}
        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
        placeholder="Phone"
        className="w-full px-4 py-2 border rounded"
      />
      <button
        type="button"
        onClick={onAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Contact
      </button>
    </div>
  );
};

export default ContactForm;





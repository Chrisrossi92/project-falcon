// src/components/clients/ClientDetailPanel.jsx
import React, { useState } from 'react';

const ClientDetailPanel = ({ clientData, isEditing, setIsEditing, onSave }) => {
  const [editedData, setEditedData] = useState({
    ...clientData,
    company_address: clientData.company_address || '',
    contact_name_1: clientData.contact_name_1 || '',
    contact_phone_1: clientData.contact_phone_1 || '',
    contact_email_1: clientData.contact_email_1 || '',
    contact_name_2: clientData.contact_name_2 || '',
    contact_phone_2: clientData.contact_phone_2 || '',
    contact_email_2: clientData.contact_email_2 || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedData);
  };

  return (
    <div className="w-2/3 p-4 border-r">
      <h3 className="text-lg font-semibold">Client Details</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium">Company Name</label>
            {isEditing ? (
              <input
                name="name"
                value={editedData.name || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.name || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Company Address</label>
            {isEditing ? (
              <input
                name="company_address"
                value={editedData.company_address || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.company_address || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 1 Name</label>
            {isEditing ? (
              <input
                name="contact_name_1"
                value={editedData.contact_name_1 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_name_1 || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 1 Phone</label>
            {isEditing ? (
              <input
                name="contact_phone_1"
                value={editedData.contact_phone_1 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_phone_1 || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 1 Email</label>
            {isEditing ? (
              <input
                name="contact_email_1"
                value={editedData.contact_email_1 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_email_1 || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 2 Name</label>
            {isEditing ? (
              <input
                name="contact_name_2"
                value={editedData.contact_name_2 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_name_2 || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 2 Phone</label>
            {isEditing ? (
              <input
                name="contact_phone_2"
                value={editedData.contact_phone_2 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_phone_2 || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Contact 2 Email</label>
            {isEditing ? (
              <input
                name="contact_email_2"
                value={editedData.contact_email_2 || ''}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            ) : (
              <p>{clientData.contact_email_2 || 'N/A'}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {isEditing ? (
            <>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded mr-2">
                Save
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 px-4 py-2 rounded">
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditing(true)} className="bg-green-600 text-white px-4 py-2 rounded">
              Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ClientDetailPanel;
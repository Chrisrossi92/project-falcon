import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientCard({ client }) {
  const navigate = useNavigate();

  const {
    id,
    name,
    client_type,
    totalOrders = 0,
    activeOrders = 0,
    avgFee = 0,
    lastOrderDate = null,
    contact_name_1,
    contact_email_1
  } = client;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const labelColor = {
    AMC: 'bg-blue-100 text-blue-700',
    Lender: 'bg-green-100 text-green-700',
    Private: 'bg-gray-100 text-gray-700',
  }[client_type] || 'bg-gray-200 text-gray-800';

  return (
    <div className="bg-white rounded-xl shadow p-4 w-full max-w-md h-64 flex flex-col justify-between hover:shadow-lg transition">
      {/* Header Row */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2
            className="font-semibold leading-tight truncate"
            style={{
              fontSize:
                name.length > 40
                  ? '0.875rem' // text-sm
                  : name.length > 25
                  ? '1rem' // text-base
                  : '1.125rem', // text-lg
            }}
            title={name}
          >
            {name}
          </h2>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${labelColor}`}>
            {client_type}
          </span>
        </div>

        {/* Stats */}
        <ul className="text-sm space-y-1 mb-2">
          <li>💼 Total Orders: {totalOrders}</li>
          <li>🔥 Active Orders: {activeOrders}</li>
          <li>💰 Avg Fee: ${avgFee.toFixed(2)}</li>
          <li>📅 Last Order: {formatDate(lastOrderDate)}</li>
        </ul>

        {/* Contact */}
        <div className="text-sm text-gray-600">
          {contact_name_1 && <p>👤 {contact_name_1}</p>}
          {contact_email_1 && <p>📧 {contact_email_1}</p>}
        </div>
      </div>

      {/* Buttons Row */}
      <div className="flex gap-2 pt-3">
        <button
          onClick={() => navigate(`/clients/${id}`)}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
        >
          View
        </button>
        <button
          onClick={() => navigate(`/clients/edit/${id}`)}
          className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400 text-sm"
        >
          Edit
        </button>
      </div>
    </div>
  );
}


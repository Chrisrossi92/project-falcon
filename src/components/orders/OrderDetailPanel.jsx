import React from 'react';
import { useNavigate } from 'react-router-dom';
import MetaItem from '@/components/MetaItem';

export default function OrderDetailPanel({ order, isAdmin }) {
  const navigate = useNavigate();

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const goToEdit = () => {
    navigate(`/orders/${order.id}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-800">Order Info</h2>
        {isAdmin && (
          <button
            onClick={goToEdit}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          >
            Edit Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetaItem label="Order #" value={order.id} />
        <MetaItem label="Status" value={order.status || '—'} />
        <MetaItem label="Appraiser" value={order.appraiser_name || order.manual_appraiser || '—'} />
        <MetaItem label="Client" value={order.client_name || order.manual_client || '—'} />
        <MetaItem label="Address" value={order.address || '—'} />
        <MetaItem label="Property Type" value={order.property_type || '—'} />
        <MetaItem label="Report Type" value={order.report_type || '—'} />
        <MetaItem label="Base Fee" value={order.base_fee ? `$${order.base_fee}` : '—'} />
        <MetaItem label="Split" value={order.appraiser_split ? `${order.appraiser_split * 100}%` : '—'} />
        <MetaItem label="Invoice #" value={order.client_invoice || '—'} />
        <MetaItem label="Paid Status" value={order.paid_status || 'unpaid'} />
        <MetaItem label="Notes" value={order.notes || '—'} />
        <MetaItem label="Due (Client)" value={formatDate(order.due_date)} />
        <MetaItem label="Due (Review)" value={formatDate(order.review_due_date)} />
        <MetaItem label="Site Visit" value={formatDate(order.site_visit_date)} />
      </div>
    </div>
  );
}

import React from 'react';
import MapContainer from '@/components/MapContainer';
import KeyDateCard from '@/components/KeyDateCard';
import ActivityLogPanel from '@/components/ActivityLogPanel'; // Correct name

export default function OrderSidebarPanel({ order }) {
  return (
    <div className="space-y-4">
      {order?.address && (
        <MapContainer address={order.address} />
      )}
      <KeyDateCard order={order} />
      <ActivityLogPanel orderId={order.id} /> {/* Corrected name here */}
    </div>
  );
}


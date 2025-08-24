// src/pages/Orders.jsx
import React, { useState } from 'react';
import OrdersTable from '@/features/orders/OrdersTable';
import OrdersFilters from '@/features/orders/OrdersFilters';

export default function Orders() {
  const [filters, setFilters] = useState({
    status: '',
    appraiserId: '',
    clientId: '',
    priority: '',
    dueWindow: '',
    includeArchived: false,
  });

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
      </div>

      <OrdersFilters value={filters} onChange={setFilters} />

      <div className="rounded-2xl border bg-white">
        <OrdersTable
          status={filters.status || undefined}
          appraiserId={filters.appraiserId || undefined}
          clientId={filters.clientId || undefined}
          priority={filters.priority || undefined}
          dueWindow={filters.dueWindow || undefined}
          includeArchived={!!filters.includeArchived}
        />
      </div>
    </div>
  );
}



















// src/pages/Orders.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import OrdersTable from '@/features/orders/OrdersTable';
import OrdersFilters from '@/features/orders/OrdersFilters';

export default function Orders() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const startInReview = params.get('review') === '1';

  const [filters, setFilters] = useState({
    status: '',
    appraiserId: '',
    clientId: '',
    priority: '',
    dueWindow: '',
    includeArchived: false,
    reviewOnly: startInReview, // 👈 lives inside the box now
  });

  // Compute props for the adapter table
  const tableProps = useMemo(() => {
    const base = {
      appraiserId: filters.appraiserId || undefined,
      clientId: filters.clientId || undefined,
      priority: filters.priority || undefined,
      dueWindow: filters.dueWindow || undefined,
      includeArchived: !!filters.includeArchived,
    };
    if (filters.reviewOnly) {
      return { ...base, status: '__REVIEW__' };
    }
    return { ...base, status: filters.status || undefined };
  }, [filters]);

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
      </div>

      <OrdersFilters value={filters} onChange={setFilters} />

      <div className="rounded-2xl border bg-white">
        <OrdersTable {...tableProps} />
      </div>
    </div>
  );
}






















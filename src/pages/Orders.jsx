// src/pages/Orders.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrdersTable from '@/components/orders/OrdersTable';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';

const Orders = () => {
  const { user, isAdmin, isAppraiser, isReviewer } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [appraiserFilter, setAppraiserFilter] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);

  const refreshOrders = async () => {
    setLoading(true);
    let query = supabase
  .from("orders")
  .select(`
    *,
    client:client_id ( name ),
    appraiser:appraiser_id ( name )
  `);

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Orders fetch error:', fetchError);
      setError(fetchError.message);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshOrders();
  }, [isAdmin, isReviewer, user.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setStatusFilter(params.get('status') || '');
    setAppraiserFilter(params.get('appraiser') || '');
  }, [location.search]);

  useEffect(() => {
    let tempOrders = [...orders];

    if (statusFilter) {
      tempOrders = tempOrders.filter(order => order.status === statusFilter);
    }

    if (appraiserFilter && (isAdmin || isReviewer)) {
      tempOrders = tempOrders.filter(order => order.appraiser_id === appraiserFilter);
    }

    tempOrders.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    setFilteredOrders(tempOrders);
  }, [orders, statusFilter, appraiserFilter, sortField, sortAsc, isAdmin, isReviewer]);

  const handleClearFilter = () => {
    setStatusFilter('');
    setAppraiserFilter('');
    navigate('/orders');
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (error) return <div>Error loading orders: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Button onClick={() => navigate('/orders/new')}>+ New Order</Button>
      </div>

      <Button variant="outline" onClick={handleClearFilter} className="mb-4">
        Clear Filters
      </Button>

      <OrdersTable
        orders={filteredOrders}
        refreshOrders={refreshOrders}
        loading={loading}
        sortField={sortField}
        sortAsc={sortAsc}
        onSortToggle={toggleSort}
      />
    </div>
  );
};

export default Orders;











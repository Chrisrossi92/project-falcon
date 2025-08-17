// src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OrdersTable from '@/components/orders/OrdersTable';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { LoadingState } from '@/components/ui/Loaders';
import { ErrorState } from '@/components/ui/Errors';

const Orders = () => {
  const { user, isAdmin, isReviewer } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // filters (wired in next PR)
  const [statusFilter, setStatusFilter] = useState('');
  const [appraiserFilter, setAppraiserFilter] = useState('');

  const refreshOrders = async () => {
    setLoading(true);
    setErrorMsg('');

    let query = supabase
      .from('orders')
      .select(`
        *,
        client:client_id ( name ),
        appraiser:appraiser_id ( display_name )
      `);

    const { data, error } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      setErrorMsg(error.message || 'Failed to load orders.');
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isReviewer, user?.id]);

  // sync URL (so we don't lose future filters)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setStatusFilter(params.get('status') || '');
    setAppraiserFilter(params.get('appraiser') || '');
  }, [location.search]);

  // basic filter pipeline (will be expanded in next PR)
  useEffect(() => {
    let temp = [...orders];

    if (statusFilter) temp = temp.filter(o => o.status === statusFilter);
    if (appraiserFilter && (isAdmin || isReviewer)) temp = temp.filter(o => String(o.appraiser_id) === String(appraiserFilter));

    setFilteredOrders(temp);
  }, [orders, statusFilter, appraiserFilter, isAdmin, isReviewer]);

  if (loading) return <LoadingState label="Loading orders…" />;
  if (errorMsg) return <ErrorState message={errorMsg} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <div className="flex items-center gap-2">
          {/* Filters UI comes next PR */}
          <Button onClick={() => navigate('/orders/new')}>+ New Order</Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-2">
        <OrdersTable
          orders={filteredOrders}
          refreshOrders={refreshOrders}
          hideAppraiserColumn={!(isAdmin || isReviewer)}
        />
      </div>
    </div>
  );
};

export default Orders;












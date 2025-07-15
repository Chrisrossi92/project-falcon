import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrdersTable from '@/components/orders/OrdersTable';
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';

const Orders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();

  const [statusFilter, setStatusFilter] = useState(null);
  const [appraiserFilter, setAppraiserFilter] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setStatusFilter(params.get('status') || null);
    setAppraiserFilter(params.get('appraiser') || null);
  }, [location.search]);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select(`
          *,
          client:client_id ( name ),
          branch:branch_id ( name ),
          appraiser:appraiser_id ( name )
        `)
        .order(sortField, { ascending: sortAsc });

      if (user.role === 'appraiser') {
        query = query.eq('appraiser_id', user.id);
      } else if (user.role === 'reviewer') {
        query = query.in('status', ['In Review', 'Needs Review']);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (appraiserFilter) {
        query = query.eq('appraiser_id', appraiserFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } else {
        const transformed = data.map(order => ({
          ...order,
          client_name: order.client?.name || order.manual_client || '—',
          branch_name: order.branch?.name || '',
          appraiser_name: order.appraiser?.name || order.manual_appraiser || '—',
        }));

        setOrders(transformed);
      }

      setLoading(false);
    };

    fetchOrders();
  }, [user, statusFilter, appraiserFilter, sortField, sortAsc]);

  const handleClearFilter = () => {
    navigate('/orders');
    setStatusFilter(null);
    setAppraiserFilter(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <Link to="/orders/new">
          <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
            + New Order
          </button>
        </Link>
        {(statusFilter || appraiserFilter) && (
          <button
            onClick={handleClearFilter}
            className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
          >
            Clear Filter
          </button>
        )}
      </div>
      <OrdersTable
        orders={orders}
        loading={loading}
        sortField={sortField}
        setSortField={setSortField}
        sortAsc={sortAsc}
        setSortAsc={setSortAsc}
      />
    </div>
  );
};

export default Orders;










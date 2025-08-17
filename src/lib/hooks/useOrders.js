// lib/hooks/useOrders.js
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { useRole } from '@/lib/hooks/useRole';
import { canViewAllOrders } from '@/lib/utils/permissions';

export const useOrders = () => {
  const { user } = useSession();
  const { role } = useRole();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);

    let query = supabase
      .from('orders')
      .select(`
        *,
        client:client_id ( name ),
        appraiser:appraiser_id ( name )
      `)
      .order('id', { ascending: false });

    if (!canViewAllOrders(role)) {
      query = query.eq('appraiser_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      setError(error.message);
      setOrders([]);
    } else {
      const transformed = data.map(order => ({
        ...order,
        client_name: order.client?.name || order.manual_client || '—',
        appraiser_name: order.appraiser?.display_name || order.manual_appraiser || '—',
      }));
      setOrders(transformed);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user || !role) return;
    fetchOrders();

    // No realtime subscription here
  }, [user, role]);

  return { orders, loading, error, refresh: fetchOrders };
};

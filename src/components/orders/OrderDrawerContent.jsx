import React, { useEffect, useState } from 'react';
import OrderDetailPanel from './OrderDetailPanel';
import OrderSidebarPanel from './OrderSidebarPanel';
import { useSession } from '@/lib/hooks/useSession';
import supabase from '@/lib/supabaseClient';

export default function OrderDrawerContent({ data }) {
  const { user } = useSession();
  const isAdmin = user?.role === 'admin';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data: fullOrder, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( name )
        `
        )
        .eq('id', data.id)
        .single();

      if (error) {
        console.error('Failed to fetch full order:', error.message);
        setOrder(data); // fallback to props
      } else {
        setOrder({
          ...fullOrder,
          client_name: fullOrder.client?.name || fullOrder.manual_client || '—',
          appraiser_name:
            fullOrder.appraiser?.name || fullOrder.manual_appraiser || '—',
        });
      }

      setLoading(false);
    };

    fetchOrder();
  }, [data.id]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-4">Loading order details…</div>;
  }

  return (
    <div className="h-full overflow-y-auto pr-6">
      <div className="grid grid-cols-[1fr_320px] gap-6">
        <OrderDetailPanel order={order} isAdmin={isAdmin} />
        <OrderSidebarPanel order={order} />
      </div>
    </div>
  );
}







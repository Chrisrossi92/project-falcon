// src/features/orders/OrderRowDetail.jsx
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import OrderDetailPanel from '@/components/orders/OrderDetailPanel';
import OrderSidebarPanel from '@/components/orders/OrderSidebarPanel';
import { useSession } from '@/lib/hooks/useSession';

export default function OrderRowDetail({ orderId }) {
  const { isAdmin } = useSession();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( display_name, name )
        `)
        .eq('id', orderId)
        .single();

      if (!mounted) return;

      if (error || !data) {
        console.error('OrderRowDetail fetch failed:', error?.message);
        setOrder(null);
      } else {
        setOrder({
          ...data,
          client_name: data.client?.name || data.manual_client || '—',
          appraiser_name: data.appraiser?.display_name || data.appraiser?.name || data.manual_appraiser || '—',
        });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [orderId]);

  if (loading) {
    return <div className="text-sm text-gray-500 p-2">Loading order…</div>;
  }
  if (!order) {
    return <div className="text-sm text-red-600 p-2">Could not load order.</div>;
  }

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <OrderDetailPanel order={order} isAdmin={isAdmin} />
        <OrderSidebarPanel order={order} />
      </div>
    </div>
  );
}

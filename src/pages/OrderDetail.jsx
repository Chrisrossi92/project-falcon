import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderDetailForm from './OrderDetailForm';
import { Loader2 } from 'lucide-react';
import supabase from '@/lib/supabaseClient';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( name )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Error fetching order:', error?.message);
        setError('Order not found.');
        navigate('/dashboard'); // fallback to dashboard
      } else {
        const transformed = {
          ...data,
          client_name: data.client?.name || data.manual_client || '—',
          appraiser_name: data.appraiser?.name || data.manual_appraiser || '—',
        };
        setOrder(transformed);
      }

      setLoading(false);
    };

    fetchOrder();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Order #{order.id}</h1>
      <OrderDetailForm order={order} setOrder={setOrder} />
    </div>
  );
}


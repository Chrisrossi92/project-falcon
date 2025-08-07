// src/components/clients/ClientDrawerContent.jsx
import React, { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import ClientDetailPanel from './ClientDetailPanel';
import ClientSidebarPanel from './ClientSidebarPanel';

const ClientDrawerContent = ({ data, onClose, onClientDeleted }) => {
  const [clientData, setClientData] = useState(data);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({ active: 0, last30: 0, total: 0, avgFee: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ MOVE THIS FUNCTION HERE
  const handleClientDeleted = () => {
    if (onClientDeleted) onClientDeleted();
    if (onClose) onClose();
  };

  // Extract clientId from data prop
  const clientId = data?.id;
  const parsedClientId = clientId ? parseInt(clientId, 10) : null;
  const isNewClient = !parsedClientId || isNaN(parsedClientId);

  const fetchStats = async () => {
  setLoading(true);
  setError(null);

  try {
    let clientIdsToFetch = [parsedClientId];

    // Step 1: If AMC, also grab all child clients
    if (clientData.client_type === 'AMC') {
      const { data: childClients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('parent_id', parsedClientId);

      if (clientError) throw clientError;

      const childIds = childClients.map((c) => c.id);
      clientIdsToFetch = childIds; // exclude AMC itself, just children
    }

    // Step 2: Fetch orders for all collected client_ids
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .in('client_id', clientIdsToFetch);

    if (fetchError) throw fetchError;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeOrders = orders.filter(order =>
      ['In Progress', 'Needs Review'].includes(order.status)).length;

    const last30Orders = orders.filter(order =>
      new Date(order.created_at) >= thirtyDaysAgo).length;

    const totalOrders = orders.length;

    const avgFee = totalOrders > 0
      ? orders.reduce((sum, order) => sum + (order.base_fee || 0), 0) / totalOrders
      : 0;

    setStats({
      active: activeOrders,
      last30: last30Orders,
      total: totalOrders,
      avgFee
    });
  } catch (err) {
    console.error('Stats fetch failed:', err);
    setError('Failed to load stats—check connection or try refresh.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (isNewClient) {
      setStats({ active: 0, last30: 0, total: 0, avgFee: 0 });
      setLoading(false);
    } else {
      fetchStats();
    }
  }, [parsedClientId, isNewClient]);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!isNewClient) {
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `client_id=eq.${parsedClientId}`
          },
          (payload) => {
            console.log('Order change detected:', payload);
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [parsedClientId, isNewClient]);

  const handleSave = async (updatedData) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update(updatedData)
        .eq('id', parsedClientId);

      if (error) throw error;
      setClientData(updatedData);
      setIsEditing(false);
    } catch (err) {
      console.error('Update failed:', err);
      // Handle error, e.g., toast
    }
  };

  const chartData = {
    labels: ['Active', 'Last 30 Days', 'Total'],
    datasets: [{
      data: [stats.active, stats.last30, stats.total],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      hoverOffset: 4
    }]
  };

  const hasData = stats.active > 0 || stats.last30 > 0 || stats.total > 0;

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex h-full">
      <ClientDetailPanel
  clientData={clientData}
  isEditing={isEditing}
  setIsEditing={setIsEditing}
  onSave={handleSave}
  onClientDeleted={handleClientDeleted}
/>
      <ClientSidebarPanel 
  stats={stats} 
  hasData={hasData} 
  chartData={chartData} 
  isNewClient={isNewClient} 
  onRefresh={fetchStats}
  clientType={clientData?.client_type}
/>
    </div>
  );
};

export default ClientDrawerContent;

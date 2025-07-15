import { useState, useEffect } from 'react';
import supabase from '@/lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto'; // Registers Chart.js components

const ClientDrawerContent = ({ data }) => {
  const [stats, setStats] = useState({ active: 0, last30: 0, total: 0, avgFee: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract clientId from data prop (assuming TableDrawer passes { data } where data is the client object)
  const clientId = data?.id;
  // Parse to number for safety
  const parsedClientId = clientId ? parseInt(clientId, 10) : null;
  const isNewClient = !parsedClientId || isNaN(parsedClientId);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', parsedClientId);

      if (fetchError) throw fetchError;

      // Compute stats in JS
      const activeOrders = orders.filter(order => ['In Progress', 'Needs Review'].includes(order.status)).length;
      const last30Orders = orders.filter(order => new Date(order.created_at) >= thirtyDaysAgo).length;
      const totalOrders = orders.length;
      const avgFee = totalOrders > 0 
        ? orders.reduce((sum, order) => sum + (order.base_fee || 0), 0) / totalOrders 
        : 0;

      // More logs for debug
      console.log('Data prop:', data);
      console.log('Extracted Client ID:', clientId);
      console.log('Parsed Client ID:', parsedClientId, typeof parsedClientId);
      console.log('Thirty Days Ago:', thirtyDaysAgo.toISOString());
      console.log('Fetched Orders:', orders);
      console.log('Computed Stats:', { active: activeOrders, last30: last30Orders, total: totalOrders, avgFee });

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
      // For new clients, skip fetch and set defaults
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
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'orders',
            filter: `client_id=eq.${parsedClientId}`
          },
          (payload) => {
            console.log('Order change detected:', payload);
            fetchStats(); // Re-fetch stats on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [parsedClientId, isNewClient]);

  const chartData = {
    labels: ['Active', 'Last 30 Days', 'Total'],
    datasets: [{
      data: [stats.active, stats.last30, stats.total],
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      hoverOffset: 4
    }]
  };

  const hasData = stats.active > 0 || stats.last30 > 0 || stats.total > 0;

  if (loading) return <div className="p-4 text-center">Loading stats...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-4">
      {/* Existing content */}
      {/* ... */}

      <h3 className="mt-4 text-lg font-semibold">Client Stats</h3>
      <div className="mt-2 max-h-64 overflow-hidden">
        {isNewClient ? (
          <p className="text-center text-gray-500">New Client - Stats will appear after creation and orders are added.</p>
        ) : hasData ? (
          <Doughnut 
            data={chartData} 
            options={{ 
              responsive: true, 
              cutout: '60%', 
              plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } } 
            }} 
            height={150} 
          />
        ) : (
          <p className="text-center text-gray-500">No orders yet—time to get some action.</p>
        )}
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        <li>Avg Fee: ${stats.avgFee.toFixed(2)}</li>
      </ul>

      {/* Manual refresh button for testing */}
      {!isNewClient && (
        <button 
          onClick={fetchStats} 
          className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
        >
          Refresh Stats
        </button>
      )}
    </div>
  );
};

export default ClientDrawerContent;

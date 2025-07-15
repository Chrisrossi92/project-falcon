import { useState, useEffect } from 'react';
import  supabase  from '@/lib/supabaseClient';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto'; // Registers Chart.js components

const ClientDrawerContent = ({ clientId }) => {
  const [stats, setStats] = useState({ active: 0, last30: 0, total: 0, avgFee: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().slice(0, 10); // UTC date string

        // Temp: Broaden for debug; change back later
        const testOldDate = '2020-01-01';

        const [activeRes, last30Res, totalRes, avgFeeRes] = await Promise.all([
          supabase.from('orders').select('count(*)').eq('client_id', clientId).in('status', ['In Progress', 'Needs Review']),
          supabase.from('orders').select('count(*)').eq('client_id', clientId).gte('created_at', testOldDate), // Temp broaden
          supabase.from('orders').select('count(*)').eq('client_id', clientId),
          supabase.from('orders').select('avg(base_fee)').eq('client_id', clientId)
        ]);

        // More logs
        console.log('Client ID:', clientId);
        console.log('Thirty Days Ago ISO:', thirtyDaysAgoISO);
        console.log('Active Res:', activeRes);
        console.log('Last30 Res:', last30Res);
        console.log('Total Res:', totalRes);
        console.log('AvgFee Res:', avgFeeRes);

        setStats({
          active: activeRes.data?.[0]?.count || 0,
          last30: last30Res.data?.[0]?.count || 0,
          total: totalRes.data?.[0]?.count || 0,
          avgFee: avgFeeRes.data?.[0]?.avg || 0
        });
      } catch (err) {
        console.error('Stats fetch failed:', err);
        setError('Failed to load stats—check connection or try refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [clientId]);

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
        {hasData ? (
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
    </div>
  );
};

export default ClientDrawerContent;

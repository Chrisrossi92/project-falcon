import React, { useEffect, useState } from 'react';
import ActivityLogCard from './ActivityLogCard';
import supabase from '@/lib/supabaseClient';

export default function ActivityLogPanel({ orderId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('activity_log')
          .select(`
            id,
            user_id,
            action,
            created_at,
            role,
            context,
            users ( name )
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching activity log:', error.message);
        } else {
          const enriched = data.map((entry) => ({
            ...entry,
            user: { name: entry.users?.name || 'Unknown' },
          }));
          setActivities(enriched);
        }
      } catch (err) {
        console.error('Unexpected error fetching activity log:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [orderId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading activity log...</div>;
  }

  return (
    <div className="space-y-2">
      {activities.length > 0 ? (
        activities.map((activity) => (
          <ActivityLogCard key={activity.id} activity={activity} />
        ))
      ) : (
        <div className="text-sm text-gray-400">No activity logged yet.</div>
      )}
    </div>
  );
}





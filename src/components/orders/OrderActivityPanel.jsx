import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';

export default function OrderActivityPanel({ orderId }) {
  const { user } = useSession(); // expects user.id and (optionally) user.role
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');

  // Fetch existing activity
  useEffect(() => {
    if (!orderId) return;
    const numericOrderId = Number(orderId);

    const fetchActivity = async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, order_id, user_id, role, action, visible_to, context, created_at')
        .eq('order_id', numericOrderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching activity log:', error.message);
        return;
      }
      setEntries(data || []);
    };

    fetchActivity();

    // Realtime: watch for new inserts for this order
    const channel = supabase
      .channel(`activity_log_order_${numericOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `order_id=eq.${numericOrderId}`,
        },
        (payload) => {
          setEntries((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Send a comment
  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const payload = {
      order_id: Number(orderId),
      user_id: user?.id ?? null,
      role: user?.role ?? 'user',
      action: 'comment',
      visible_to: ['admin', 'appraiser'], // adjust if/when you add permissions
      context: { message: trimmed },
    };

    const { error } = await supabase.from('activity_log').insert(payload);

    if (error) {
      console.error('Failed to add comment:', error.message);
      return;
    }

    // We rely on realtime to append the row; clear input now
    setInput('');
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-xl p-4 bg-gray-50 shadow-sm">
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {entries.map((entry) => {
          // Chat bubbles for comments
          if (entry.action === 'comment') {
            const isSelf = entry.user_id === user?.id;
            return (
              <div
                key={entry.id}
                className={clsx(
                  'max-w-[70%] px-3 py-2 rounded-md',
                  isSelf ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-200 mr-auto text-left'
                )}
              >
                {entry?.context?.message || '[no message]'}
                <div className="text-[10px] mt-1 text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            );
          }

          // Centered system timeline rows (order created, status changed, assigned, etc.)
          if (entry.action === 'system') {
            return (
              <div key={entry.id} className="text-center text-xs text-gray-600 py-2">
                • {entry?.context?.message || '[system event]'}
                <div className="text-[10px] mt-1 text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            );
          }

          // Fallback (unknown action)
          return (
            <div key={entry.id} className="text-center text-xs text-gray-500 py-2">
              • {entry?.context?.message || '[event]'}
              <div className="text-[10px] mt-1 text-gray-400">
                {new Date(entry.created_at).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center">
        <input
          type="text"
          className="flex-1 border rounded-l px-3 py-2 text-sm"
          placeholder="Add a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-r text-sm"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </div>
  );
}





// src/components/orders/OrderActivityPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { addOrderComment } from '@/lib/services/ordersService';

export default function OrderActivityPanel({ orderId, currentUser }) {
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const canPost = !!currentUser?.id && !!orderId;

  async function fetchActivity() {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, role, created_at, user_id, context, prev_status, new_status, message')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchActivity error:', error.message);
      return;
    }

    // normalize: prefer message, fall back to context.message
    setRows((data ?? []).map(r => ({ ...r, message: r.message ?? r?.context?.message ?? null })));
  }

  useEffect(() => {
    if (!orderId) return;

    fetchActivity();

    // realtime subscription
    const channel = supabase
      .channel(`order-activity-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log', filter: `order_id=eq.${orderId}` },
        () => fetchActivity()
      )
      .subscribe();

    return () => {
      try {
        if (typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(channel);
        } else if (typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      } catch (e) {
        console.warn('teardown channel failed:', e?.message);
      }
    };
  }, [orderId]);

  async function handlePost(e) {
    e?.preventDefault?.();
    const val = text.trim();
    if (!val || !orderId) return;
    try {
      await addOrderComment({ orderId, text: val, user: currentUser });
      setText('');
      fetchActivity(); // realtime should also update; this is for snappiness
    } catch (e2) {
      console.error('addOrderComment failed:', e2?.message);
    }
  }

  const list = useMemo(() => {
    return (rows ?? []).map((r) => {
      const a = (r.action || '').toLowerCase();
      let label = 'Event';
      if (a === 'comment') label = 'Comment';
      else if (a === 'note') label = 'Note';
      else if (a === 'assignment') label = 'Assigned';
      else if (a === 'status_change') label = 'Status changed';

      let body = r.message || '';
      if (a === 'status_change' && (r.prev_status || r.new_status)) {
        const prev = r.prev_status || '—';
        const next = r.new_status || '—';
        body = body ? `${body} (${prev} → ${next})` : `(${prev} → ${next})`;
      }

      return {
        id: r.id,
        created_at: r.created_at,
        label,
        body,
      };
    });
  }, [rows]);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-muted-foreground">
        {list.length === 0 ? 'No activity yet.' : null}
      </div>

      <div className="space-y-2 max-h-80 overflow-auto border rounded p-2 bg-white">
        {list.map((item) => (
          <div key={item.id} className="text-sm border-b pb-2 last:border-b-0">
            <div className="text-[11px] opacity-60">
              {new Date(item.created_at).toLocaleString()}
            </div>
            <div className="font-medium">{item.label}</div>
            <div>{item.body || <i>(no text)</i>}</div>
          </div>
        ))}
      </div>

      {canPost && (
        <form onSubmit={handlePost} className="flex gap-2">
          <input
            className="flex-1 border rounded px-2 py-1"
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="border rounded px-3 py-1">
            Post
          </button>
        </form>
      )}
    </div>
  );
}















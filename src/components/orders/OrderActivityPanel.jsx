// src/components/orders/OrderActivityPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import { addOrderComment } from '@/lib/services/ordersService';

export default function OrderActivityPanel({ orderId, currentUser }) {
  const [rows, setRows] = useState([]);
  const [text, setText] = useState('');
  const canPost = !!currentUser?.id && !!orderId;

  // Fetch activity
  async function fetchActivity() {
    const { data, error } = await supabase
      .from('activity_log')
      .select('id, action, role, created_at, user_id, context')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('fetchActivity error:', error.message);
      return;
    }
    setRows(data ?? []);
  }

  useEffect(() => {
    if (!orderId) return;
    fetchActivity();

    // Real-time updates
    const channel = supabase
      .channel(`order-activity-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log', filter: `order_id=eq.${orderId}` },
        () => fetchActivity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function handlePost() {
    const val = text?.trim();
    if (!val) return;
    try {
      await addOrderComment({ orderId, text: val, user: currentUser });
      setText('');
      // optimistic refresh; realtime will also push it
      fetchActivity();
    } catch (e) {
      console.error('addOrderComment failed:', e?.message);
    }
  }

  const list = useMemo(
    () =>
      rows.map((r) => {
        const msg = r?.context?.message || '';
        const label =
          r.action === 'comment'
            ? `Comment`
            : r.action === 'order_created'
            ? 'Order created'
            : r.action === 'status_changed'
            ? 'Status changed'
            : r.action === 'assigned'
            ? 'Assigned'
            : r.action;
        return { ...r, label, msg };
      }),
    [rows]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-muted-foreground">
        {list.length === 0 ? 'No activity yet.' : null}
      </div>

      <div className="flex flex-col gap-2">
        {list.map((r) => (
          <div key={r.id} className="rounded-md border p-2">
            <div className="text-xs opacity-70">
              {r.label} · {new Date(r.created_at).toLocaleString()}
            </div>
            <div className="text-sm">{r.msg || <i>(no text)</i>}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2"
          disabled={!canPost}
        />
        <button
          onClick={handlePost}
          className="rounded-md border px-3 py-2"
          disabled={!canPost || !text.trim()}
        >
          Post
        </button>
      </div>
    </div>
  );
}














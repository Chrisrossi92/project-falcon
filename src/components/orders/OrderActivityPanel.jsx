// src/components/orders/OrderActivityPanel.jsx
import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import  supabase  from '../../lib/supabaseClient';

// ---- Data access ----
async function fetchActivity(orderId) {
  const { data, error } = await supabase.rpc('get_order_activity_flexible_v3', {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data ?? [];
}

async function postComment({ orderId, user, text }) {
  const userId = user?.id ?? null;
  const userName =
    user?.user_metadata?.full_name || user?.email || user?.name || '';

  // Prefer RPC if you have it; otherwise fallback to direct insert
  const tryRpc = async () => {
    const { error } = await supabase.rpc('log_order_activity', {
      p_order_id: orderId,
      p_user_id: userId,
      p_event: 'comment',
      p_details: { text, user_name: userName },
    });
    if (error) throw error;
  };

  const tryDirectInsert = async () => {
    const { error } = await supabase.from('activity_log').insert({
      order_id: orderId,
      user_id: userId,
      event: 'comment',
      details: { text, user_name: userName },
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  };

  try {
    await tryRpc();
  } catch (e) {
    if (String(e?.code) === '404' || String(e?.code) === '42883') {
      await tryDirectInsert();
    } else {
      throw e;
    }
  }
}

// ---- Helpers ----
function toLocalTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function safeParseJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
function humanizeEvent(row) {
  const evt = String(row?.event || '').toLowerCase();
  const details = (row?.details && typeof row.details === 'object')
    ? row.details
    : (typeof row?.details === 'string' ? safeParseJson(row.details) : {});
  const who = row?.user_name || details?.user_name || row?.user_id || '—';
  const tsText = toLocalTs(row?.created_at);

  let title = 'Activity';
  let body = '';

  switch (evt) {
    case 'comment':
      title = `${who} commented`;
      body = (details?.text || '').trim() || '(no text)';
      break;
    case 'order_created':
    case 'created':
      title = `${who} created the order`;
      break;
    case 'assigned':
    case 'assigned_to_appraiser':
      title = `Assigned to ${details?.appraiser_name || details?.appraiser_id || '—'}`;
      break;
    case 'status':
    case 'status_changed':
      title = `Status → ${details?.to || details?.status || '—'}`;
      break;
    default:
      title = (evt && evt.replace(/_/g, ' ')) || 'Activity';
      if (details && Object.keys(details).length) body = JSON.stringify(details);
  }

  return { key: row?.id || `${row?.order_id || 'row'}-${tsText}-${title}`, title, body, tsText };
}

// ---- Component ----
export default function OrderActivityPanel({ orderId, className = '', pollIntervalMs = 0 }) {
  // Read current user directly from Supabase (no UserContext hook needed)
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data?.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canPost = useMemo(() => Boolean(orderId && user?.id), [orderId, user?.id]);

  const load = useCallback(async () => {
    if (!orderId) return;
    setError('');
    setLoading(true);
    try {
      const data = await fetchActivity(orderId);
      setItems(data);
    } catch (e) {
      console.error('Activity fetch failed', e);
      setError(e?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!pollIntervalMs) return;
    const id = setInterval(load, pollIntervalMs);
    return () => clearInterval(id);
  }, [load, pollIntervalMs]);

  const onPost = async () => {
    const text = comment.trim();
    if (!text || !orderId) return;
    setPosting(true);
    setError('');
    try {
      await postComment({ orderId, user, text });
      setComment('');
      await load();
    } catch (e) {
      console.error('Activity post failed', e);
      setError(e?.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Activity</h3>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button onClick={load} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-auto border rounded p-2 bg-white">
        {loading && <div className="text-sm opacity-70">Loading…</div>}
        {!loading && items.length === 0 && <div className="text-sm opacity-70">No activity yet.</div>}
        {!loading && items.map((row) => {
          const h = humanizeEvent(row);
          return (
            <div key={h.key} className="border rounded p-2 text-sm">
              <div className="font-medium">{h.title}</div>
              {!!h.body && <div className="mt-1 whitespace-pre-wrap break-words">{h.body}</div>}
              <div className="opacity-70 mt-1">{h.tsText}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={canPost ? 'Add a comment…' : 'Sign in to comment'}
          disabled={!canPost || posting}
          className="flex-1 border rounded px-2 py-2 text-sm disabled:opacity-60"
        />
        <button
          onClick={onPost}
          disabled={!canPost || posting || !comment.trim()}
          className="px-3 py-2 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}













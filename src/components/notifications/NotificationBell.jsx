// src/components/notifications/NotificationBell.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markAsRead,
  markAllRead,
  unreadCount,
  getNotificationPrefs,
  isDndActive,
  isSnoozed,
  setSnooze,
  clearSnooze,
} from '@/features/notifications';
import { useSession } from '@/lib/hooks/useSession';

function iconFor(action, priority) {
  if (priority === 'critical') return '🚨';
  switch (action) {
    case 'order_assigned':      return '📌';
    case 'status_changed':      return '🔄';
    case 'site_visit_set':      return '📍';
    case 'review_due_updated':  return '📝';
    case 'client_due_updated':  return '📅';
    case 'due_dates_updated':   return '⏱️';
    case 'message_received':
    case 'mention':             return '💬';
    default:                    return '🔔';
  }
}

function labelFor(row) {
  const idPart = row.order_id ? String(row.order_id).slice(0, 8) + '…' : '';
  const when = row?.payload?.when
    ? new Date(row.payload.when).toLocaleString()
    : row?.payload?.review_due
    ? new Date(row.payload.review_due).toLocaleString()
    : row?.payload?.final_due
    ? new Date(row.payload.final_due).toLocaleString()
    : null;

  switch (row.action) {
    case 'order_assigned':      return `Assigned • ${idPart}`;
    case 'status_changed':      return `Status updated • ${idPart}`;
    case 'site_visit_set':      return when ? `Site visit • ${when}` : `Site visit set • ${idPart}`;
    case 'review_due_updated':  return when ? `Review due • ${when}` : `Review due updated • ${idPart}`;
    case 'client_due_updated':  return when ? `Client due • ${when}` : `Client due updated • ${idPart}`;
    case 'due_dates_updated':   return `Due dates updated • ${idPart}`;
    case 'message_received':    return `New message • ${idPart}`;
    case 'mention':             return `You were mentioned • ${idPart}`;
    default:                    return `Update • ${idPart}`;
  }
}

function categoryOf(action) {
  if (!action) return 'other';
  if (['site_visit_set','review_due_updated','client_due_updated','due_dates_updated'].includes(action)) return 'dates';
  if (action === 'status_changed') return 'status';
  if (action === 'order_assigned') return 'assignments';
  if (['message_received','mention'].includes(action)) return 'messages';
  return 'other';
}

const FILTERS = ['all','dates','status','assignments','messages'];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);

  const [prefs, setPrefs] = useState([]);
  const [badgeSuppressed, setBadgeSuppressed] = useState(false);
  const [snoozeUntilLabel, setSnoozeUntilLabel] = useState('');

  const navigate = useNavigate();
  const { user } = useSession?.() || { user: null };
  const userId = user?.id || null;

  async function load() {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([fetchNotifications(50), unreadCount()]);
      setItems(list);
      setUnread(count);
      setErr(null);
    } catch (e) {
      console.error('notifications load error', e);
      setErr(e?.message || 'Failed to load');
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrefs() {
    if (!userId) return;
    try {
      const p = await getNotificationPrefs(userId);
      setPrefs(p);
      // compute suppression
      const dnd = isDndActive(p);
      const snoozed = isSnoozed(p);
      setBadgeSuppressed(dnd || snoozed);

      // label snooze if present
      const snoozeEntry = p.find(e => e.type === 'snooze' && e.channel === 'in_app' && e.enabled && e.meta?.until);
      if (snoozeEntry) {
        const until = new Date(snoozeEntry.meta.until);
        if (!isNaN(until.getTime())) {
          setSnoozeUntilLabel(until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setSnoozeUntilLabel('');
        }
      } else {
        setSnoozeUntilLabel('');
      }
    } catch (e) {
      console.error('load prefs error', e);
    }
  }

  useEffect(() => {
    load();
    loadPrefs();
  }, [userId]);

  // Recompute suppression every 60s so DND/Snooze badges update without reload
  useEffect(() => {
    const id = setInterval(() => {
      if (prefs.length) {
        const dnd = isDndActive(prefs);
        const snoozed = isSnoozed(prefs);
        setBadgeSuppressed(dnd || snoozed);
      }
    }, 60000);
    return () => clearInterval(id);
  }, [prefs]);

  async function onToggle() {
    setOpen(v => !v);
    if (!open && unread > 0) {
      const unreadIds = items.filter(i => !i.is_read).map(i => i.id);
      try {
        await markAsRead(unreadIds);
        setItems(prev => prev.map(p => ({ ...p, is_read: true })));
        setUnread(0);
      } catch (e) {
        console.error('markAsRead failed', e);
      }
    }
  }

  async function onSnooze() {
    if (!userId) return;
    try {
      const untilIso = await setSnooze(userId, 1);
      const until = new Date(untilIso);
      setSnoozeUntilLabel(until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      await loadPrefs();
    } catch (e) {
      console.error(e);
      alert('Failed to snooze.');
    }
  }

  async function onCancelSnooze() {
    if (!userId) return;
    try {
      await clearSnooze(userId);
      setSnoozeUntilLabel('');
      await loadPrefs();
    } catch (e) {
      console.error(e);
    }
  }

  function onRowClick(n) {
    if (n.link_path) navigate(n.link_path);
    else if (n.order_id) navigate(`/orders/${n.order_id}`);
    setOpen(false);
  }

  // “Mine only”: actor or assignee equals me (fallback true if payload missing)
  const isMine = (n) => {
    const by = n?.payload?.by;
    const assignee = n?.payload?.assignee_id;
    if (!userId) return true;
    if (!by && !assignee) return true;
    return (by === userId) || (assignee === userId);
  };

  const filtered = useMemo(() => {
    const categoryOf = (action) => {
      if (!action) return 'other';
      if (['site_visit_set','review_due_updated','client_due_updated','due_dates_updated'].includes(action)) return 'dates';
      if (action === 'status_changed') return 'status';
      if (action === 'order_assigned') return 'assignments';
      if (['message_received','mention'].includes(action)) return 'messages';
      return 'other';
    };
    return items.filter(n => {
      const cat = categoryOf(n.action);
      const catOk = (filter === 'all') || (filter === cat);
      const mineOk = !mineOnly || isMine(n);
      return catOk && mineOk;
    });
  }, [items, filter, mineOnly, userId]);

  const showBadge = !badgeSuppressed && unread > 0;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative rounded-full p-2 hover:bg-gray-100"
        aria-label="Notifications"
        title={badgeSuppressed ? 'Notifications muted by DND/Snooze' : 'Notifications'}
      >
        <span aria-hidden>🔔</span>
        {showBadge && (
          <span className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 bg-red-600 text-white rounded">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {!showBadge && unread > 0 && (
          // subtle dot when suppressed
          <span className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5 bg-gray-300 text-gray-300 rounded">
            •
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[26rem] bg-white border rounded-xl shadow-lg p-2 z-50">
          {/* Header */}
          <div className="px-2 pt-1 pb-2 text-sm font-medium flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              {/* DND/Snooze indicators */}
              {badgeSuppressed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {snoozeUntilLabel ? `Snoozed until ${snoozeUntilLabel}` : 'DND active'}
                </span>
              )}
              <button className="text-xs text-gray-500 hover:underline" onClick={() => load()}>Refresh</button>
              <span className="text-gray-300">•</span>
              <button
                className="text-xs text-gray-500 hover:underline"
                onClick={async () => {
                  try {
                    await markAllRead();
                    setItems(prev => prev.map(p => ({ ...p, is_read: true })));
                    setUnread(0);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Mark all read
              </button>
              <span className="text-gray-300">•</span>
              {snoozeUntilLabel ? (
                <button className="text-xs text-gray-500 hover:underline" onClick={onCancelSnooze}>
                  Cancel snooze
                </button>
              ) : (
                <button className="text-xs text-gray-500 hover:underline" onClick={onSnooze}>
                  Snooze 1h
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-2 pb-2 flex items-center justify-between">
            <div className="flex gap-1">
              {['all','dates','status','assignments','messages'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={[
                    "text-xs px-2 py-1 rounded-full border",
                    filter === f ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"
                  ].join(' ')}
                >
                  {f === 'all' ? 'All' :
                   f === 'dates' ? 'Dates' :
                   f === 'status' ? 'Status' :
                   f === 'assignments' ? 'Assignments' :
                   f === 'messages' ? 'Messages' : f}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
              Mine only
            </label>
          </div>

          {/* Body */}
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Loading…</div>
          ) : err ? (
            <div className="p-3 text-sm text-red-600">Failed to load</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No notifications</div>
          ) : (
            <ul className="max-h-96 overflow-auto divide-y">
              {filtered.map(n => (
                <li
                  key={n.id}
                  className="p-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => onRowClick(n)}
                >
                  <span className="text-lg" title={n.priority || ''}>
                    {iconFor(n.action, n.priority)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{labelFor(n)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!n.is_read && <span className="text-xs text-blue-500">●</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}









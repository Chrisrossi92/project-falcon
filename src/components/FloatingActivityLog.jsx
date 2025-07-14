// components/FloatingActivityLog.jsx

import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const FloatingActivityLog = () => {
  const { user } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;

      const { data, error } = await supabase
  .from('activity_log')
  .select('*')
  .order('created_at', { ascending: false })  // ✅ change from 'timestamp'
  .limit(20);

      if (error) {
        console.error('Error fetching activity log:', error);
      } else {
        setLogs(data);
      }

      setLoading(false);
    };

    fetchLogs();
  }, [user]);

  if (!open) return null;

  return (
    <Draggable handle=".drag-handle">
      <div className="fixed bottom-4 left-4 w-80 bg-white rounded-lg shadow-xl border p-3 z-[9999]">
        <div className="flex justify-between items-center mb-2 drag-handle cursor-move">
          <h3 className="text-sm font-semibold text-gray-800">Activity Log</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-700 text-xs"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-gray-500">No recent activity.</div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {logs.map((log) => (
              <li key={log.id} className="text-sm text-gray-700">
                <span className="font-medium">{log.user_name || 'User'}</span>{' '}
                {log.action}{' '}
                <span className="text-gray-500 text-xs">
                  on {formatDate(log.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Draggable>
  );
};

export default FloatingActivityLog;



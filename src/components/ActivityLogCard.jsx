import React from 'react';
import { format } from 'date-fns';

export default function ActivityLogCard({ activity }) {
  const { user, action, created_at } = activity;

  return (
    <div className="rounded border p-3 shadow-sm bg-white">
      <div className="text-sm text-gray-800 font-medium">
        {user?.name || 'Unknown User'}
      </div>
      <div className="text-sm text-gray-600">{action}</div>
      <div className="text-xs text-gray-400 mt-1">
        {created_at ? format(new Date(created_at), 'PPpp') : 'Unknown time'}
      </div>
    </div>
  );
}


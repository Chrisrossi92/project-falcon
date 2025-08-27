// src/components/activity/ActivityNoteForm.jsx
import React, { useState } from "react";
import { logNote } from "@/lib/services/activityService";

export default function ActivityNoteForm({ orderId, onSaved }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (!msg.trim()) return;
    try {
      setBusy(true); setErr(null);
      await logNote(orderId, msg.trim());
      setMsg("");
      onSaved?.();
    } catch (e2) {
      setErr(e2?.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 border-t pt-3">
      <div className="text-xs text-gray-600 mb-1">Add a note</div>
      <div className="flex items-start gap-2">
        <textarea
          className="flex-1 border rounded px-2 py-1 text-sm"
          rows={2}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Type a quick update for the activity log…"
        />
        <button
          type="submit"
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !msg.trim()}
        >
          Post
        </button>
      </div>
      {err ? <div className="text-xs text-red-600 mt-1">{err}</div> : null}
    </form>
  );
}
